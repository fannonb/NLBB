import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — NLBB" },
      { name: "description", content: "Choose a new password for your NLBB account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/" });
  };

  return (
    <AuthLayout title="Set a new password" subtitle="Choose something memorable but secure.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              className="pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update password
        </Button>
      </form>
    </AuthLayout>
  );
}
