-- Admin dashboard booking feed.
CREATE OR REPLACE FUNCTION public.list_bookings()
RETURNS TABLE(
  id uuid,
  status booking_status,
  scheduled_at timestamptz,
  duration_minutes int,
  price_cents int,
  currency text,
  notes text,
  created_at timestamptz,
  customer_name text,
  customer_email text,
  customer_phone text,
  provider_name text,
  service_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    b.id,
    b.status,
    b.scheduled_at,
    b.duration_minutes,
    b.price_cents,
    b.currency,
    b.notes,
    b.created_at,
    COALESCE(p.display_name, split_part(u.email, '@', 1)) AS customer_name,
    u.email::text AS customer_email,
    p.phone::text AS customer_phone,
    pr.business_name AS provider_name,
    s.name AS service_name
  FROM public.bookings b
  JOIN auth.users u ON u.id = b.customer_id
  LEFT JOIN public.profiles p ON p.user_id = b.customer_id
  JOIN public.providers pr ON pr.id = b.provider_id
  LEFT JOIN public.services s ON s.id = b.service_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY b.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.list_bookings() TO authenticated;
