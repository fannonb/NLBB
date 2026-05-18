import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Briefcase, Calendar, CheckCircle2, Clock, ExternalLink, Loader2,
  Plus, Trash2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderGallery } from "@/components/provider/ProviderGallery";
import { ProviderSettings } from "@/components/provider/ProviderSettings";
import { ProviderPayments } from "@/components/provider/ProviderPayments";
import { ProviderAvailability } from "@/components/provider/ProviderAvailability";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/provider/")({
  head: () => ({ meta: [{ title: "Provider dashboard — Lustre" }] }),
  component: ProviderDashboardPage,
});

type Provider = {
  id: string; slug: string; business_name: string; location: string | null;
  is_verified: boolean; rating: number; reviews_count: number;
};
type Service = {
  id: string; name: string; description: string | null;
  duration_minutes: number; price_cents: number; currency: string; is_active: boolean;
};
type Booking = {
  id: string; scheduled_at: string; status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  duration_minutes: number; price_cents: number; currency: string; notes: string | null;
  service: { name: string } | null;
  customer: { display_name: string | null; phone: string | null } | null;
};

const statusStyles: Record<Booking["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  completed: "bg-secondary text-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function ProviderDashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Service form
  const [svcName, setSvcName] = useState("");
  const [svcDuration, setSvcDuration] = useState(30);
  const [svcPrice, setSvcPrice] = useState(0);
  const [svcDesc, setSvcDesc] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/login" });
  }, [authLoading, user, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: p } = await supabase
      .from("providers")
      .select("id,slug,business_name,location,is_verified,rating,reviews_count")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!p) {
      navigate({ to: "/provider/onboarding" });
      return;
    }
    setProvider(p as Provider);
    const [{ data: s }, { data: b }] = await Promise.all([
      supabase
        .from("services")
        .select("id,name,description,duration_minutes,price_cents,currency,is_active")
        .eq("provider_id", p.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("bookings")
        .select(
          "id,scheduled_at,status,duration_minutes,price_cents,currency,notes,customer_id,service:services(name)"
        )
        .eq("provider_id", p.id)
        .order("scheduled_at", { ascending: false }),
    ]);
    setServices((s as Service[]) ?? []);
    const rawBookings = ((b as unknown) as (Booking & { customer_id: string })[]) ?? [];
    // Fetch customer profiles in a second query (no FK to embed)
    const customerIds = Array.from(new Set(rawBookings.map((r) => r.customer_id)));
    let profileMap: Record<string, { display_name: string | null; phone: string | null }> = {};
    if (customerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id,display_name,phone")
        .in("user_id", customerIds);
      profileMap = Object.fromEntries(
        (profs ?? []).map((p) => [p.user_id, { display_name: p.display_name, phone: p.phone }])
      );
    }
    setBookings(
      rawBookings.map((r) => ({ ...r, customer: profileMap[r.customer_id] ?? null }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: refresh bookings when anything changes for this provider
  useEffect(() => {
    if (!provider?.id) return;
    const channel = supabase
      .channel(`provider-bookings:${provider.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `provider_id=eq.${provider.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider?.id]);

  const stats = useMemo(() => {
    const upcoming = bookings.filter(
      (b) => b.status !== "cancelled" && b.status !== "rejected" && new Date(b.scheduled_at) >= new Date()
    ).length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const revenue = bookings
      .filter((b) => b.status === "completed" || b.status === "accepted")
      .reduce((sum, b) => sum + b.price_cents, 0);
    return { upcoming, pending, revenue };
  }, [bookings]);

  const updateBooking = async (id: string, status: Booking["status"]) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Booking ${status}`);
    load();
  };

  const addService = async (e: FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    const { error } = await supabase.from("services").insert({
      provider_id: provider.id,
      name: svcName,
      description: svcDesc || null,
      duration_minutes: svcDuration,
      price_cents: Math.round(svcPrice * 100),
      currency: "KES",
    });
    if (error) return toast.error(error.message);
    setSvcName(""); setSvcDesc(""); setSvcDuration(30); setSvcPrice(0);
    toast.success("Service added");
    load();
  };

  const toggleService = async (s: Service) => {
    await supabase.from("services").update({ is_active: !s.is_active }).eq("id", s.id);
    load();
  };

  const deleteService = async (id: string) => {
    await supabase.from("services").delete().eq("id", id);
    load();
  };

  if (authLoading || loading || !provider) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Provider dashboard</p>
            <h1 className="font-serif text-3xl">{provider.business_name}</h1>
            {provider.location && (
              <p className="text-sm text-muted-foreground">{provider.location}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/provider/subscription">Subscription</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/providers/$id" params={{ id: provider.slug }}>
                View public page <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {!provider.is_verified && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Your business isn't visible to customers yet. <Link to="/provider/subscription" className="font-medium underline">Activate your subscription</Link> to go live.
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard icon={Calendar} label="Upcoming" value={stats.upcoming} />
          <StatCard icon={Clock} label="Pending requests" value={stats.pending} />
          <StatCard icon={Briefcase} label="Earnings (KES)" value={(stats.revenue / 100).toLocaleString()} />
        </div>

        <Tabs defaultValue="bookings" className="mt-8">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="mt-4">
            {bookings.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No bookings yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {bookings.map((b) => {
                  const dt = new Date(b.scheduled_at);
                  return (
                    <li key={b.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusStyles[b.status]}`}>
                              {b.status}
                            </span>
                            <span className="font-medium">
                              {b.customer?.display_name ?? "Customer"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{b.service?.name}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              {dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                              {" · "}
                              {dt.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span>{b.duration_minutes} min</span>
                            {b.customer?.phone && <span>{b.customer.phone}</span>}
                          </div>
                          {b.notes && <p className="mt-1 text-xs italic text-muted-foreground">"{b.notes}"</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <p className="font-medium text-accent">
                            {b.currency} {(b.price_cents / 100).toLocaleString()}
                          </p>
                          {b.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateBooking(b.id, "accepted")}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => updateBooking(b.id, "rejected")}>
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
                              </Button>
                            </div>
                          )}
                          {b.status === "accepted" && (
                            <Button size="sm" variant="outline" onClick={() => updateBooking(b.id, "completed")}>
                              Mark complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="services" className="mt-4 space-y-6">
            <form onSubmit={addService} className="rounded-2xl border border-border bg-card p-4">
              <h3 className="font-medium">Add a service</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="sn">Name</Label>
                  <Input id="sn" required value={svcName} onChange={(e) => setSvcName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sd">Duration (min)</Label>
                  <Input id="sd" type="number" min={5} value={svcDuration} onChange={(e) => setSvcDuration(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sp">Price (KES)</Label>
                  <Input id="sp" type="number" min={0} value={svcPrice} onChange={(e) => setSvcPrice(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5 sm:col-span-4">
                  <Label htmlFor="sx">Description</Label>
                  <Input id="sx" value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="mt-3">
                <Plus className="mr-1 h-4 w-4" /> Add service
              </Button>
            </form>

            {services.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No services yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {services.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.duration_minutes} min · {s.currency} {(s.price_cents / 100).toLocaleString()}
                        {!s.is_active && " · hidden"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleService(s)}>
                        {s.is_active ? "Hide" : "Show"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteService(s.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="gallery" className="mt-4">
            {user && <ProviderGallery providerId={provider.id} userId={user.id} />}
          </TabsContent>

          <TabsContent value="hours" className="mt-4">
            <ProviderAvailability providerId={provider.id} />
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <ProviderPayments providerId={provider.id} />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <ProviderSettings providerId={provider.id} />
          </TabsContent>
        </Tabs>
      </section>
    </PageShell>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </div>
  );
}
