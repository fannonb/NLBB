import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type PaymentRow = {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  phone: string | null;
  mpesa_receipt: string | null;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  started_at: string | null;
  expires_at: string | null;
};

const statusStyles: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-rose-100 text-rose-800",
  refunded: "bg-secondary text-foreground",
};

export function ProviderPayments({ providerId }: { providerId: string }) {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [sub, setSub] = useState<SubscriptionRow | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: pays }, { data: subs }] = await Promise.all([
        supabase
          .from("payments")
          .select("id,amount_cents,currency,status,phone,mpesa_receipt,created_at")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("id,status,amount_cents,currency,started_at,expires_at")
          .eq("provider_id", providerId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setPayments((pays as PaymentRow[]) ?? []);
      setSub(((subs as SubscriptionRow[]) ?? [])[0] ?? null);
      setLoading(false);
    })();
  }, [providerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Subscription</p>
            <p className="mt-1 font-serif text-xl">
              {sub ? `${sub.currency} ${(sub.amount_cents / 100).toLocaleString()} / year` : "No subscription"}
            </p>
            {sub?.expires_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                {sub.status === "active" ? "Renews" : "Expired"} on{" "}
                {new Date(sub.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {sub && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                sub.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"
              }`}>
                {sub.status}
              </span>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/provider/subscription">
                <CreditCard className="mr-1 h-3.5 w-3.5" />
                {sub?.status === "active" ? "Manage" : "Activate"}
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Payment history</h3>
        {payments.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No payments yet. Activate your subscription to go live.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium">
                    {p.currency} {(p.amount_cents / 100).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                    {p.phone && ` · ${p.phone}`}
                    {p.mpesa_receipt && ` · ${p.mpesa_receipt}`}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                  statusStyles[p.status] ?? "bg-secondary text-foreground"
                }`}>
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
