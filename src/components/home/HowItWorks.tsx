import { CalendarCheck, MapPinned, Sparkles } from "lucide-react";

const steps = [
  {
    icon: MapPinned,
    title: "Discover",
    body: "Search by service, browse categories, or open the map to find verified pros near you.",
    accent: "gold" as const,
  },
  {
    icon: CalendarCheck,
    title: "Book",
    body: "Pick a service, choose a time, and send your request. Your provider confirms in minutes.",
    accent: "emerald" as const,
  },
  {
    icon: Sparkles,
    title: "Glow",
    body: "Show up, enjoy the experience, and rate your provider so the community keeps shining.",
    accent: "gold" as const,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">
          How it works
        </p>
        <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
          Three steps to your next look
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isEmerald = s.accent === "emerald";
          return (
            <div
              key={s.title}
              className="relative rounded-2xl border border-border bg-card p-7"
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <span
                className={`absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-medium ${
                  isEmerald
                    ? "bg-accent text-accent-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                Step {i + 1}
              </span>
              <div
                className="mb-5 grid h-12 w-12 place-items-center rounded-xl text-white"
                style={{
                  background: isEmerald
                    ? "var(--gradient-emerald)"
                    : "var(--gradient-gold)",
                }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
