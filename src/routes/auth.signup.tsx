import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, User, Loader2, Briefcase, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { resolvePostAuthDestination, setPendingRole, type AppRole } from "@/lib/user-setup";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — NLBB" },
      {
        name: "description",
        content: "Sign up to NLBB as a customer or service provider.",
      },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<AppRole>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const onGoogle = async () => {
    setGoogleLoading(true);
    setPendingRole(role, name || undefined);
    const { data: oauthData, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/onboarding",
      },
    });
    if (error) {
      toast.error(error.message || "Could not sign up with Google");
      setGoogleLoading(false);
      return;
    }
    if (oauthData?.url) {
      window.location.assign(oauthData.url);
      return;
    }
    const { data } = await supabase.auth.getUser();
    const dest = data.user ? await resolvePostAuthDestination(data.user.id) : "/onboarding";
    setGoogleLoading(false);
    navigate({ to: dest });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name, intended_role: role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created — welcome!");
    const userId = data.user?.id;
    const dest = userId ? await resolvePostAuthDestination(userId) : "/";
    navigate({ to: dest });
  };

  const RoleCard = ({
    value,
    icon: Icon,
    title,
    desc,
  }: {
    value: AppRole;
    icon: typeof Briefcase;
    title: string;
    desc: string;
  }) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
        role === value
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border hover:border-primary/40"
      }`}
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-sm font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join NLBB as a customer or list your beauty business."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <RoleCard value="customer" icon={UserRound} title="Customer" desc="Discover & book services" />
          <RoleCard value="provider" icon={Briefcase} title="Service provider" desc="List & manage your business" />
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={googleLoading}>
          {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue with Google
        </Button>
        <div className="relative my-2 text-center text-xs text-muted-foreground">
          <span className="relative z-10 bg-card px-2">or</span>
          <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="name" placeholder="Jane Doe" className="pl-9" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="password" type="password" placeholder="At least 8 characters" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create account
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By signing up you agree to our Terms and Privacy Policy.
        </p>
      </form>
    </AuthLayout>
  );
}
