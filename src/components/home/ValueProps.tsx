import { CalendarCheck, MapPin, ShieldCheck, Sparkles } from "lucide-react";

const items = [
  {
    icon: MapPin,
    eyebrow: "Nearby",
    title: "Find pros near you",
    body: "Trusted beauty professionals just minutes from your door.",
    tone: "primary" as const,
  },
  {
    icon: CalendarCheck,
    eyebrow: "Instant",
    title: "Book in seconds",
    body: "See real availability and lock in your slot — no calls, no waiting.",
    tone: "accent" as const,
  },
  {
    icon: ShieldCheck,
    eyebrow: "Trusted",
    title: "Verified & secure",
    body: "Every provider is reviewed. Pay confidently via M-Pesa.",
    tone: "primary" as const,
  },
];

export function ValueProps() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Soft brand wash background */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 50% 80% at 15% 0%, oklch(0.7 0.12 75 / 0.08), transparent 60%), radial-gradient(ellipse 50% 80% at 85% 100%, oklch(0.42 0.07 180 / 0.07), transparent 60%), var(--color-card)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-accent backdrop-blur">
            <Sparkles className="h-3 w-3" />
            Why Lustre
          </span>
          <h2 className="mt-3 font-serif text-2xl sm:text-3xl">
            Beauty, booked beautifully
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
          {items.map((it, i) => {
            const Icon = it.icon;
            const isAccent = it.tone === "accent";
            return (
              <div
                key={it.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 sm:p-7"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                {/* Accent corner glow on hover */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: isAccent
                      ? "var(--gradient-emerald)"
                      : "var(--gradient-gold)",
                  }}
                />

                {/* Step index */}
                <span className="absolute right-5 top-5 font-serif text-3xl leading-none text-muted-foreground/30">
                  0{i + 1}
                </span>

                <span
                  className="mb-5 grid h-12 w-12 place-items-center rounded-xl text-white shadow-md"
                  style={{
                    background: isAccent
                      ? "var(--gradient-emerald)"
                      : "var(--gradient-gold)",
                  }}
                >
                  <Icon className="h-5 w-5" />
                </span>

                <p
                  className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                    isAccent ? "text-accent" : "text-primary"
                  }`}
                >
                  {it.eyebrow}
                </p>
                <h3 className="mt-1 font-serif text-xl leading-tight">
                  {it.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {it.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
