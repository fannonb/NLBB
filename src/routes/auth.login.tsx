import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthDestination } from "@/lib/user-setup";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Sign in — NLBB" },
      { name: "description", content: "Sign in to NLBB to book and manage appointments." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onGoogle = async () => {
    setGoogleLoading(true);
    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message || "Could not sign in with Google");
      setGoogleLoading(false);
      return;
    }
    if (oauthData?.url) {
      window.location.assign(oauthData.url);
      return;
    }
    const { data } = await supabase.auth.getUser();
    const dest = data.user ? await resolvePostAuthDestination(data.user.id) : "/";
    setGoogleLoading(false);
    navigate({ to: dest });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    const dest = data.user ? await resolvePostAuthDestination(data.user.id) : "/";
    navigate({ to: dest });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to view contacts, book and manage appointments."
      footer={
        <>
          New here?{" "}
          <Link to="/auth/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={googleLoading}>
          {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>
        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-card px-2">or</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
