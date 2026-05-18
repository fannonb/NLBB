
-- Allow the trigger functions to insert notifications (the table currently blocks all inserts via RLS).
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Notify the provider when a new booking lands.
CREATE OR REPLACE FUNCTION public.notify_provider_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_user uuid;
BEGIN
  SELECT user_id INTO provider_user FROM public.providers WHERE id = NEW.provider_id;
  IF provider_user IS NOT NULL THEN
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
$$;

DROP TRIGGER IF EXISTS bookings_notify_provider ON public.bookings;
CREATE TRIGGER bookings_notify_provider
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_provider_new_booking();

-- Notify the customer when booking status changes.
CREATE OR REPLACE FUNCTION public.notify_customer_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (NEW.customer_id, msg, 'Scheduled for ' || to_char(NEW.scheduled_at, 'Mon DD, HH24:MI'), '/bookings');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_notify_customer ON public.bookings;
CREATE TRIGGER bookings_notify_customer
AFTER UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_customer_status_change();

-- Stream notifications live.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
