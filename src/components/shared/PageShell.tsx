import type { ReactNode } from "react";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { BottomNav } from "@/components/shared/BottomNav";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </div>
  );
}
