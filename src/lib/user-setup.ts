import { supabase } from "@/integrations/supabase/client";

export type AppRole = "customer" | "provider" | "admin";

const PENDING_ROLE_KEY = "lustre.pendingRole";
const PENDING_NAME_KEY = "lustre.pendingName";

export function setPendingRole(role: AppRole, name?: string) {
  try {
    localStorage.setItem(PENDING_ROLE_KEY, role);
    if (name) localStorage.setItem(PENDING_NAME_KEY, name);
  } catch {}
}

export function consumePendingRole(): { role: AppRole | null; name: string | null } {
  try {
    const role = (localStorage.getItem(PENDING_ROLE_KEY) as AppRole | null) ?? null;
    const name = localStorage.getItem(PENDING_NAME_KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
    localStorage.removeItem(PENDING_NAME_KEY);
    return { role, name };
  } catch {
    return { role: null, name: null };
  }
}

export async function getUserRole(userId: string): Promise<AppRole | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: true });
  if (!data || data.length === 0) return null;
  // Prefer provider/admin over customer
  const roles = data.map((r) => r.role as AppRole);
  if (roles.includes("admin")) return "admin";
  if (roles.includes("provider")) return "provider";
  return roles[0] ?? null;
}

export async function ensureRole(userId: string, role: AppRole) {
  await supabase.from("user_roles").upsert(
    { user_id: userId, role },
    { onConflict: "user_id,role", ignoreDuplicates: true },
  );
}

export async function userHasProviderRecord(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from("providers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

/** Routes user to the right place after auth, given any pending intent. */
export async function resolvePostAuthDestination(userId: string): Promise<string> {
  const pending = consumePendingRole();
  if (pending.role) await ensureRole(userId, pending.role);
  if (pending.name) {
    await supabase.from("profiles").update({ display_name: pending.name }).eq("user_id", userId);
  }

  const role = pending.role ?? (await getUserRole(userId));
  if (role === "provider") {
    const has = await userHasProviderRecord(userId);
    return has ? "/provider" : "/provider/onboarding";
  }
  return "/";
}
