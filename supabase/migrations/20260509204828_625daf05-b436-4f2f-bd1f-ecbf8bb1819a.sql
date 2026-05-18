CREATE OR REPLACE FUNCTION public.notify_provider_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  provider_user uuid;
BEGIN
  SELECT user_id INTO provider_user FROM public.providers WHERE id = NEW.provider_id;
  IF provider_user IS NOT NULL
     AND EXISTS (SELECT 1 FROM auth.users WHERE id = provider_user) THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      provider_user,
      'New booking request',
      'You have a new booking on ' || to_char(NEW.scheduled_at, 'Mon DD, HH24:MI'),
      '/provider'
    );
  END IF;
  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.notify_customer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  msg text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  msg := CASE NEW.status::text
    WHEN 'confirmed' THEN 'Your booking was accepted'
    WHEN 'rejected' THEN 'Your booking was declined'
    WHEN 'completed' THEN 'Your booking is marked complete'
    WHEN 'cancelled' THEN 'Your booking was cancelled'
    ELSE 'Your booking status changed to ' || NEW.status::text
  END;
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.customer_id) THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (NEW.customer_id, msg, 'Scheduled for ' || to_char(NEW.scheduled_at, 'Mon DD, HH24:MI'), '/bookings');
  END IF;
  RETURN NEW;
END;
$function$;
