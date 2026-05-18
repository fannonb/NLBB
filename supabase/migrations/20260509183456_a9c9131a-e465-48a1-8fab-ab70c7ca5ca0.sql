-- ENUMS
CREATE TYPE public.app_role AS ENUM ('customer', 'provider', 'admin');
CREATE TYPE public.booking_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');
CREATE TYPE public.subscription_status AS ENUM ('inactive', 'active', 'expired', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed');
-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT, phone TEXT, avatar_url TEXT, location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
CREATE POLICY "Roles readable by signed-in users" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- AUTO PROFILE + ROLE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- CATEGORIES
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- PROVIDERS
CREATE TABLE public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  about TEXT, address TEXT, location TEXT,
  latitude NUMERIC, longitude NUMERIC,
  phone TEXT, whatsapp TEXT, cover_image TEXT,
  rating NUMERIC NOT NULL DEFAULT 0,
  reviews_count INT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER providers_updated_at BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- SUBSCRIPTIONS (created before the active-subscription helper)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'inactive',
  amount_cents INT NOT NULL DEFAULT 50000,
  currency TEXT NOT NULL DEFAULT 'KES',
  started_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.provider_has_active_subscription(_provider_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE provider_id = _provider_id AND status = 'active' AND (expires_at IS NULL OR expires_at > now())
  );
$$;
-- Provider policies
CREATE POLICY "Public can view active subscribed providers" ON public.providers FOR SELECT
  USING (is_active = true AND public.provider_has_active_subscription(id));
CREATE POLICY "Owner can view own provider" ON public.providers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all providers" ON public.providers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can insert own provider" ON public.providers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own provider" ON public.providers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin can update any provider" ON public.providers FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete provider" ON public.providers FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
-- Subscription policies
CREATE POLICY "Owner views own subscription" ON public.subscriptions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE POLICY "Admin views subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- PROVIDER <-> CATEGORIES
CREATE TABLE public.provider_categories (
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, category_id)
);
ALTER TABLE public.provider_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider categories viewable by everyone" ON public.provider_categories FOR SELECT USING (true);
CREATE POLICY "Owner manages own provider categories" ON public.provider_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
-- SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  price_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Owner manages own services" ON public.services FOR ALL
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- PROVIDER IMAGES
CREATE TABLE public.provider_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider images viewable by everyone" ON public.provider_images FOR SELECT USING (true);
CREATE POLICY "Owner manages own gallery" ON public.provider_images FOR ALL
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
-- AVAILABILITY
CREATE TABLE public.provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME, close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (provider_id, day_of_week)
);
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Availability viewable by everyone" ON public.provider_availability FOR SELECT USING (true);
CREATE POLICY "Owner manages availability" ON public.provider_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  price_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  notes TEXT,
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer sees own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Provider sees bookings for them" ON public.bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE POLICY "Admin sees all bookings" ON public.bookings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customer creates own booking" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer updates own booking" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Provider updates incoming booking" ON public.bookings FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customer writes own review" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer updates own review" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Customer deletes own review" ON public.reviews FOR DELETE USING (auth.uid() = customer_id);
-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  status payment_status NOT NULL DEFAULT 'pending',
  mpesa_receipt TEXT, phone TEXT, raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views own payments" ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.providers p WHERE p.id = provider_id AND p.user_id = auth.uid()));
CREATE POLICY "Admin views payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin manages payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT, link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
-- SEED CATEGORIES
INSERT INTO public.categories (slug, name, description, icon, sort_order) VALUES
  ('salons', 'Salons', 'Hair styling, treatments and full salon services', 'scissors', 1),
  ('barbers', 'Barbers', 'Cuts, fades, beard trims and grooming', 'scissors', 2),
  ('nails', 'Nail Parlors', 'Manicures, pedicures, gels and nail art', 'sparkles', 3),
  ('massage', 'Massage', 'Relaxation, deep tissue and wellness massage', 'hand', 4),
  ('tattoo', 'Tattoo Artists', 'Custom designs, cover-ups and piercings', 'pen-tool', 5);
-- INDEXES
CREATE INDEX idx_providers_active ON public.providers(is_active);
CREATE INDEX idx_provider_categories_cat ON public.provider_categories(category_id);
CREATE INDEX idx_services_provider ON public.services(provider_id);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX idx_bookings_provider ON public.bookings(provider_id);
CREATE INDEX idx_subscriptions_provider ON public.subscriptions(provider_id);
CREATE INDEX idx_payments_provider ON public.payments(provider_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
