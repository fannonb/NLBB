import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { PageShell } from "@/components/shared/PageShell";
import { ProviderCard } from "@/components/shared/ProviderCard";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { providers } from "@/data/mockProviders";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Saved providers — NLBB" },
      { name: "description", content: "Your favorite beauty pros, ready to book." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { ids, loading } = useFavorites();
  const saved = useMemo(() => providers.filter((p) => ids.has(p.id)), [ids]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl sm:text-4xl">Saved providers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the heart on any provider to save them here
        </p>

        {authLoading || loading ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : !user ? (
          <EmptyState
            title="Sign in to see your saves"
            body="Create an account or sign in to save providers and book faster."
            cta={{ label: "Sign in", to: "/auth/login" }}
          />
        ) : saved.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            body="Start exploring and save your favorite pros for quick booking later."
            cta={{ label: "Browse providers", to: "/explore" }}
          />
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { label: string; to: "/explore" | "/auth/login" };
}) {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <Heart className="mx-auto h-10 w-10 text-accent" />
      <h2 className="mt-4 font-serif text-xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      <Button asChild className="mt-6">
        <Link to={cta.to}>{cta.label}</Link>
      </Button>
    </div>
  );
}
