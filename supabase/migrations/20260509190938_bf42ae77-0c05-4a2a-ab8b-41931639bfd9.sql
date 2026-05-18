CREATE POLICY "Owner creates own payment"
ON public.payments FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.providers p WHERE p.id = payments.provider_id AND p.user_id = auth.uid())
);

CREATE POLICY "Owner creates own subscription"
ON public.subscriptions FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.providers p WHERE p.id = subscriptions.provider_id AND p.user_id = auth.uid())
);