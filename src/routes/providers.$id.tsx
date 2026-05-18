import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Calendar,
  ChevronLeft,
  Clock,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Star,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BookingDialog } from "@/components/booking/BookingDialog";
import { ReviewsList } from "@/components/reviews/ReviewsList";
import { FavoriteButton } from "@/components/shared/FavoriteButton";
import { getProviderById, type Provider as MockProvider } from "@/data/mockProviders";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation, haversineKm } from "@/hooks/use-geolocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/providers/$id")({
  loader: ({ params }) => {
    const provider = getProviderById(params.id) ?? null;
    return { provider, slug: params.id };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.provider;
    if (!p) {
      return { meta: [{ title: "Provider — NLBB" }] };
    }
    return {
      meta: [
        { title: `${p.name} — Book on NLBB` },
        { name: "description", content: `${p.name} in ${p.location}. ${p.about}` },
        { property: "og:title", content: `${p.name} — Book on NLBB` },
        { property: "og:description", content: `${p.about}` },
        { property: "og:image", content: p.image },
      ],
    };
  },
  component: ProviderPage,
});

type DbService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
};

type DbProvider = {
  id: string;
  slug: string;
  business_name: string;
  about: string | null;
  location: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  cover_image: string | null;
  rating: number;
  reviews_count: number;
  is_verified: boolean;
};

const PLACEHOLDER = "https://images.unsplash.com/photo-1521336575822-6da63fb45455?w=1200&q=60";

function ProviderPage() {
  const { provider: mock, slug } = Route.useLoaderData();
  const [selected, setSelected] = useState<string[]>([]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [providerDbId, setProviderDbId] = useState<string | null>(null);
  const [dbProvider, setDbProvider] = useState<DbProvider | null>(null);
  const [dbServices, setDbServices] = useState<DbService[] | null>(null);
  const [dbImages, setDbImages] = useState<string[] | null>(null);
  const [hours, setHours] = useState<{ day: string; hours: string }[]>([]);
  const [loadingDb, setLoadingDb] = useState(!mock);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: prov } = await supabase
        .from("providers")
        .select(
          "id,slug,business_name,about,location,address,phone,whatsapp,cover_image,rating,reviews_count,is_verified",
        )
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!prov) {
        setProviderDbId(null);
        setDbProvider(null);
        setDbServices(null);
        setDbImages(null);
        setLoadingDb(false);
        return;
      }
      setProviderDbId(prov.id);
      setDbProvider(prov as DbProvider);
      const [{ data: svcs }, { data: imgs }, { data: avail }] = await Promise.all([
        supabase
          .from("services")
          .select("id,name,description,duration_minutes,price_cents,currency")
          .eq("provider_id", prov.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("provider_images")
          .select("url")
          .eq("provider_id", prov.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("provider_availability")
          .select("day_of_week,open_time,close_time,is_closed")
          .eq("provider_id", prov.id)
          .order("day_of_week", { ascending: true }),
      ]);
      if (cancelled) return;
      setDbServices((svcs as DbService[]) ?? []);
      setDbImages(((imgs as { url: string }[]) ?? []).map((r) => r.url));
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      setHours(
        ((avail as { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean }[]) ?? []).map((a) => ({
          day: dayNames[a.day_of_week],
          hours: a.is_closed ? "Closed" : `${(a.open_time ?? "").slice(0, 5)} – ${(a.close_time ?? "").slice(0, 5)}`,
        })),
      );
      setLoadingDb(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Build a "p" view-model from either mock or DB provider
  const p = useMemo(() => {
    if (mock) return mock as MockProvider;
    if (!dbProvider) return null;
    return {
      id: dbProvider.slug,
      name: dbProvider.business_name,
      category: "",
      categorySlug: "",
      rating: Number(dbProvider.rating ?? 0),
      reviews: dbProvider.reviews_count ?? 0,
      distanceKm: 0,
      priceRange: "",
      image: dbProvider.cover_image || PLACEHOLDER,
      gallery: [] as string[],
      verified: dbProvider.is_verified,
      open: true,
      location: dbProvider.location ?? "",
      address: dbProvider.address ?? "",
      about: dbProvider.about ?? "",
      phone: dbProvider.phone ?? "",
      whatsapp: dbProvider.whatsapp ?? "",
      lat: 0,
      lng: 0,
      services: [] as { name: string; duration: string; price: string }[],
      hours: [] as { day: string; hours: string }[],
    } as MockProvider;
  }, [mock, dbProvider]);

  type DisplayService = { name: string; duration: string; price: string };

  const displayServices = useMemo<DisplayService[]>(() => {
    if (dbServices && dbServices.length > 0) {
      return dbServices.map((s) => ({
        name: s.name,
        duration: `${s.duration_minutes} min`,
        price: `${s.currency} ${(s.price_cents / 100).toLocaleString()}`,
      }));
    }
    return (p?.services ?? []) as DisplayService[];
  }, [dbServices, p]);

  const displayGallery = useMemo<string[]>(
    () => (dbImages && dbImages.length > 0 ? dbImages : ((p?.gallery ?? []) as string[])),
    [dbImages, p],
  );

  const displayHours = useMemo(() => (hours.length > 0 ? hours : p?.hours ?? []), [hours, p]);

  const toggle = (name: string) =>
    setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));

  const parsePrice = (price: string) => {
    const n = Number(price.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const { total, currency } = useMemo(() => {
    const chosen = displayServices.filter((s) => selected.includes(s.name));
    const total = chosen.reduce((sum, s) => sum + parsePrice(s.price), 0);
    const currency = displayServices[0]?.price.replace(/[\d.,\s]/g, "") || "";
    return { total, currency };
  }, [selected, displayServices]);

  const { user } = useAuth();
  const isSignedIn = !!user;
  const geo = useGeolocation({ auto: true });
  const distanceKm = useMemo(() => {
    if (!geo.coords || !p?.lat || !p?.lng) return null;
    return Number(haversineKm(geo.coords, { lat: p.lat, lng: p.lng }).toFixed(1));
  }, [geo.coords, p]);

  if (loadingDb && !p) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!p) {
    return (
      <PageShell>
        <section className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-serif text-2xl">Provider not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page may not be active yet.
          </p>
          <Button asChild className="mt-6">
            <Link to="/explore">Browse providers</Link>
          </Button>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
        <Link
          to="/explore"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to explore
        </Link>
      </div>

      {/* Gallery */}
      <section className="mx-auto mt-4 max-w-5xl sm:px-6">
        {/* Mobile: snap carousel */}
        <div className="sm:hidden">
          {(() => {
            const slides = [p.image, ...displayGallery.filter((s) => s && s !== p.image)];
            return (
              <div className="relative">
                <div
                  className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {slides.map((src, i) => (
                    <div
                      key={i}
                      className="relative shrink-0 snap-center w-[88%] aspect-[4/3] overflow-hidden rounded-2xl border border-border"
                      style={i === 0 ? { boxShadow: "var(--shadow-elegant)" } : undefined}
                    >
                      <img src={src} alt={i === 0 ? p.name : ""} className="h-full w-full object-cover" />
                      <span className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
                        {i + 1}/{slides.length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Desktop / tablet: grid */}
        <div className="hidden sm:grid gap-3 px-0 sm:grid-cols-3 sm:grid-rows-2 sm:h-[420px]">
          <div
            className="relative overflow-hidden rounded-2xl border border-border sm:col-span-2 sm:row-span-2"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
          </div>
          {displayGallery.slice(0, 2).map((src, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </section>

      {/* Title + actions */}
      <section className="mx-auto mt-6 max-w-5xl px-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {p.category && (
              <p className="text-xs uppercase tracking-wider text-primary">{p.category}</p>
            )}
            <h1 className="mt-1 flex flex-wrap items-center gap-2 font-serif text-2xl sm:text-3xl">
              {p.name}
              {p.verified && (
                <BadgeCheck className="h-5 w-5 text-accent" aria-label="Verified" />
              )}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-foreground font-medium">{p.rating}</span>
                <span>({p.reviews})</span>
              </span>
              {p.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {p.location}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FavoriteButton providerId={p.id} size="md" className="border border-border" />
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                if (selected.length === 0) {
                  toast.message("Choose a service to continue", {
                    description: "Select one or more services from the list below.",
                  });
                  document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                setBookingOpen(true);
              }}
              disabled={displayServices.length === 0}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Book now
            </Button>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto mt-8 grid max-w-5xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8 min-w-0">
          {p.about && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-serif text-xl">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.about}</p>
            </div>
          )}

          <div id="services-section" className="scroll-mt-24">
            <h2 className="font-serif text-xl">Services</h2>
            {displayServices.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                This provider hasn't published services yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
                {displayServices.map((s) => {
                  const checked = selected.includes(s.name);
                  return (
                    <li key={s.name}>
                      <label
                        className={`flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors ${
                          checked ? "bg-accent/5" : "hover:bg-secondary/40"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggle(s.name)}
                            aria-label={`Select ${s.name}`}
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground">{s.duration}</p>
                          </div>
                        </div>
                        <span className="font-medium text-accent whitespace-nowrap">{s.price}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-serif text-xl">Reviews</h2>
            <div className="mt-3">
              {providerDbId ? (
                <ReviewsList providerId={providerDbId} />
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="font-serif text-base">Contact</h3>
            {isSignedIn ? (
              <div className="mt-3 space-y-2 text-sm">
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="flex items-center gap-2 hover:text-primary">
                    <Phone className="h-4 w-4 text-accent" />
                    {p.phone}
                  </a>
                )}
                {p.whatsapp && (
                  <a
                    href={`https://wa.me/${p.whatsapp.replace(/\D/g, "")}`}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <MessageCircle className="h-4 w-4 text-accent" />
                    WhatsApp
                  </a>
                )}
                {!p.phone && !p.whatsapp && (
                  <p className="text-muted-foreground">No contact info shared yet.</p>
                )}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  Sign in to view contact.
                </p>
                <Button asChild size="sm" className="mt-3 w-full">
                  <Link to="/auth/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>

          {displayHours.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 font-serif text-base">
                <Clock className="h-4 w-4 text-accent" />
                Opening hours
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm">
                {displayHours.map((h) => (
                  <li key={h.day} className="flex items-center justify-between">
                    <span className="text-foreground">{h.day}</span>
                    <span className="text-muted-foreground">{h.hours}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(p.address || p.location) && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="flex items-center gap-2 font-serif text-base">
                <MapPin className="h-4 w-4 text-accent" />
                Location
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {p.address || p.location}
              </p>
              {distanceKm !== null && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground">
                  <MapPin className="h-3 w-3 text-accent" />
                  {distanceKm} km from you
                </p>
              )}
              {distanceKm === null && geo.status === "denied" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Enable location to see distance.
                </p>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${
                  p.lat && p.lng
                    ? `${p.lat},${p.lng}`
                    : encodeURIComponent(`${p.address || ""} ${p.location || ""}`.trim())
                }`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/60 hover:bg-secondary"
              >
                <MapPin className="h-4 w-4 text-accent" />
                Get directions on Google Maps
              </a>
            </div>
          )}
        </aside>
      </section>

      {selected.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-16 z-50 px-4 pb-2 md:bottom-0 md:pb-[max(1rem,env(safe-area-inset-bottom))] md:sm:pb-6">
          <div
            className="pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 p-3 pl-5 backdrop-blur"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {selected.length} {selected.length === 1 ? "service" : "services"} selected
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Total {currency}
                {total.toLocaleString()}
              </p>
            </div>
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setBookingOpen(true)}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Book {selected.length > 1 ? `(${selected.length})` : "now"}
            </Button>
          </div>
        </div>
      )}

      <BookingDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        providerSlug={p.id}
        selectedServiceNames={selected}
        onBooked={() => setSelected([])}
      />
    </PageShell>
  );
}
