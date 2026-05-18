# Self-Hosting Migration Guide

This guide walks you through exporting this app from Lovable and running it against your own Supabase project.

---

## 1. Prerequisites

Install locally:

- Node.js 20+ and `bun` (or `npm`/`pnpm`)
- Supabase CLI: `npm i -g supabase`
- `psql` (Postgres client)
- (Optional, for Cloudflare deploy) `wrangler`: `npm i -g wrangler`

---

## 2. Export the code from Lovable

1. In Lovable: **GitHub → Connect to GitHub** (or **Export to GitHub**).
2. Clone locally:
   ```bash
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   bun install
   ```

---

## 3. Create your own Supabase project

1. Go to https://supabase.com → **New project**.
2. Choose a region close to your users. Save the DB password — you'll need it.
3. From **Project Settings → API**, copy:
   - `Project URL` → e.g. `https://abcd1234.supabase.co`
   - `anon` public key
   - `service_role` key (server-only, never ship to client)
4. From **Project Settings → General**, copy the project ref (the `abcd1234` part).

---

## 4. Recreate the database schema

You have two options. **Option B is recommended** because the migrations are version-controlled in this repo.

### Option A — Dump from the original Supabase project

Only possible if you have the DB password of the source project.

```bash
# Dump schema (tables, RLS, functions, triggers, enums)
supabase db dump \
  --db-url "postgresql://postgres:[SOURCE_PASSWORD]@db.tcjmniyqjdmpeuykyowm.supabase.co:5432/postgres" \
  --schema public \
  --file schema.sql

# Dump data (optional — only if you want existing rows)
supabase db dump \
  --db-url "postgresql://postgres:[SOURCE_PASSWORD]@db.tcjmniyqjdmpeuykyowm.supabase.co:5432/postgres" \
  --schema public --data-only \
  --file data.sql

# Apply to your new project
psql "postgresql://postgres:[NEW_PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres" -f schema.sql
psql "postgresql://postgres:[NEW_PASSWORD]@db.[NEW_REF].supabase.co:5432/postgres" -f data.sql
```

### Option B — Apply migrations from this repo (recommended)

Every schema change made in Lovable is stored as a migration in `supabase/migrations/`.

```bash
# Link the repo to YOUR new Supabase project
supabase login
supabase link --project-ref [NEW_REF]

# Push every migration in order
supabase db push
```

This recreates: enums (`app_role`, `booking_status`, `payment_status`, `subscription_status`), all public tables, RLS policies, security-definer functions (e.g. `has_role`, `handle_new_user`, `notify_provider_new_booking`), and triggers.

---

## 5. Recreate Storage buckets

This app uses one **public** bucket: `provider-gallery`.

In Supabase → **Storage → New bucket**:

- Name: `provider-gallery`
- Public: **on**

Storage RLS policies are included in the migrations (Option B) and apply automatically. If you used Option A, re-create them via SQL editor:

```sql
-- Anyone can read
create policy "Public read provider-gallery"
on storage.objects for select
using (bucket_id = 'provider-gallery');

-- Owners can upload to their own folder: userId/providerId/*
create policy "Owners upload to provider-gallery"
on storage.objects for insert
with check (bucket_id = 'provider-gallery' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Owners delete from provider-gallery"
on storage.objects for delete
using (bucket_id = 'provider-gallery' and auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 6. Configure Authentication

In Supabase → **Authentication → Providers**:

1. **Email**: enabled by default. Decide whether to require email confirmation.
2. **Google** (optional but used by the app): enable, paste your Google OAuth Client ID + Secret.
3. **Authentication → URL Configuration**:
   - Site URL: your production URL (e.g. `https://yourapp.com`)
   - Additional redirect URLs:
     - `http://localhost:5173`
     - `http://localhost:5173/auth/reset-password`
     - `https://yourapp.com/auth/reset-password`
     - any preview URLs

---

## 7. Seed your first admin

After signing up your own user once via the app:

```sql
-- Find your user id
select id, email from auth.users where email = 'you@example.com';

-- Promote to admin
insert into public.user_roles (user_id, role)
values ('<your-auth-user-id>', 'admin')
on conflict do nothing;
```

You can now access `/admin`.

---

## 8. Edge Functions (if any exist)

Check `supabase/functions/`:

```bash
ls supabase/functions
```

For each function, set its required secrets in Supabase → **Project Settings → Edge Functions → Secrets**, then deploy:

```bash
supabase functions deploy --project-ref [NEW_REF]
# or one at a time
supabase functions deploy <function-name> --project-ref [NEW_REF]
```

> **Important — `LOVABLE_API_KEY` won't work off-platform.**
> If any function uses `LOVABLE_API_KEY` (the Lovable AI Gateway), replace it with your own provider key (e.g. `OPENAI_API_KEY`, `GEMINI_API_KEY`) and update the function code to call that provider directly. Set the new key as an Edge Function secret.

---

## 9. Configure environment variables in the app

Create `.env` in the project root:

```env
# Client (browser-visible, safe)
VITE_SUPABASE_URL=https://[NEW_REF].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=[NEW_REF]

# Server (used by SSR / server functions / auth middleware)
SUPABASE_URL=https://[NEW_REF].supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Rules:

- **Never** rename `SUPABASE_SERVICE_ROLE_KEY` to a `VITE_*` variable — it would leak to the browser.
- The `VITE_*` vars are read by `src/integrations/supabase/client.ts`.
- The unprefixed vars are read by `src/integrations/supabase/auth-middleware.ts` and `client.server.ts`.

Update `supabase/config.toml`:

```toml
project_id = "[NEW_REF]"
```

---

## 10. Regenerate Supabase types

So `src/integrations/supabase/types.ts` matches your DB:

```bash
supabase gen types typescript --project-id [NEW_REF] > src/integrations/supabase/types.ts
```

Re-run this any time you change the schema.

---

## 11. Run locally

```bash
bun run dev
```

Open http://localhost:5173.

Quick checks:

- Sign up with a new email → confirms a row in `auth.users` and `public.profiles`
- Browse `/explore` → providers load
- Visit `/admin` after promoting yourself

---

## 12. Deploy

This app targets **Cloudflare Workers** out of the box (`wrangler.jsonc`, `vite.config.ts`).

### Cloudflare (default)

```bash
wrangler login
wrangler deploy
```

Set Worker secrets (do not commit them):

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_PUBLISHABLE_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

The `VITE_*` vars are inlined at build time, so set them in your build environment before `wrangler deploy` (e.g. in your CI):

```bash
export VITE_SUPABASE_URL=...
export VITE_SUPABASE_PUBLISHABLE_KEY=...
export VITE_SUPABASE_PROJECT_ID=...
```

### Vercel / Netlify / Node host (alternative)

TanStack Start supports multiple targets. Swap the build target in `vite.config.ts` to the Node/Vercel preset, then deploy as usual. Set the same env vars in the host's dashboard.

---

## 13. Post-migration checklist

- [ ] All migrations applied (`supabase db push` succeeded)
- [ ] `provider-gallery` bucket exists and is public
- [ ] Email + Google auth providers enabled, redirect URLs set
- [ ] At least one admin row in `public.user_roles`
- [ ] Edge functions deployed and their secrets set
- [ ] `.env` populated locally; production secrets set in your host
- [ ] `types.ts` regenerated
- [ ] Sign-up, login, password reset, booking, and admin pages all work end-to-end

---

## 14. Common gotchas

- **`window is not defined` during SSR** — usually means a browser-only module is imported at module scope. Move the import inside a client-only function.
- **401 from server functions** — the route loader fired before the Supabase session hydrated. Place protected routes under `_authenticated/` or guard with `beforeLoad`.
- **Realtime not firing** — enable replication on the table: Supabase → **Database → Replication** → add table to `supabase_realtime` publication.
- **Storage uploads fail with 403** — the storage RLS policies above expect uploads at path `userId/providerId/...`. Make sure your upload paths match.
- **Trigger `handle_new_user` not firing** — re-run the migration that creates it, and confirm it's attached to `auth.users` (`select * from pg_trigger where tgname = 'on_auth_user_created'`).

---

You're done. Keep `supabase/migrations/` under version control going forward — every schema change should be a new migration file applied via `supabase db push`.
