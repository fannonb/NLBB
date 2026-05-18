import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar, Heart, Loader2, MapPin, Settings as SettingsIcon, Star, User as UserIcon,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/user-setup";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Lustre" }] }),
  component: DashboardRouter,
});

type Stats = {
  upcoming: number;
  past: number;
  favorites: number;
  toReview: number;
};

type UpcomingRow = {
  id: string;
  scheduled_at: string;
  status: string;
  provider: { business_name: string; slug: string; location: string | null } | null;
  service: { name: string } | null;
};

function DashboardRouter() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [resolving, setResolving] = useState(true);
  const [isCustomer, setIsCustomer] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }
    getUserRole(user.id).then((role) => {
      if (role === "admin") navigate({ to: "/admin" });
      else if (role === "provider") navigate({ to: "/provider" });
      else {
        setIsCustomer(true);
        setResolving(false);
      }
    });
  }, [authLoading, user, navigate]);

  if (authLoading || resolving || !user) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return isCustomer ? <CustomerDashboard userId={user.id} email={user.email ?? ""} /> : null;
}

function CustomerDashboard({ userId, email }: { userId: string; email: string }) {
  const [stats, setStats] = useState<Stats>({ upcoming: 0, past: 0, favorites: 0, toReview: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const [{ data: up }, { data: past }, { count: favCount }, { data: completed }] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("id,scheduled_at,status,provider:providers(business_name,slug,location),service:services(name)")
            .eq("customer_id", userId)
            .gte("scheduled_at", nowIso)
            .neq("status", "cancelled")
            .neq("status", "rejected")
            .order("scheduled_at", { ascending: true })
            .limit(5),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("customer_id", userId)
            .lt("scheduled_at", nowIso),
          supabase
            .from("favorites")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId),
          supabase
            .from("bookings")
            .select("id")
            .eq("customer_id", userId)
            .eq("status", "completed"),
        ]);

      const completedIds = (completed ?? []).map((c) => c.id as string);
      let toReview = 0;
      if (completedIds.length) {
        const { data: revs } = await supabase
          .from("reviews")
          .select("booking_id")
          .in("booking_id", completedIds);
        const reviewed = new Set((revs ?? []).map((r) => r.booking_id));
        toReview = completedIds.filter((id) => !reviewed.has(id)).length;
      }
      const upRows = (up as unknown as UpcomingRow[]) ?? [];
      setUpcoming(upRows);
      setStats({
        upcoming: upRows.length,
        past: (past as unknown as { length?: number })?.length ?? 0,
        favorites: favCount ?? 0,
        toReview,
      });
      setLoading(false);
    })();
  }, [userId]);

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Welcome back</p>
            <h1 className="font-serif text-3xl">{email.split("@")[0]}</h1>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/profile">
              <SettingsIcon className="mr-1 h-4 w-4" /> Account settings
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Calendar} label="Upcoming" value={stats.upcoming} />
          <Stat icon={UserIcon} label="Past visits" value={stats.past} />
          <Stat icon={Heart} label="Saved" value={stats.favorites} />
          <Stat icon={Star} label="Awaiting review" value={stats.toReview} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-end justify-between">
              <h2 className="font-serif text-xl">Upcoming appointments</h2>
              <Button asChild size="sm" variant="ghost">
                <Link to="/bookings">View all</Link>
              </Button>
            </div>
            {loading ? (
              <div className="mt-4 flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
                <Calendar className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-3 text-sm font-medium">No upcoming bookings</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Discover providers and book your next appointment.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/explore">Browse providers</Link>
                </Button>
              </div>
            ) : (
              <ul className="mt-4 space-y-2">
                {upcoming.map((b) => {
                  const dt = new Date(b.scheduled_at);
                  return (
                    <li key={b.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{b.provider?.business_name ?? "Provider"}</p>
                          <p className="text-xs text-muted-foreground">{b.service?.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                              {" · "}
                              {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {b.provider?.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {b.provider.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] uppercase tracking-wide">
                          {b.status}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="font-serif text-xl">Quick links</h2>
            <QuickLink to="/explore" title="Explore" desc="Find providers near you" />
            <QuickLink to="/map" title="Map" desc="Browse providers by location" />
            <QuickLink to="/favorites" title="Saved providers" desc="Your shortlist" />
            <QuickLink to="/bookings" title="My bookings" desc="All appointments" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 font-serif text-2xl">{value.toLocaleString()}</p>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: "/explore" | "/map" | "/favorites" | "/bookings"; title: string; desc: string }) {
  return (
    <Link to={to} className="block rounded-xl border border-border bg-card p-3 hover:border-accent">
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  );
}
