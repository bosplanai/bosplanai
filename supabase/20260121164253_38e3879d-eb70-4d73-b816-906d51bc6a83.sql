-- Create a table to store VA pricing configuration
CREATE TABLE IF NOT EXISTS public.va_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hours_package INTEGER NOT NULL UNIQUE CHECK (hours_package IN (40, 80, 160)),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stripe_price_id TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default pricing values only if table is empty
INSERT INTO public.va_pricing (hours_package, price_cents, stripe_price_id)
SELECT 40, 24900, 'price_1Ss2bpJEkOphh5Y7XfGbdnOR'
WHERE NOT EXISTS (SELECT 1 FROM public.va_pricing WHERE hours_package = 40);

INSERT INTO public.va_pricing (hours_package, price_cents, stripe_price_id)
SELECT 80, 49900, 'price_1Ss2cHJEkOphh5Y7BJhhlKHP'
WHERE NOT EXISTS (SELECT 1 FROM public.va_pricing WHERE hours_package = 80);

INSERT INTO public.va_pricing (hours_package, price_cents, stripe_price_id)
SELECT 160, 74900, 'price_1Ss2cmJEkOphh5Y7hV2sFhUb'
WHERE NOT EXISTS (SELECT 1 FROM public.va_pricing WHERE hours_package = 160);

-- Enable RLS
ALTER TABLE public.va_pricing ENABLE ROW LEVEL SECURITY;

-- Anyone can view VA pricing (for display on product cards)
DROP POLICY IF EXISTS "Anyone can view VA pricing" ON public.va_pricing;
CREATE POLICY "Anyone can view VA pricing" 
ON public.va_pricing 
FOR SELECT 
USING (true);

-- Only super admins can update pricing
DROP POLICY IF EXISTS "Super admins can update VA pricing" ON public.va_pricing;
CREATE POLICY "Super admins can update VA pricing" 
ON public.va_pricing 
FOR UPDATE 
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_va_pricing_updated_at ON public.va_pricing;
CREATE TRIGGER update_va_pricing_updated_at
BEFORE UPDATE ON public.va_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();