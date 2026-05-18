import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { providers as allProviders } from "@/data/mockProviders";
import { useGeolocation, haversineKm } from "@/hooks/use-geolocation";

export function FeaturedProviders() {
  const geo = useGeolocation({ auto: true });
  const featuredProviders = useMemo(() => {
    const base = geo.coords
      ? allProviders.map((p) => ({
          ...p,
          distanceKm: Number(haversineKm(geo.coords!, { lat: p.lat, lng: p.lng }).toFixed(1)),
        }))
      : allProviders;
    return [...base].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 6);
  }, [geo.coords]);

  return (
    <section className="border-y border-border bg-secondary/40 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">
              Featured
            </p>
            <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
              Top-rated providers near you
            </h2>
          </div>
          <Link
            to="/explore"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
          >
            See all →
          </Link>
        </div>

        <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {featuredProviders.map((p) => (
            <Link
              key={p.id}
              to="/providers/$id"
              params={{ id: p.id }}
              className="group block w-[78vw] flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 sm:w-auto"
              style={{ boxShadow: "var(--shadow-elegant)" }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  width={768}
                  height={576}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.verified && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground shadow-sm">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                  <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                  {p.rating}
                  <span className="text-muted-foreground">({p.reviews})</span>
                </span>
              </div>

              <div className="space-y-3 p-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-primary">
                    {p.category}
                  </p>
                  <h3 className="mt-1 font-serif text-xl">{p.name}</h3>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{p.location}</span>
                  <span className="text-border">•</span>
                  <span>{p.distanceKm} km</span>
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">
                    {p.priceRange}
                  </span>
                  <span className="text-sm font-medium text-accent">
                    View →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
