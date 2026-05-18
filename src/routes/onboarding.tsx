import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthDestination } from "@/lib/user-setup";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Setting up your account — Lustre" }] }),
  component: OnboardingRedirect,
});

function OnboardingRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Wait briefly for session restoration after OAuth
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          const dest = await resolvePostAuthDestination(data.user.id);
          if (!cancelled) navigate({ to: dest, replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!cancelled) navigate({ to: "/auth/login", replace: true });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Setting up your account…
      </div>
    </div>
  );
}
