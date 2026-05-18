import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ensureRole } from "@/lib/user-setup";

export const Route = createFileRoute("/provider/onboarding")({
  head: () => ({ meta: [{ title: "List your business — NLBB" }] }),
  component: ProviderOnboardingPage,
});

type Category = { id: string; name: string; slug: string };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function ProviderOnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [about, setAbout] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id,name,slug")
      .order("sort_order")
      .then(({ data }) => {
        if (data) {
          setCategories(data as Category[]);
          if (data.length) setCategoryId(data[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth/login" });
  }, [authLoading, user, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    await ensureRole(user.id, "provider");

    let slug = slugify(businessName);
    if (!slug) slug = `provider-${user.id.slice(0, 8)}`;
    // ensure uniqueness
    const { data: existing } = await supabase.from("providers").select("slug").eq("slug", slug).maybeSingle();
    if (existing) slug = `${slug}-${user.id.slice(0, 6)}`;

    const { data: provider, error } = await supabase
      .from("providers")
      .insert({
        user_id: user.id,
        slug,
        business_name: businessName,
        phone: phone || null,
        whatsapp: whatsapp || null,
        location: location || null,
        address: address || null,
        about: about || null,
      })
      .select("id")
      .single();

    if (error || !provider) {
      setSubmitting(false);
      toast.error(error?.message ?? "Could not create business");
      return;
    }

    if (categoryId) {
      await supabase
        .from("provider_categories")
        .insert({ provider_id: provider.id, category_id: categoryId });
    }

    // Default Mon-Sat 09:00-18:00
    const hours = [1, 2, 3, 4, 5, 6].map((d) => ({
      provider_id: provider.id,
      day_of_week: d,
      open_time: "09:00",
      close_time: "18:00",
      is_closed: false,
    }));
    hours.push({
      provider_id: provider.id,
      day_of_week: 0,
      open_time: null as unknown as string,
      close_time: null as unknown as string,
      is_closed: true,
    });
    await supabase.from("provider_availability").insert(hours);

    toast.success("Business created — welcome!");
    navigate({ to: "/provider" });
  };

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <AuthLayout
      title="List your business"
      subtitle="A few details to set up your provider profile."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="biz">Business name</Label>
          <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat">Category</Label>
          <select
            id="cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa">WhatsApp</Label>
            <Input id="wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+254…" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc">Location (e.g. Westlands, Nairobi)</Label>
          <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr">Address</Label>
          <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="about">About your business</Label>
          <Textarea id="about" value={about} onChange={(e) => setAbout(e.target.value)} rows={3} />
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create business
        </Button>
      </form>
    </AuthLayout>
  );
}
