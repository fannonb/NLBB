CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_id_unique ON public.reviews(booking_id);
CREATE OR REPLACE FUNCTION public.recompute_provider_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  pid uuid;
BEGIN
  pid := COALESCE(NEW.provider_id, OLD.provider_id);
  UPDATE public.providers p
  SET rating = COALESCE((SELECT AVG(rating)::numeric(3,2) FROM public.reviews WHERE provider_id = pid), 0),
      reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE provider_id = pid)
  WHERE p.id = pid;
  RETURN NULL;
END;
$function$;
DROP TRIGGER IF EXISTS reviews_recompute_rating ON public.reviews;
CREATE TRIGGER reviews_recompute_rating
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recompute_provider_rating();
