-- Notify users and admins for key lifecycle actions:
-- 1) account signup
-- 2) provider onboarding
-- 3) payment submissions + status decisions

CREATE OR REPLACE FUNCTION public.notify_new_account_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _display_name text;
  _intended_role text;
BEGIN
  _display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'New user'
  );
  _intended_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'intended_role', ''), 'customer');

  -- Welcome notification for the new account itself.
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (
    NEW.id,
    'Welcome to NLBB',
    'Your account is ready. Discover providers and book your first appointment.',
    '/dashboard'
  );

  -- Admin visibility for each new signup.
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT
    ur.user_id,
    'New user signup',
    _display_name || ' joined as ' || _intended_role || COALESCE(' (' || NEW.email || ')', ''),
    '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role
    AND ur.user_id <> NEW.id
    AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ur.user_id);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS zz_auth_users_notify_signup ON auth.users;
CREATE TRIGGER zz_auth_users_notify_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.notify_new_account_signup();

CREATE OR REPLACE FUNCTION public.notify_provider_onboarded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify provider owner.
  IF NEW.user_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    INSERT INTO public.notifications (user_id, title, body, link)
    VALUES (
      NEW.user_id,
      'Business profile created',
      'Your provider profile for "' || NEW.business_name || '" is live. Complete setup and activate subscription to appear in search.',
      '/provider'
    );
  END IF;

  -- Notify admins for verification/onboarding review.
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT
    ur.user_id,
    'New provider registration',
    NEW.business_name || COALESCE(' (' || NEW.location || ')', '') || ' submitted onboarding details.',
    '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin'::public.app_role
    AND ur.user_id <> NEW.user_id
    AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ur.user_id);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS providers_notify_onboarded ON public.providers;
CREATE TRIGGER providers_notify_onboarded
AFTER INSERT ON public.providers
FOR EACH ROW EXECUTE FUNCTION public.notify_provider_onboarded();

CREATE OR REPLACE FUNCTION public.notify_payment_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _provider_user uuid;
  _business_name text;
  _amount_text text;
BEGIN
  SELECT p.user_id, p.business_name
    INTO _provider_user, _business_name
  FROM public.providers p
  WHERE p.id = NEW.provider_id;

  _amount_text := NEW.currency || ' ' || to_char((NEW.amount_cents::numeric / 100), 'FM999,999,990.00');

  IF TG_OP = 'INSERT' THEN
    -- Provider confirmation that the payment request was logged.
    IF _provider_user IS NOT NULL
       AND EXISTS (SELECT 1 FROM auth.users WHERE id = _provider_user) THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (
        _provider_user,
        'Payment submitted',
        'We received your payment request (' || _amount_text || '). An admin will review it shortly.',
        '/provider/subscription'
      );
    END IF;

    -- Admin alert for incoming payment.
    INSERT INTO public.notifications (user_id, title, body, link)
    SELECT
      ur.user_id,
      'New subscription payment',
      COALESCE(_business_name, 'A provider') || ' submitted ' || _amount_text || '.',
      '/admin'
    FROM public.user_roles ur
    WHERE ur.role = 'admin'::public.app_role
      AND ur.user_id <> _provider_user
      AND EXISTS (SELECT 1 FROM auth.users au WHERE au.id = ur.user_id);

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    -- Provider alert after admin approves/rejects.
    IF _provider_user IS NOT NULL
       AND EXISTS (SELECT 1 FROM auth.users WHERE id = _provider_user) THEN
      INSERT INTO public.notifications (user_id, title, body, link)
      VALUES (
        _provider_user,
        CASE NEW.status::text
          WHEN 'success' THEN 'Payment approved'
          WHEN 'failed' THEN 'Payment declined'
          ELSE 'Payment status updated'
        END,
        CASE NEW.status::text
          WHEN 'success' THEN 'Your payment (' || _amount_text || ') was approved and your subscription is active.'
          WHEN 'failed' THEN 'Your payment (' || _amount_text || ') was marked failed. Please retry or contact support.'
          ELSE 'Payment status changed to ' || NEW.status::text || ' for ' || _amount_text || '.'
        END,
        '/provider/subscription'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS payments_notify_activity ON public.payments;
CREATE TRIGGER payments_notify_activity
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_activity();
