-- Create table to track organization storage purchases
CREATE TABLE public.organization_storage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  additional_storage_gb INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Create table to track individual storage purchases
CREATE TABLE public.storage_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  price_id TEXT NOT NULL,
  storage_gb INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for organization_storage
CREATE POLICY "Users can view their organization's storage"
ON public.organization_storage
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = organization_storage.organization_id
  )
);

CREATE POLICY "Admins can update organization storage"
ON public.organization_storage
FOR ALL
USING (
  public.has_role(auth.uid(), organization_id, 'admin')
);

-- Policies for storage_purchases
CREATE POLICY "Users can view their organization's purchases"
ON public.storage_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = storage_purchases.organization_id
  )
);

CREATE POLICY "Users can insert their own purchases"
ON public.storage_purchases
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_organization_storage_updated_at
BEFORE UPDATE ON public.organization_storage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_storage_purchases_updated_at
BEFORE UPDATE ON public.storage_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();