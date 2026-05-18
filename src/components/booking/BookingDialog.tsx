import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getUserRole } from "@/lib/user-setup";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DbService = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  providerSlug: string;
  selectedServiceNames: string[];
  onBooked?: () => void;
};

const TIMES = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "13:00", "13:30", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30", "18:00",
];

export function BookingDialog({
  open,
  onOpenChange,
  providerSlug,
  selectedServiceNames,
  onBooked,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [services, setServices] = useState<DbService[]>([]);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserRole(user.id).then((r) => setRole(r));
  }, [user?.id]);
  const isProviderOrAdmin = role === "provider" || role === "admin";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: provider } = await supabase
        .from("providers")
        .select("id")
        .eq("slug", providerSlug)
        .maybeSingle();
      if (cancelled) return;
      if (!provider) {
        toast.error("Provider not found");
        return;
      }
      setProviderId(provider.id);
      const { data: svcs } = await supabase
        .from("services")
        .select("id,name,duration_minutes,price_cents,currency")
        .eq("provider_id", provider.id)
        .eq("is_active", true);
      if (!cancelled) setServices((svcs ?? []) as DbService[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, providerSlug]);

  const matchedServices = useMemo(
    () => services.filter((s) => selectedServiceNames.includes(s.name)),
    [services, selectedServiceNames]
  );

  const total = matchedServices.reduce((sum, s) => sum + s.price_cents, 0);
  const currency = matchedServices[0]?.currency ?? "KES";

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in to book");
      navigate({ to: "/auth/login" });
      return;
    }
    if (isProviderOrAdmin) {
      toast.error("Only customer accounts can book services");
      return;
    }
    if (!providerId) return;
    if (matchedServices.length === 0) {
      toast.error("No services selected");
      return;
    }
    setSubmitting(true);
    const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
    const rows = matchedServices.map((s) => ({
      customer_id: user.id,
      provider_id: providerId,
      service_id: s.id,
      scheduled_at,
      duration_minutes: s.duration_minutes,
      price_cents: s.price_cents,
      currency: s.currency,
      notes: notes || null,
      status: "pending" as const,
    }));
    const { error } = await supabase.from("bookings").insert(rows);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      matchedServices.length > 1
        ? `${matchedServices.length} booking requests sent`
        : "Booking request sent"
    );
    onOpenChange(false);
    onBooked?.();
    navigate({ to: "/bookings" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Book appointment</DialogTitle>
          <DialogDescription>
            Pick a date and time. The provider will confirm shortly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isProviderOrAdmin && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Only customer accounts can book services. Sign in with a customer account to book.
            </div>
          )}
          <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
            <p className="font-medium">
              {matchedServices.length}{" "}
              {matchedServices.length === 1 ? "service" : "services"}
            </p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              {matchedServices.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.name}</span>
                  <span>
                    {s.currency} {(s.price_cents / 100).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 font-medium">
              <span>Total</span>
              <span>
                {currency} {(total / 100).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <select
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Anything the provider should know?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !providerId || isProviderOrAdmin}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="mr-2 h-4 w-4" />
            )}
            Confirm booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
