import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarCheck,
  CalendarClock,
  CheckCheck,
  CreditCard,
  Loader2,
  ShieldAlert,
  Sparkles,
  Star,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — NLBB" },
      {
        name: "description",
        content: "Booking updates, reminders and account activity.",
      },
    ],
  }),
  component: NotificationsPage,
});

type Role = "customer" | "provider" | "admin";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  isDemo?: boolean;
  category?: NotifCategory;
};

type NotifCategory =
  | "booking"
  | "review"
  | "reminder"
  | "payment"
  | "signup"
  | "system";

const categoryStyles: Record<
  NotifCategory,
  { icon: typeof Bell; tint: string; ring: string; label: string }
> = {
  booking: {
    icon: CalendarCheck,
    tint: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-200",
    label: "Booking",
  },
  review: {
    icon: Star,
    tint: "bg-amber-100 text-amber-700",
    ring: "ring-amber-200",
    label: "Review",
  },
  reminder: {
    icon: CalendarClock,
    tint: "bg-sky-100 text-sky-700",
    ring: "ring-sky-200",
    label: "Reminder",
  },
  payment: {
    icon: CreditCard,
    tint: "bg-violet-100 text-violet-700",
    ring: "ring-violet-200",
    label: "Payment",
  },
  signup: {
    icon: UserPlus,
    tint: "bg-rose-100 text-rose-700",
    ring: "ring-rose-200",
    label: "New user",
  },
  system: {
    icon: ShieldAlert,
    tint: "bg-secondary text-foreground",
    ring: "ring-border",
    label: "System",
  },
};

const demoByRole: Record<Role, Notif[]> = {
  customer: [
    {
      id: "demo-c-1",
      title: "Your booking was accepted",
      body: "Glow Studio confirmed your braids appointment for Sat 10:30 AM.",
      link: "/bookings",
      read_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      isDemo: true,
      category: "booking",
    },
    {
      id: "demo-c-2",
      title: "How was your appointment?",
      body: "Leave a quick review for Lush Nails — it helps other clients find them.",
      link: "/bookings",
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      isDemo: true,
      category: "review",
    },
  ],
  provider: [
    {
      id: "demo-p-1",
      title: "New booking request",
      body: "Amina K. requested a silk press on Fri 3:00 PM. Tap to accept.",
      link: "/provider",
      read_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      isDemo: true,
      category: "booking",
    },
    {
      id: "demo-p-2",
      title: "You received a 5-star review",
      body: '"Loved the experience, will be back!" — from Brenda M.',
      link: "/provider",
      read_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      isDemo: true,
      category: "review",
    },
  ],
  admin: [
    {
      id: "demo-a-1",
      title: "New provider awaiting verification",
      body: "Velvet Beauty Bar (Westlands) submitted onboarding details.",
      link: "/admin",
      read_at: null,
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      isDemo: true,
      category: "signup",
    },
    {
      id: "demo-a-2",
      title: "Subscription payment received",
      body: "Ksh 500 from Glow Studio — subscription renewed for 30 days.",
      link: "/admin",
      read_at: new Date().toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
      isDemo: true,
      category: "payment",
    },
  ],
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function inferCategory(n: Notif): NotifCategory {
  const t = `${n.title} ${n.body ?? ""}`.toLowerCase();
  if (t.includes("review")) return "review";
  if (t.includes("payment") || t.includes("subscription")) return "payment";
  if (t.includes("remind")) return "reminder";
  if (t.includes("verif") || t.includes("sign") || t.includes("new provider"))
    return "signup";
  if (t.includes("booking") || t.includes("appointment")) return "booking";
  return "system";
}

function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Notif[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("customer");

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const loadRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data ?? []).map((r) => r.role as Role);
      if (roles.includes("admin")) setRole("admin");
      else if (roles.includes("provider")) setRole("provider");
      else setRole("customer");
    };

    const load = () =>
      supabase
        .from("notifications")
        .select("id,title,body,link,read_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) toast.error(error.message);
          setItems(data ?? []);
          setLoading(false);
        });

    loadRole();
    load();

    const channel = supabase
      .channel(`notif-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const merged = useMemo<Notif[] | null>(() => {
    if (items === null) return null;
    const real = items.map((n) => ({ ...n, category: inferCategory(n) }));
    // Inject role-aware demo notifications (clearly marked) so the design
    // can be previewed even on fresh accounts.
    return [...real, ...demoByRole[role]].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    );
  }, [items, role]);

  const grouped = useMemo(() => {
    if (!merged) return null;
    const today: Notif[] = [];
    const earlier: Notif[] = [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    for (const n of merged) {
      (new Date(n.created_at) >= startOfToday ? today : earlier).push(n);
    }
    return { today, earlier };
  }, [merged]);

  const unreadCount = merged?.filter((n) => !n.read_at && !n.isDemo).length ?? 0;

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((cur) =>
      cur?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ??
      null,
    );
    toast.success("All caught up");
  };

  if (authLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <section className="mx-auto max-w-md px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Bell className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 font-serif text-xl">Sign in to view notifications</h2>
            <Button asChild className="mt-6">
              <Link to="/auth/login">Sign in</Link>
            </Button>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-secondary/40 p-6 shadow-[var(--shadow-soft)]">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent ring-1 ring-accent/20">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {role} inbox
                </p>
                <h1 className="font-serif text-2xl sm:text-3xl">Notifications</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {unreadCount > 0
                    ? `You have ${unreadCount} unread update${unreadCount > 1 ? "s" : ""}`
                    : "Booking updates, reviews and reminders"}
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="mr-1.5 h-4 w-4" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Body */}
        {loading && !merged ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !grouped || (grouped.today.length === 0 && grouped.earlier.length === 0) ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 font-serif text-xl">You're all caught up</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll let you know when there's something new.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {grouped.today.length > 0 && (
              <NotifGroup title="Today" items={grouped.today} />
            )}
            {grouped.earlier.length > 0 && (
              <NotifGroup title="Earlier" items={grouped.earlier} />
            )}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function NotifGroup({ title, items }: { title: string; items: Notif[] }) {
  return (
    <div>
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h2>
      <ul className="space-y-2">
        {items.map((n) => {
          const cat = categoryStyles[n.category ?? "system"];
          const Icon = cat.icon;
          const unread = !n.read_at;
          const Wrapper: React.ElementType = n.link && !n.isDemo ? Link : "div";
          const wrapperProps = n.link && !n.isDemo ? { to: n.link } : {};
          return (
            <li key={n.id}>
              <Wrapper
                {...(wrapperProps as Record<string, unknown>)}
                className={`group flex items-start gap-3 rounded-2xl border bg-card p-4 transition-all ${
                  unread
                    ? "border-accent/40 bg-accent/5 hover:border-accent/60"
                    : "border-border hover:border-border/80"
                } ${n.link && !n.isDemo ? "cursor-pointer hover:shadow-[var(--shadow-soft)]" : ""}`}
              >
                <div
                  className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cat.tint} ring-1 ${cat.ring}`}
                >
                  <Icon className="h-5 w-5" />
                  {unread && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={`truncate ${unread ? "font-semibold" : "font-medium"}`}>
                          {n.title}
                        </p>
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {cat.label}
                        </span>
                        {n.isDemo && (
                          <span className="rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            Demo
                          </span>
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
