import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Loader2, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/provider/subscription")({
  head: () => ({ meta: [{ title: "Subscription — Lustre" }] }),
  component: SubscriptionPage,
});

const PRICE_KES = 500;
const PAYBILL = "247247";
const ACCOUNT_PREFIX = "LUSTRE";

type Sub = { id: string; status: string; expires_at: string | null; started_at: string | null };
type Payment = {
  id: string; amount_cents: number; currency: string; status: string;
  phone: string | null; mpesa_receipt: string | null; created_at: string;
};

function SubscriptionPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerSlug, setProviderSlug] = useState<string>("");
  const [sub, setSub] = useState<Sub | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/login" });
  }, [authLoading, user, navigate]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: p } = await supabase
      .from("providers")
      .select("id,slug")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!p) {
      navigate({ to: "/provider/onboarding" });
      return;
    }
    setProviderId(p.id);
    setProviderSlug(p.slug);
    const [{ data: s }, { data: pays }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id,status,expires_at,started_at")
        .eq("provider_id", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("id,amount_cents,currency,status,phone,mpesa_receipt,created_at")
        .eq("provider_id", p.id)
        .order("created_at", { ascending: false }),
    ]);
    setSub((s as Sub) ?? null);
    setPayments((pays as Payment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const requestPayment = async () => {
    if (!providerId) return;
    if (!phone.match(/^\+?\d{9,15}$/)) {
      toast.error("Enter a valid phone number");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("payments").insert({
      provider_id: providerId,
      amount_cents: PRICE_KES * 100,
      currency: "KES",
      status: "pending",
      phone,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Payment request submitted — pay via M-Pesa to activate");
    setPhone("");
    load();
  };

  if (authLoading || loading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    );
  }

  const isActive = sub?.status === "active" && (!sub.expires_at || new Date(sub.expires_at) > new Date());

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Provider</p>
        <h1 className="font-serif text-3xl">Subscription</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your business stays visible to customers while your subscription is active.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
              <p className="mt-1 flex items-center gap-2 font-serif text-2xl">
                {isActive ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Active
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-rose-600" /> Inactive
                  </>
                )}
              </p>
              {sub?.expires_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {isActive ? "Renews" : "Expired"}: {new Date(sub.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Plan</p>
              <p className="font-serif text-2xl">KES {PRICE_KES}</p>
              <p className="text-xs text-muted-foreground">per month</p>
            </div>
          </div>
        </div>

        {!isActive && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-medium">Pay via M-Pesa</h2>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Go to M-Pesa → Lipa na M-Pesa → Pay Bill</li>
              <li>2. Business no.: <span className="font-mono text-foreground">{PAYBILL}</span></li>
              <li>3. Account no.: <span className="font-mono text-foreground">{ACCOUNT_PREFIX}-{providerSlug}</span></li>
              <li>4. Amount: <span className="font-mono text-foreground">KES {PRICE_KES}</span></li>
              <li>5. Enter the phone you paid from below and submit. We'll activate within minutes.</li>
            </ol>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="ph">M-Pesa phone</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="ph" placeholder="+2547…" className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
              <Button onClick={requestPayment} disabled={submitting} className="self-end">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                I have paid
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-medium">Payment history</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm">
                  <div>
                    <p className="font-medium">{p.currency} {(p.amount_cents / 100).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()} {p.phone ? `· ${p.phone}` : ""}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                    p.status === "success" ? "bg-emerald-100 text-emerald-800" :
                    p.status === "pending" ? "bg-amber-100 text-amber-800" :
                    "bg-rose-100 text-rose-800"
                  }`}>
                    {p.status === "pending" ? <Clock className="h-3 w-3" /> : null}
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 text-sm">
          <Link to="/provider" className="text-primary hover:underline">← Back to dashboard</Link>
        </div>
      </section>
    </PageShell>
  );
}
