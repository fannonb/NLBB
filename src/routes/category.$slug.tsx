import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { ProviderCard } from "@/components/shared/ProviderCard";
import {
  getCategoryBySlug,
  getProvidersByCategory,
  type Provider,
} from "@/data/mockProviders";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const category = getCategoryBySlug(params.slug);
    if (!category) throw notFound();
    return { category, list: getProvidersByCategory(params.slug) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.category.name} near you — NLBB` },
          {
            name: "description",
            content: `Discover top-rated ${loaderData.category.name.toLowerCase()} in your area. Verified pros, real reviews, easy booking.`,
          },
        ]
      : [],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { category, list } = Route.useLoaderData();

  return (
    <PageShell>
      <section
        className="relative overflow-hidden border-b border-border"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            All categories
          </Link>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {list.length} {list.length === 1 ? "pro" : "pros"} available
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            No providers yet in this category — check back soon.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p: Provider) => (
              <ProviderCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
