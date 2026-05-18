import { Button } from "@/components/ui/button";
import { ArrowRight, Check } from "lucide-react";

const perks = [
  "List your business in minutes",
  "Manage bookings in one place",
  "Get discovered by clients near you",
];

export function ProviderCTA() {
  return (
    <section id="providers" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div
        className="relative overflow-hidden rounded-3xl border border-border p-10 text-primary-foreground sm:p-14"
        style={{
          background: "var(--gradient-emerald)",
          boxShadow: "var(--shadow-elegant)",
        }}
      >
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">
              For beauty professionals
            </p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl">
              Grow your clientele for{" "}
              <span className="italic text-primary">Ksh 500</span> a month.
            </h2>
            <p className="mt-4 max-w-xl text-primary-foreground/80">
              A beautiful profile, real-time booking, and visibility to thousands
              of clients searching nearby. Pay easily via M-Pesa.
            </p>

            <ul className="mt-6 space-y-2.5">
              {perks.map((p) => (
                <li
                  key={p}
                  className="flex items-center gap-2.5 text-sm text-primary-foreground"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/20 text-primary">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Become a provider
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                Learn more
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur">
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-5xl text-primary">Ksh 500</span>
              <span className="text-sm text-primary-foreground/75">/ month</span>
            </div>
            <p className="mt-1 text-sm text-primary-foreground/75">
              One simple subscription via M-Pesa.
            </p>
            <div className="mt-5 space-y-3 border-t border-white/15 pt-5 text-sm">
              {[
                ["Listing visibility", "Active"],
                ["Verified badge", "Included"],
                ["Booking tools", "Unlimited"],
                ["Commission", "0%"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-primary-foreground/75">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
