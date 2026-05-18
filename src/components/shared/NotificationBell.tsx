import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Demo unread counts mirror the role-aware demo notifications shown on
// /notifications so the bell badge is visible even on fresh accounts.
const DEMO_UNREAD: Record<"customer" | "provider" | "admin", number> = {
  customer: 1,
  provider: 2,
  admin: 1,
};

export function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [demoUnread, setDemoUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      setDemoUnread(0);
      return;
    }
    let cancelled = false;

    const loadRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role as "customer" | "provider" | "admin");
      const role = roles.includes("admin")
        ? "admin"
        : roles.includes("provider")
          ? "provider"
          : "customer";
      if (!cancelled) setDemoUnread(DEMO_UNREAD[role]);
    };
    loadRole();

    const refresh = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (!cancelled) setUnread(count ?? 0);
    };
    refresh();

    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setUnread((n) => n + 1);
          const row = payload.new as { title?: string; body?: string | null };
          toast(row.title ?? "New notification", { description: row.body ?? undefined });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (!user) return null;

  const total = unread + demoUnread;

  return (
    <Link
      to="/notifications"
      aria-label={`Notifications${total ? ` (${total} unread)` : ""}`}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      <Bell className="h-5 w-5" />
      {total > 0 && (
        <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground shadow-sm ring-2 ring-background animate-in zoom-in">
          {total > 9 ? "9+" : total}
        </span>
      )}
    </Link>
  );
}
