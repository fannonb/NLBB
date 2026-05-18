import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type GalleryImage = { id: string; url: string; sort_order: number };

export function ProviderGallery({
  providerId,
  userId,
}: {
  providerId: string;
  userId: string;
}) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("provider_images")
      .select("id,url,sort_order")
      .eq("provider_id", providerId)
      .order("sort_order", { ascending: true });
    setImages((data as GalleryImage[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let succeeded = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is over 5MB`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/${providerId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("provider-gallery")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast.error(upErr.message);
        continue;
      }
      const { data: pub } = supabase.storage.from("provider-gallery").getPublicUrl(path);
      const { error: insErr } = await supabase.from("provider_images").insert({
        provider_id: providerId,
        url: pub.publicUrl,
        sort_order: images.length + succeeded,
      });
      if (insErr) {
        toast.error(insErr.message);
        continue;
      }
      succeeded++;
    }
    if (succeeded > 0) toast.success(`Uploaded ${succeeded} image${succeeded > 1 ? "s" : ""}`);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const remove = async (img: GalleryImage) => {
    // Extract storage path from public URL
    const marker = "/provider-gallery/";
    const idx = img.url.indexOf(marker);
    if (idx >= 0) {
      const path = img.url.substring(idx + marker.length);
      await supabase.storage.from("provider-gallery").remove([path]);
    }
    await supabase.from("provider_images").delete().eq("id", img.id);
    toast.success("Removed");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Add portfolio photos</p>
        <p className="mt-1 text-xs text-muted-foreground">
          JPG or PNG, up to 5MB each. Customers see these on your profile.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          className="mt-4"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <ImagePlus className="mr-2 h-4 w-4" /> Choose images
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : images.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No photos yet. Showcase your best work above.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary/40"
            >
              <img
                src={img.url}
                alt="Portfolio"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(img)}
                aria-label="Remove image"
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-background/90 text-destructive opacity-0 backdrop-blur transition group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
