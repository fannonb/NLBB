import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_id: string;
};

type ProfileLite = { user_id: string; display_name: string | null };

export function ReviewsList({ providerId }: { providerId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id,rating,comment,created_at,customer_id")
        .eq("provider_id", providerId)
        .order("created_at", { ascending: false });
      const list = (data as Review[]) ?? [];
      setReviews(list);
      const ids = Array.from(new Set(list.map((r) => r.customer_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id,display_name")
          .in("user_id", ids);
        setProfiles(
          Object.fromEntries(
            ((profs as ProfileLite[]) ?? []).map((p) => [p.user_id, p.display_name ?? "Customer"])
          )
        );
      }
    })();
  }, [providerId]);

  if (reviews === null) return null;
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet — be the first.</p>;
  }

  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">{profiles[r.customer_id] ?? "Customer"}</p>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-3.5 w-3.5 ${n <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              ))}
            </div>
          </div>
          {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(r.created_at).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
