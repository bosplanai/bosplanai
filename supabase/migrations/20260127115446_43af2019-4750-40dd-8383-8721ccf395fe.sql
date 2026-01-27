-- Insert default VA pricing packages
INSERT INTO public.va_pricing (hours_package, price_cents, stripe_price_id, is_active)
VALUES 
  (40, 39900, 'price_va_40_hours', true),
  (80, 69900, 'price_va_80_hours', true),
  (160, 119900, 'price_va_160_hours', true)
ON CONFLICT DO NOTHING;