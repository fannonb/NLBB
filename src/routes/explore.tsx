import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PageShell } from "@/components/shared/PageShell";
import { ProviderCard } from "@/components/shared/ProviderCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { categories, providers } from "@/data/mockProviders";
import { useGeolocation, haversineKm } from "@/hooks/use-geolocation";

const exploreSearch = z.object({
  q: fallback(z.string(), "").default(""),
  loc: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/explore")({
  validateSearch: zodValidator(exploreSearch),
  head: () => ({
    meta: [
      { title: "Explore beauty pros near you — NLBB" },
      {
        name: "description",
        content:
          "Browse barbers, salons, nail studios, masseuses and tattoo artists near you. Filter by category, rating, distance, and price.",
      },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { q: initialQ, loc: initialLoc } = Route.useSearch();
  const [query, setQuery] = useState(initialQ);
  const [locQuery, setLocQuery] = useState(initialLoc);
  const [activeSlug, setActiveSlug] = useState<string | "all">("all");
  const [sort, setSort] = useState<"distance" | "rating">("distance");
  const [openOnly, setOpenOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const geo = useGeolocation({ auto: true });

  const enriched = useMemo(() => {
    return providers.map((p) =>
      geo.coords
        ? { ...p, distanceKm: Number(haversineKm(geo.coords, { lat: p.lat, lng: p.lng }).toFixed(1)) }
        : p,
    );
  }, [geo.coords]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (activeSlug !== "all") list = list.filter((p) => p.categorySlug === activeSlug);
    if (openOnly) list = list.filter((p) => p.open);
    if (verifiedOnly) list = list.filter((p) => p.verified);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    if (locQuery.trim() && locQuery.toLowerCase() !== "my current location") {
      const lq = locQuery.toLowerCase();
      list = list.filter((p) => p.location.toLowerCase().includes(lq));
    }
    return [...list].sort((a, b) =>
      sort === "rating" ? b.rating - a.rating : a.distanceKm - b.distanceKm,
    );
  }, [enriched, query, locQuery, activeSlug, sort, openOnly, verifiedOnly]);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl sm:text-4xl">Explore providers</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {filtered.length} pros {geo.coords ? "near your location" : "near you in Nairobi"}
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="flex items-center gap-2 rounded-xl px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Service or business"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </label>
            <div className="flex items-center gap-1 rounded-xl px-3 sm:border-l sm:border-border">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <Input
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                placeholder="Location (e.g. Westlands)"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => {
                  if (geo.coords) {
                    geo.clear();
                    setLocQuery("");
                  } else {
                    geo.request();
                    setLocQuery("My current location");
                  }
                }}
                aria-label="Use my location"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
              >
                <LocateFixed className={`h-4 w-4 ${geo.coords ? "text-accent" : ""}`} />
              </button>
            </div>
            <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              Search
            </Button>
          </div>
          {geo.status === "denied" && (
            <p className="mt-2 px-3 text-xs text-muted-foreground">
              Location blocked. Enable it in your browser to sort by real distance.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <FilterChip active={activeSlug === "all"} onClick={() => setActiveSlug("all")}>
            All
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.slug}
              active={activeSlug === c.slug}
              onClick={() => setActiveSlug(c.slug)}
            >
              {c.name}
            </FilterChip>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" />
          <FilterChip active={openOnly} onClick={() => setOpenOnly((v) => !v)}>
            Open now
          </FilterChip>
          <FilterChip active={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)}>
            Verified
          </FilterChip>
          {(openOnly || verifiedOnly || activeSlug !== "all" || query) && (
            <button
              onClick={() => {
                setActiveSlug("all");
                setOpenOnly(false);
                setVerifiedOnly(false);
                setQuery("");
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "distance" | "rating")}
              className="rounded-md border border-border bg-card px-2 py-1.5 text-sm"
            >
              <option value="distance">Nearest</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-muted-foreground">
              No providers match. Try a different category or search term.
            </p>
            <Link to="/explore" className="mt-4 inline-block text-sm text-accent">
              Reset filters →
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
