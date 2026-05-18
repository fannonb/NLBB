import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import type { Provider } from "@/data/mockProviders";
import { FavoriteButton } from "@/components/shared/FavoriteButton";

export function ProviderCard({ p }: { p: Provider }) {
  return (
    <Link
      to="/providers/$id"
      params={{ id: p.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
      style={{ boxShadow: "var(--shadow-elegant)" }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {p.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground shadow-sm">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {p.rating}
          <span className="text-muted-foreground">({p.reviews})</span>
        </span>
        <FavoriteButton providerId={p.id} className="absolute right-3 bottom-3 shadow-sm" />
        <span
          className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur ${
            p.open
              ? "bg-accent/90 text-accent-foreground"
              : "bg-background/90 text-muted-foreground"
          }`}
        >
          {p.open ? "Open now" : "Closed"}
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
          <span className="text-sm text-muted-foreground">{p.priceRange}</span>
          <span className="text-sm font-medium text-accent">View →</span>
        </div>
      </div>
    </Link>
  );
}
