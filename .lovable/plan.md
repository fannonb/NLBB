# Beauty Services PWA — Build Plan

Homepage is approved. This plan sequences the rest of the product into shippable phases. Each phase ends with something usable in the preview before moving on.

## Phase 1 — Customer browsing (frontend only, mock data)

Goal: a visitor can move through the discovery flow end-to-end with mock data, no backend yet.

Routes to add:

- `/explore` — full provider list with category filter, search, sort
- `/category/$slug` — providers filtered by category
- `/providers/$id` — provider profile (about, services, gallery, hours, reviews, map placeholder, locked contact)
- `/map` — list + map placeholder side-by-side (real map added in Phase 4)
- `/bookings` — empty state for guests, list for signed-in
- `/favorites` — saved providers
- `/auth/login`, `/auth/signup`, `/auth/forgot-password`

Shared:

- Bottom nav on mobile (Home, Explore, Map, Bookings, Profile), top nav on desktop
- Provider card component reused across listings
- "Sign in to view contact" gate on provider details

## Phase 2 — Backend foundation (Supabase)

Use supabase set up:

- Auth: email/password + Google
- `profiles` table (name, phone, avatar, location)
- `user_roles` table with enum `customer | provider | admin` and `has_role()` security definer function
- `providers`, `provider_categories`, `services`, `provider_images`, `provider_availability`, `bookings`, `reviews`, `subscriptions`, `payments`, `notifications`
- RLS on every table
- Storage bucket for provider photos
- Auth pages wired to Cloud, route guards via `_authenticated` layout
- Replace mock data on customer screens with real queries

## Phase 3 — Booking flow

- Booking screen: pick service → date → time slot → notes → submit
- Server function creates booking with status `pending`
- `/bookings` shows customer's bookings with statuses (pending, accepted, rejected, completed, cancelled)
- Cancel/reschedule actions
- Email or in-app notification on status change

## Phase 4 — Provider app

Routes under `/provider/*` (protected, requires `provider` role):

- `/provider/onboarding` — business details, category, location, hours
- `/provider/dashboard` — KPIs (views, bookings, rating, subscription status)
- `/provider/appointments` — incoming requests, accept/reject, mark complete
- `/provider/services` — CRUD services + pricing
- `/provider/availability` — weekly schedule
- `/provider/profile` — edit business info + gallery upload
- `/provider/subscription` — pay/renew

Visibility rule enforced server-side: providers without an active subscription are hidden from public listings.

## Phase 5 — M-Pesa subscription. The integration will be done by Cooperative bank Mpesa Paybill (Ksh 500/month)

- Add Safaricom Daraja credentials as secrets
- Server route `/api/public/mpesa/callback` for STK push confirmation (signature/IP verified)
- Server function to initiate STK push from provider subscription page
- On successful callback: insert into `payments`, update `subscriptions.status = active`, set renewal date
- Cron-style daily check (server route + scheduler) to expire lapsed subscriptions

## Phase 6 — Maps & location

- Pick provider: Mapbox (cheaper free tier) or Google Maps
- Browser geolocation prompt
- Provider address autocomplete on onboarding
- "Nearby" sort by distance on `/explore` and `/map`
- Directions link out to native maps app

## Phase 7 — Admin dashboard

Separate route tree under `/admin/*` (protected, `admin` role only):

- Overview: users, providers, active subs, bookings, MRR
- Providers: approve/suspend, view subscription
- Payments: M-Pesa transactions, revenue charts
- Bookings: volume by category, completion rate
- Categories & banners management

## Phase 8 — PWA shell

(Done last — interferes with preview if added early.)

- Web app manifest + icons (installable, no service worker)
- If user wants offline + push later: full service worker with iframe/preview guards per Lovable PWA guidance

## Open questions before Phase 1

1. **Map provider preference** — Mapbox or Google Maps? (affects keys + pricing) - Mapbox.
2. **Auth methods** — email + Google is the default; want phone/OTP too? No phone or OTP
3. **Next phase order** — start Phase 1 (more customer pages with mock data) or jump straight to Phase 2 (enable Cloud + auth) so everything is real from the start? Start phase 1

## Technical notes

- Stack stays as-is: TanStack Start + Tailwind v4 + shadcn, light theme with gold + emerald tokens
- All data access via `createServerFn` with `requireSupabaseAuth` middleware; M-Pesa callback via `/api/public/*` server route with signature check
- Roles in dedicated `user_roles` table (never on profiles), checked via `has_role()` security definer function in RLS policies
- Admin dashboard shares the codebase but lives under a separate route group with its own layout