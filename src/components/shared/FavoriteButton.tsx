import { Heart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type Props = {
  providerId: string;
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteButton({ providerId, className, size = "sm" }: Props) {
  const { user } = useAuth();
  const { isFavorite, toggle } = useFavorites();
  const navigate = useNavigate();
  const fav = isFavorite(providerId);
  const dim = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const icon = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <button
      type="button"
      aria-label={fav ? "Remove from saved" : "Save provider"}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
          toast("Sign in to save providers");
          navigate({ to: "/auth/login" });
          return;
        }
        const res = await toggle(providerId);
        if (res.ok) {
          toast(res.saved ? "Saved" : "Removed from saved");
        } else if (res.reason === "error") {
          toast.error("Couldn't update saved providers");
        }
      }}
      className={cn(
        "inline-grid place-items-center rounded-full bg-background/90 backdrop-blur transition hover:scale-105",
        dim,
        className,
      )}
    >
      <Heart
        className={cn(
          icon,
          fav ? "fill-accent text-accent" : "text-muted-foreground",
        )}
      />
    </button>
  );
}
