
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_booking ON public.messages(booking_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_can_access_booking(_booking_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.providers p ON p.id = b.provider_id
    WHERE b.id = _booking_id
      AND (b.customer_id = auth.uid() OR p.user_id = auth.uid())
  );
$$;

CREATE POLICY "Participants read messages"
  ON public.messages FOR SELECT
  USING (public.user_can_access_booking(booking_id));

CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.user_can_access_booking(booking_id)
  );

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer uuid;
  provider_user uuid;
  recipient uuid;
BEGIN
  SELECT b.customer_id, p.user_id INTO customer, provider_user
  FROM public.bookings b
  LEFT JOIN public.providers p ON p.id = b.provider_id
  WHERE b.id = NEW.booking_id;

  recipient := CASE WHEN NEW.sender_id = customer THEN provider_user ELSE customer END;
  IF recipient IS NOT NULL AND recipient <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (recipient, 'New message', LEFT(NEW.body, 80), '/bookings');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_notify
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;
