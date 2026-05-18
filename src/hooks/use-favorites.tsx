import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useFavorites() {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select("provider_id")
      .eq("user_id", user.id);
    setIds(new Set((data ?? []).map((r) => r.provider_id)));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (providerId: string) => {
      if (!user) return { ok: false, reason: "auth" as const };
      const isFav = ids.has(providerId);
      // optimistic
      setIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(providerId);
        else next.add(providerId);
        return next;
      });
      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("provider_id", providerId);
        if (error) {
          setIds((prev) => new Set(prev).add(providerId));
          return { ok: false, reason: "error" as const };
        }
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, provider_id: providerId });
        if (error) {
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(providerId);
            return next;
          });
          return { ok: false, reason: "error" as const };
        }
      }
      return { ok: true as const, saved: !isFav };
    },
    [ids, user?.id],
  );

  return { ids, loading, toggle, refresh, isFavorite: (id: string) => ids.has(id) };
}
