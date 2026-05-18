import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Clock, Loader2, MapPin, Star, X } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { ReviewDialog } from "@/components/reviews/ReviewDialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "My bookings — NLBB" },
      {
        name: "description",
        content: "Track your upcoming and past beauty appointments in one place.",
      },
    ],
  }),
  component: BookingsPage,
});

type BookingRow = {
  id: string;
  scheduled_at: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled";
  duration_minutes: number;
  price_cents: number;
  currency: string;
  notes: string | null;
  provider_id: string;
  provider: { business_name: string; slug: string; location: string | null } | null;
  service: { name: string } | null;
};

const statusStyles: Record<BookingRow["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  completed: "bg-secondary text-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [reviewing, setReviewing] = useState<BookingRow | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id,scheduled_at,status,duration_minutes,price_cents,currency,notes,provider_id,provider:providers(business_name,slug,location),service:services(name)"
      )
      .eq("customer_id", user.id)
      .order("scheduled_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (data as unknown as BookingRow[]) ?? [];
    setBookings(list);
    const ids = list.filter((b) => b.status === "completed").map((b) => b.id);
    if (ids.length) {
      const { data: revs } = await supabase
        .from("reviews")
        .select("booking_id")
        .in("booking_id", ids);
      setReviewedIds(new Set((revs ?? []).map((r) => r.booking_id as string)));
    } else {
      setReviewedIds(new Set());
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user?.id]);

  // Realtime: refresh whenever any booking row for me changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`customer-bookings:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `customer_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Booking cancelled");
    load();
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
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="font-serif text-3xl sm:text-4xl">My bookings</h1>
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 font-serif text-xl">Sign in to view bookings</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Track upcoming and past appointments after signing in.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/auth/login">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/explore">Browse providers</Link>
              </Button>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl">My bookings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your upcoming and past appointments
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/explore">Book another</Link>
          </Button>
        </div>

        {loading && !bookings ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !bookings || bookings.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-accent" />
            <h2 className="mt-4 font-serif text-xl">No bookings yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse providers and book your first appointment.
            </p>
            <Button asChild className="mt-6">
              <Link to="/explore">Find a provider</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {bookings.map((b) => {
              const dt = new Date(b.scheduled_at);
              const canCancel = b.status === "pending" || b.status === "accepted";
              return (
                <li
                  key={b.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusStyles[b.status]}`}
                        >
                          {b.status}
                        </span>
                        {b.provider?.slug && (
                          <Link
                            to="/providers/$id"
                            params={{ id: b.provider.slug }}
                            className="font-medium hover:text-primary"
                          >
                            {b.provider.business_name}
                          </Link>
                        )}
                      </div>
                      <p className="mt-1 text-sm">{b.service?.name}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {dt.toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {dt.toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {b.duration_minutes} min
                        </span>
                        {b.provider?.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {b.provider.location}
                          </span>
                        )}
                      </div>
                      {b.notes && (
                        <p className="mt-2 text-xs italic text-muted-foreground">
                          “{b.notes}”
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-accent">
                        {b.currency} {(b.price_cents / 100).toLocaleString()}
                      </p>
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-muted-foreground hover:text-destructive"
                          onClick={() => cancel(b.id)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                      {b.status === "completed" && !reviewedIds.has(b.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => setReviewing(b)}
                        >
                          <Star className="mr-1 h-3.5 w-3.5" /> Review
                        </Button>
                      )}
                      {b.status === "completed" && reviewedIds.has(b.id) && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-primary text-primary" /> Reviewed
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {reviewing && (
        <ReviewDialog
          open={!!reviewing}
          onOpenChange={(v) => !v && setReviewing(null)}
          bookingId={reviewing.id}
          providerId={reviewing.provider_id}
          providerName={reviewing.provider?.business_name ?? "Provider"}
          onSubmitted={load}
        />
      )}
    </PageShell>
  );
}
