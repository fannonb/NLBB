CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_id)
);
CREATE INDEX favorites_user_idx ON public.favorites(user_id);
CREATE INDEX favorites_provider_idx ON public.favorites(provider_id);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users add own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);
