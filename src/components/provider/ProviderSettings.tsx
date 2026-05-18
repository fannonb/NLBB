import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type ProviderSettingsData = {
  business_name: string;
  about: string | null;
  phone: string | null;
  whatsapp: string | null;
  location: string | null;
  address: string | null;
  cover_image: string | null;
  is_active: boolean;
};

export function ProviderSettings({ providerId }: { providerId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [d, setD] = useState<ProviderSettingsData>({
    business_name: "",
    about: "",
    phone: "",
    whatsapp: "",
    location: "",
    address: "",
    cover_image: "",
    is_active: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("providers")
        .select("business_name,about,phone,whatsapp,location,address,cover_image,is_active")
        .eq("id", providerId)
        .maybeSingle();
      if (data) setD(data as ProviderSettingsData);
      setLoading(false);
    })();
  }, [providerId]);

  const set = <K extends keyof ProviderSettingsData>(k: K, v: ProviderSettingsData[K]) =>
    setD((prev) => ({ ...prev, [k]: v }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("providers")
      .update({
        business_name: d.business_name,
        about: d.about || null,
        phone: d.phone || null,
        whatsapp: d.whatsapp || null,
        location: d.location || null,
        address: d.address || null,
        cover_image: d.cover_image || null,
        is_active: d.is_active,
      })
      .eq("id", providerId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Business profile updated");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1.5">
        <Label htmlFor="bn">Business name</Label>
        <Input id="bn" required value={d.business_name} onChange={(e) => set("business_name", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ab">About</Label>
        <Textarea id="ab" rows={3} value={d.about ?? ""} onChange={(e) => set("about", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ph">Phone</Label>
          <Input id="ph" value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wa">WhatsApp</Label>
          <Input id="wa" value={d.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="loc">Location</Label>
        <Input id="loc" value={d.location ?? ""} onChange={(e) => set("location", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ad">Address</Label>
        <Input id="ad" value={d.address ?? ""} onChange={(e) => set("address", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ci">Cover image URL</Label>
        <Input id="ci" placeholder="https://…" value={d.cover_image ?? ""} onChange={(e) => set("cover_image", e.target.value)} />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={d.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <span>Listing is active and visible to customers</span>
      </label>
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save changes
      </Button>
    </form>
  );
}
