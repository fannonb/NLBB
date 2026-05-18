-- Allow the known bootstrap admin account to promote itself on first sign-in.
CREATE OR REPLACE FUNCTION public.bootstrap_admin_self()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_email text;
BEGIN
  SELECT lower(email)
    INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF current_user_email IS DISTINCT FROM 'wiztechintegratedsystems@gmail.com' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authorized');
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin_self() TO authenticated;
