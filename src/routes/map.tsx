import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, MapPin, Search, Star } from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { Input } from "@/components/ui/input";
import { providers, type Provider } from "@/data/mockProviders";
import { useGeolocation, haversineKm } from "@/hooks/use-geolocation";

const ProvidersMap = lazy(() =>
  import("@/components/map/ProvidersMap").then((m) => ({ default: m.ProvidersMap })),
);

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Beauty pros near you — Map view — NLBB" },
      {
        name: "description",
        content:
          "See verified beauty providers near you on the map. Find the closest barber, salon, nail studio or spa.",
      },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const geo = useGeolocation({ auto: true });
  useEffect(() => setMounted(true), []);

  const enriched = useMemo(() => {
    const list = geo.coords
      ? providers.map((p) => ({
          ...p,
          distanceKm: Number(haversineKm(geo.coords!, { lat: p.lat, lng: p.lng }).toFixed(1)),
        }))
      : providers;
    return [...list].sort((a, b) => a.distanceKm - b.distanceKm);
  }, [geo.coords]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [query, enriched]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl">Pros near you</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} of {providers.length} verified providers
              {geo.coords ? " · sorted by distance" : geo.status === "denied" ? " · enable location for distance" : ""}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, area, category"
              className="pl-9"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 grid max-w-7xl gap-4 px-4 pb-16 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        {/* Map first on mobile so users see it without scrolling */}
        <div className="order-1 lg:order-2 h-[45vh] min-h-[280px] lg:h-[calc(100vh-9rem)] lg:sticky lg:top-20">
          {mounted ? (
            <Suspense
              fallback={
                <div className="grid h-full w-full place-items-center rounded-2xl border border-border bg-secondary/40">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <ProvidersMap providers={filtered} />
            </Suspense>
          ) : (
            <div className="grid h-full w-full place-items-center rounded-2xl border border-border bg-secondary/40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="order-2 lg:order-1 lg:h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No providers match "{query}".
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((p) => (
                <li key={p.id}>
                  <CompactProviderCard
                    p={p}
                    active={activeId === p.id}
                    onHover={() => setActiveId(p.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function CompactProviderCard({
  p,
  active,
  onHover,
}: {
  p: Provider;
  active: boolean;
  onHover: () => void;
}) {
  return (
    <Link
      to="/providers/$id"
      params={{ id: p.id }}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={`group relative flex gap-3 rounded-xl border bg-card p-2.5 transition-all hover:border-primary/60 hover:shadow-sm ${
        active ? "border-primary/60 shadow-sm" : "border-border"
      }`}
    >
      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-32">
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {p.verified && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center rounded-full bg-accent px-1.5 py-0.5 text-accent-foreground">
            <BadgeCheck className="h-3 w-3" />
          </span>
        )}
        <span
          className={`absolute bottom-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide backdrop-blur ${
            p.open
              ? "bg-accent/90 text-accent-foreground"
              : "bg-background/90 text-muted-foreground"
          }`}
        >
          {p.open ? "Open" : "Closed"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[10px] font-medium uppercase tracking-wider text-primary">
          {p.category}
        </p>
        <h3 className="mt-0.5 truncate font-serif text-base leading-tight">
          {p.name}
        </h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-primary text-primary" />
          <span className="font-medium text-foreground">{p.rating}</span>
          <span>({p.reviews})</span>
          <span className="text-border">•</span>
          <span className="truncate">{p.priceRange}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{p.location}</span>
          <span className="text-border">•</span>
          <span className="shrink-0">{p.distanceKm} km</span>
        </div>
        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="text-[11px] text-muted-foreground">Tap to view</span>
          <span className="text-xs font-medium text-accent">View →</span>
        </div>
      </div>

      <div
        className="absolute right-2 top-2"
        onClick={(e) => e.preventDefault()}
      >
        <FavoriteButton providerId={p.id} />
      </div>
    </Link>
  );
}
