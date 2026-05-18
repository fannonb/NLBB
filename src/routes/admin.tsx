import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Ban, CheckCircle2, ExternalLink, Loader2, ShieldCheck, Trash2, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getUserRole } from "@/lib/user-setup";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Lustre" }] }),
  component: AdminPage,
});

type ProviderRow = {
  id: string; slug: string; business_name: string; location: string | null;
  is_verified: boolean; is_active: boolean; rating: number; reviews_count: number;
  user_id: string; created_at: string;
};
type PaymentRow = {
  id: string; provider_id: string; amount_cents: number; currency: string;
  status: string; phone: string | null; mpesa_receipt: string | null; created_at: string;
  subscription_id: string | null;
};
type SubRow = { id: string; provider_id: string; status: string; expires_at: string | null };

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [reviewsCount, setReviewsCount] = useState(0);
  const [bookingsByDay, setBookingsByDay] = useState<{ day: string; count: number }[]>([]);
  const [revenueCents, setRevenueCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<{ user_id: string; email: string; display_name: string | null }[]>([]);
  const [customers, setCustomers] = useState<{ user_id: string; email: string; display_name: string | null; phone: string | null; created_at: string; is_suspended: boolean; bookings_count: number }[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);

  const loadCustomers = async () => {
    const { data, error } = await supabase.rpc("list_customers");
    if (!error) setCustomers((data as typeof customers) ?? []);
  };

  const setUserSuspended = async (userId: string, suspend: boolean, label: string) => {
    if (!confirm(`${suspend ? "Suspend" : "Unsuspend"} ${label}?`)) return;
    const { data, error } = await supabase.rpc("admin_set_user_suspended", { _target: userId, _suspended: suspend });
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; error?: string };
    if (!res?.ok) { toast.error(res?.error ?? "Failed"); return; }
    toast.success(suspend ? "Account suspended" : "Account restored");
    loadCustomers(); load();
  };

  const deleteUser = async (userId: string, label: string) => {
    if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    const { data, error } = await supabase.rpc("admin_delete_user", { _target: userId });
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; error?: string };
    if (!res?.ok) { toast.error(res?.error ?? "Failed"); return; }
    toast.success("Account deleted");
    loadCustomers(); load();
  };

  const deleteProvider = async (providerId: string, label: string) => {
    if (!confirm(`Delete provider "${label}"? This removes their listing.`)) return;
    const { data, error } = await supabase.rpc("admin_delete_provider", { _provider: providerId });
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; error?: string };
    if (!res?.ok) { toast.error(res?.error ?? "Failed"); return; }
    toast.success("Provider deleted");
    load();
  };


  const loadAdmins = async () => {
    const { data, error } = await supabase.rpc("list_admins");
    if (!error) setAdmins((data as { user_id: string; email: string; display_name: string | null }[]) ?? []);
  };

  const addAdmin = async () => {
    const email = newAdminEmail.trim();
    if (!email) return;
    setAdminBusy(true);
    const { data, error } = await supabase.rpc("promote_admin_by_email", { _email: email });
    setAdminBusy(false);
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; error?: string };
    if (!res?.ok) { toast.error(res?.error ?? "Could not promote"); return; }
    toast.success(`${email} is now an admin`);
    setNewAdminEmail("");
    loadAdmins();
  };

  const removeAdmin = async (userId: string, email: string) => {
    if (!confirm(`Remove admin access from ${email}?`)) return;
    setAdminBusy(true);
    const { data, error } = await supabase.rpc("revoke_admin", { _target: userId });
    setAdminBusy(false);
    if (error) { toast.error(error.message); return; }
    const res = data as { ok: boolean; error?: string };
    if (!res?.ok) { toast.error(res?.error ?? "Could not remove"); return; }
    toast.success("Admin removed");
    loadAdmins();
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/auth/login" });
      return;
    }
    getUserRole(user.id).then((role) => {
      if (role !== "admin") {
        toast.error("Admin access required");
        navigate({ to: "/" });
        setAllowed(false);
      } else {
        setAllowed(true);
      }
    });
  }, [authLoading, user, navigate]);

  const load = async () => {
    setLoading(true);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [{ data: p }, { data: pay }, { data: s }, { count: bc }, { count: rc }, { data: recentBookings }] =
      await Promise.all([
        supabase
          .from("providers")
          .select("id,slug,business_name,location,is_verified,is_active,rating,reviews_count,user_id,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id,provider_id,amount_cents,currency,status,phone,mpesa_receipt,created_at,subscription_id")
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id,provider_id,status,expires_at")
          .order("created_at", { ascending: false }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase
          .from("bookings")
          .select("created_at")
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

    setProviders((p as ProviderRow[]) ?? []);
    setPayments((pay as PaymentRow[]) ?? []);
    setSubs((s as SubRow[]) ?? []);
    setBookingsCount(bc ?? 0);
    setReviewsCount(rc ?? 0);
    setRevenueCents(
      ((pay as PaymentRow[]) ?? [])
        .filter((row) => row.status === "success")
        .reduce((sum, row) => sum + row.amount_cents, 0),
    );

    // Bucket bookings by day (last 7 days)
    const buckets = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    ((recentBookings as { created_at: string }[]) ?? []).forEach((row) => {
      const key = row.created_at.slice(0, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    setBookingsByDay(
      Array.from(buckets.entries()).map(([day, count]) => ({
        day: new Date(day).toLocaleDateString(undefined, { weekday: "short" }),
        count,
      })),
    );

    setLoading(false);
  };

  useEffect(() => {
    if (allowed) {
      load();
      loadAdmins();
      loadCustomers();
    }
  }, [allowed]);

  const providerById = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p])),
    [providers]
  );

  const toggleVerified = async (p: ProviderRow) => {
    await supabase.from("providers").update({ is_verified: !p.is_verified }).eq("id", p.id);
    load();
  };
  const toggleActive = async (p: ProviderRow) => {
    await supabase.from("providers").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };

  const approvePayment = async (pay: PaymentRow) => {
    // Mark payment completed and ensure an active 1-year subscription exists
    await supabase.from("payments").update({ status: "success" }).eq("id", pay.id);
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    const existing = subs.find((s) => s.provider_id === pay.provider_id);
    if (existing) {
      await supabase
        .from("subscriptions")
        .update({ status: "active", started_at: new Date().toISOString(), expires_at: expires.toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("subscriptions").insert({
        provider_id: pay.provider_id,
        status: "active",
        amount_cents: pay.amount_cents,
        currency: pay.currency,
        started_at: new Date().toISOString(),
        expires_at: expires.toISOString(),
      });
    }
    toast.success("Payment approved & subscription activated");
    load();
  };

  const rejectPayment = async (pay: PaymentRow) => {
    await supabase.from("payments").update({ status: "failed" }).eq("id", pay.id);
    toast.success("Payment marked failed");
    load();
  };

  if (authLoading || allowed === null || (allowed && loading)) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }
  if (!allowed) return null;

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const otherPayments = payments.filter((p) => p.status !== "pending");

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-serif text-3xl">Admin</h1>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Providers" value={providers.length} />
          <Stat label="Active subs" value={subs.filter((s) => s.status === "active").length} />
          <Stat label="Bookings" value={bookingsCount} />
          <Stat label="Reviews" value={reviewsCount} />
          <Stat label="Pending payments" value={pendingPayments.length} />
          <Stat label="Verified" value={providers.filter((p) => p.is_verified).length} />
          <Stat label="Revenue (KES)" value={Math.round(revenueCents / 100)} />
          <Stat label="Inactive" value={providers.filter((p) => !p.is_active).length} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Bookings</p>
              <p className="mt-1 font-serif text-xl">Last 7 days</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Total: {bookingsByDay.reduce((s, d) => s + d.count, 0)}
            </p>
          </div>
          <Sparkline data={bookingsByDay} />
        </div>

        <Tabs defaultValue="payments" className="mt-8">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="subs">Subscriptions</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="admins">Admins</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="mt-4 space-y-6">
            <div>
              <h2 className="font-medium">Pending</h2>
              {pendingPayments.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nothing waiting.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {pendingPayments.map((p) => {
                    const prov = providerById[p.provider_id];
                    return (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                        <div>
                          <p className="font-medium">{prov?.business_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.currency} {(p.amount_cents / 100).toLocaleString()} · {p.phone ?? "no phone"} · {new Date(p.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approvePayment(p)}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectPayment(p)}>
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div>
              <h2 className="font-medium">History</h2>
              {otherPayments.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {otherPayments.map((p) => {
                    const prov = providerById[p.provider_id];
                    return (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
                        <div>
                          <p className="font-medium">{prov?.business_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.currency} {(p.amount_cents / 100).toLocaleString()} · {new Date(p.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                          p.status === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>{p.status}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="providers" className="mt-4">
            <ul className="space-y-2">
              {providers.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                  <div>
                    <p className="font-medium">{p.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.location ?? "—"} · ★ {p.rating.toFixed(1)} ({p.reviews_count})
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/providers/$id" params={{ id: p.slug }}>
                        <ExternalLink className="mr-1 h-3.5 w-3.5" /> View
                      </Link>
                    </Button>
                    <Button size="sm" variant={p.is_verified ? "secondary" : "outline"} onClick={() => toggleVerified(p)}>
                      {p.is_verified ? "Verified" : "Verify"}
                    </Button>
                    <Button size="sm" variant={p.is_active ? "secondary" : "outline"} onClick={() => toggleActive(p)}>
                      {p.is_active ? "Active" : "Suspended"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setUserSuspended(p.user_id, true, p.business_name)}>
                      <Ban className="mr-1 h-3.5 w-3.5" /> Suspend owner
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteProvider(p.id, p.business_name)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            {customers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No customer accounts yet.</p>
            ) : (
              <ul className="space-y-2">
                {customers.map((c) => (
                  <li key={c.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                    <div>
                      <p className="font-medium">
                        {c.display_name || c.email}
                        {c.is_suspended && (
                          <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-800">
                            Suspended
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.email} · {c.phone ?? "no phone"} · {c.bookings_count} bookings · joined {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.is_suspended ? (
                        <Button size="sm" variant="outline" onClick={() => setUserSuspended(c.user_id, false, c.email)}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Unsuspend
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setUserSuspended(c.user_id, true, c.email)}>
                          <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => deleteUser(c.user_id, c.email)}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="subs" className="mt-4">
            <ul className="space-y-2">
              {subs.map((s) => {
                const prov = providerById[s.provider_id];
                return (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
                    <div>
                      <p className="font-medium">{prov?.business_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                      s.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
                    }`}>{s.status}</span>
                  </li>
                );
              })}
            </ul>
          </TabsContent>

          <TabsContent value="admins" className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-medium">Add admin</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Promote any signed-up user by email. Maximum 3 admins total ({admins.length}/3 used).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="flex-1 min-w-[14rem]"
                  disabled={adminBusy || admins.length >= 3}
                />
                <Button onClick={addAdmin} disabled={adminBusy || admins.length >= 3 || !newAdminEmail.trim()}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Promote to admin
                </Button>
              </div>
              {admins.length >= 3 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Limit reached. Remove an admin below to add another.
                </p>
              )}
            </div>

            <div>
              <h2 className="font-medium">Current admins</h2>
              {admins.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No admins yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {admins.map((a) => (
                    <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                      <div>
                        <p className="font-medium">{a.display_name || a.email}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeAdmin(a.user_id, a.email)}
                        disabled={adminBusy || admins.length <= 1}
                        title={admins.length <= 1 ? "Cannot remove the last admin" : "Remove admin"}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value.toLocaleString()}</p>
    </div>
  );
}

function Sparkline({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="mt-4 flex items-end gap-2">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
          <div
            className="w-full rounded-t-md bg-primary/80 transition-all"
            style={{ height: `${(d.count / max) * 96 + 4}px` }}
            title={`${d.day}: ${d.count}`}
          />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {d.day}
          </span>
          <span className="text-xs font-medium text-foreground">{d.count}</span>
        </div>
      ))}
    </div>
  );
}
