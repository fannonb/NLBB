INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-gallery', 'provider-gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Provider gallery is public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'provider-gallery');

CREATE POLICY "Providers upload own gallery"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'provider-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Providers update own gallery"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'provider-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Providers delete own gallery"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'provider-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );