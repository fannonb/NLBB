import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type DayRow = {
  id?: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ProviderAvailability({ providerId }: { providerId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<DayRow[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("provider_availability")
        .select("id,day_of_week,open_time,close_time,is_closed")
        .eq("provider_id", providerId);
      const map = new Map<number, DayRow>();
      ((data as DayRow[]) ?? []).forEach((r) => map.set(r.day_of_week, r));
      const filled: DayRow[] = [];
      for (let d = 0; d < 7; d++) {
        filled.push(
          map.get(d) ?? {
            day_of_week: d,
            open_time: "09:00",
            close_time: "18:00",
            is_closed: d === 0,
          },
        );
      }
      setRows(filled);
      setLoading(false);
    })();
  }, [providerId]);

  const update = (idx: number, patch: Partial<DayRow>) =>
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    // Replace all rows for this provider
    await supabase.from("provider_availability").delete().eq("provider_id", providerId);
    const { error } = await supabase.from("provider_availability").insert(
      rows.map((r) => ({
        provider_id: providerId,
        day_of_week: r.day_of_week,
        open_time: r.is_closed ? null : r.open_time,
        close_time: r.is_closed ? null : r.close_time,
        is_closed: r.is_closed,
      })),
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Hours saved");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <h3 className="font-medium">Weekly hours</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Customers see these on your public page. Toggle "Closed" for off-days.
        </p>
      </div>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li
            key={r.day_of_week}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background p-3"
          >
            <span className="w-24 text-sm font-medium">{DAYS[r.day_of_week]}</span>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={r.is_closed}
                onChange={(e) => update(i, { is_closed: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Closed
            </label>
            <div className="ml-auto flex items-center gap-2">
              <Input
                type="time"
                value={r.open_time ?? "09:00"}
                disabled={r.is_closed}
                onChange={(e) => update(i, { open_time: e.target.value })}
                className="h-9 w-28"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                value={r.close_time ?? "18:00"}
                disabled={r.is_closed}
                onChange={(e) => update(i, { close_time: e.target.value })}
                className="h-9 w-28"
              />
            </div>
          </li>
        ))}
      </ul>
      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save hours
      </Button>
    </div>
  );
}
