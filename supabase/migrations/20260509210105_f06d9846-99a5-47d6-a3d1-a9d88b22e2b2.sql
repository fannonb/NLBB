-- List customers (anyone with the 'customer' role) with basic info
CREATE OR REPLACE FUNCTION public.list_customers()
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  phone text,
  created_at timestamptz,
  is_suspended boolean,
  bookings_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN; END IF;
  RETURN QUERY
    SELECT
      ur.user_id,
      u.email::text,
      p.display_name,
      p.phone,
      u.created_at,
      (u.banned_until IS NOT NULL AND u.banned_until > now()) AS is_suspended,
      (SELECT COUNT(*) FROM public.bookings b WHERE b.customer_id = ur.user_id) AS bookings_count
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'customer'
    ORDER BY u.created_at DESC;
END;
$$;
-- Suspend / unsuspend any user (set banned_until far future or null)
CREATE OR REPLACE FUNCTION public.admin_set_user_suspended(_target uuid, _suspended boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF _target = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot suspend your own account');
  END IF;
  IF _suspended THEN
    UPDATE auth.users SET banned_until = 'infinity'::timestamptz WHERE id = _target;
  ELSE
    UPDATE auth.users SET banned_until = NULL WHERE id = _target;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
-- Delete a user account entirely
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  IF _target = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot delete your own account');
  END IF;
  -- Cleanup app data
  DELETE FROM public.notifications WHERE user_id = _target;
  DELETE FROM public.favorites WHERE user_id = _target;
  DELETE FROM public.bookings WHERE customer_id = _target;
  DELETE FROM public.reviews WHERE customer_id = _target;
  DELETE FROM public.profiles WHERE user_id = _target;
  DELETE FROM public.user_roles WHERE user_id = _target;
  -- Provider-owned data
  DELETE FROM public.providers WHERE user_id = _target;
  DELETE FROM auth.users WHERE id = _target;
  RETURN jsonb_build_object('ok', true);
END;
$$;
-- Admin delete a single provider business
CREATE OR REPLACE FUNCTION public.admin_delete_provider(_provider uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;
  DELETE FROM public.providers WHERE id = _provider;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.list_customers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_suspended(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_provider(uuid) FROM anon;
