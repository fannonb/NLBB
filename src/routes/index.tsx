import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/Hero";
import { CategoriesGrid } from "@/components/home/CategoriesGrid";
import { FeaturedProviders } from "@/components/home/FeaturedProviders";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProviderCTA } from "@/components/home/ProviderCTA";
import { PageShell } from "@/components/shared/PageShell";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <PageShell>
      <Hero />
      <CategoriesGrid />
      <FeaturedProviders />
      <HowItWorks />
      <ProviderCTA />
    </PageShell>
  );
}
