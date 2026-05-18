import { Link } from "@tanstack/react-router";
import { categories } from "@/data/mockProviders";

export function CategoriesGrid() {
  return (
    <section id="categories" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent">Explore</p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl">
            Browse by category
          </h2>
        </div>
        <Link
          to="/explore"
          className="hidden text-sm text-muted-foreground hover:text-foreground sm:block"
        >
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <img
              src={c.image}
              alt={`${c.name} category`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="font-serif text-lg text-white">{c.name}</h3>
              <p className="text-xs text-white/75">{c.count}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
