import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocateFixed, MapPin, Quote, Scissors, Search, Star } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import heroImg from "@/assets/hero-salon.jpg";
import { useGeolocation } from "@/hooks/use-geolocation";

export function Hero() {
  const navigate = useNavigate();
  const geo = useGeolocation();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (loc.trim()) params.set("loc", loc.trim());
    navigate({ to: "/explore", search: Object.fromEntries(params) as never });
  };

  const useMyLocation = () => {
    if (geo.coords) {
      setLoc("My current location");
      return;
    }
    geo.request();
    setLoc("My current location");
  };

  return (
    <section
      id="top"
      className="relative overflow-hidden border-b border-border"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:px-8 lg:py-16">
        <div className="flex flex-col">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Scissors className="h-3.5 w-3.5 text-primary" />
            Kenya's home for barbers, salons & beauty pros
          </span>

          <h1 className="font-serif text-4xl leading-[1.05] sm:text-5xl lg:text-[3.4rem]">
            Look sharp. <br className="hidden sm:block" />
            <span className="italic text-primary">Book in seconds.</span>
          </h1>

          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            NLBB connects you to trusted barbers, nail studios, masseuses, tattoo
            artists and salons near you — view profiles, see prices, and book on
            the spot.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-6 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]"
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <label className="flex items-center gap-2 rounded-xl px-3 focus-within:bg-secondary">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Service or business"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
              </label>
              <div className="flex items-center gap-1 rounded-xl px-3 focus-within:bg-secondary sm:border-l sm:border-border">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  placeholder="Nairobi, Kenya"
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  aria-label="Use my location"
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <LocateFixed className={`h-4 w-4 ${geo.coords ? "text-accent" : ""}`} />
                </button>
              </div>
              <Button
                type="submit"
                size="lg"
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Search
              </Button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span>
                <span className="text-foreground font-semibold">4.9</span> avg
                rating
              </span>
            </div>
            <div>
              <span className="text-foreground font-semibold">500+</span>{" "}
              verified pros
            </div>
            <div>
              <span className="text-foreground font-semibold">M-Pesa</span>{" "}
              secured
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div
            className="relative overflow-hidden rounded-3xl border border-border"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <img
              src={heroImg}
              alt="Inside a premium salon with warm lighting"
              width={1280}
              height={1024}
              className="aspect-[5/4] w-full object-cover lg:aspect-[4/3]"
            />
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur">
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-primary text-primary"
                  />
                ))}
              </div>
              <span className="text-xs font-semibold">4.9</span>
              <span className="text-[11px] text-muted-foreground">
                · 12k reviews
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-border bg-card/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
              <Quote className="mb-2 h-4 w-4 text-accent" />
              <p className="text-sm font-medium leading-snug">
                “Walked in stressed, walked out a whole new person. My new
                go-to.”
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    AK
                  </span>
                  <div className="leading-tight">
                    <p className="text-xs font-semibold">Aisha K.</p>
                    <p className="text-[11px] text-muted-foreground">
                      Booked in 30 seconds
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
                  Loved it
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
