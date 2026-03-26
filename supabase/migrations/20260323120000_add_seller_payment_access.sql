-- Add policy for sellers to view payments for their orders
CREATE POLICY "Sellers can view payments for their orders" ON public.payments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders o
  JOIN public.order_items oi ON o.id = oi.order_id
  JOIN public.plants p ON oi.plant_id = p.id
  WHERE payments.order_id = o.id AND p.seller_id = auth.uid()
));

-- Add policy for sellers to update payment status for their orders
CREATE POLICY "Sellers can update payment status for their orders" ON public.payments FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.orders o
  JOIN public.order_items oi ON o.id = oi.order_id
  JOIN public.plants p ON oi.plant_id = p.id
  WHERE payments.order_id = o.id AND p.seller_id = auth.uid()
));