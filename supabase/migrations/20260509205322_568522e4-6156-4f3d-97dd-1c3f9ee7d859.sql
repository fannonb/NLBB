-- Bootstrap first admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'wiztechintegratedsystems@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
-- Promote by email (admin only, max 3 admins)
CREATE OR REPLACE FUNCTION public.promote_admin_by_email(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target uuid;
  current_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF target IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No account found with that email. Ask them to sign up first.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target AND role = 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That user is already an admin');
  END IF;

  SELECT COUNT(*) INTO current_count FROM public.user_roles WHERE role = 'admin';
  IF current_count >= 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Maximum of 3 admins reached. Remove one first.');
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (target, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'user_id', target);
END;
$$;
-- Revoke admin (admin only, keep at least 1)
CREATE OR REPLACE FUNCTION public.revoke_admin(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  SELECT COUNT(*) INTO current_count FROM public.user_roles WHERE role = 'admin';
  IF current_count <= 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cannot remove the last admin');
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target AND role = 'admin';
  RETURN jsonb_build_object('ok', true);
END;
$$;
-- List admins with email + display name (admin only)
CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(user_id uuid, email text, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT ur.user_id, u.email::text, p.display_name
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'admin'
    ORDER BY u.email;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.promote_admin_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_admins() FROM anon;
