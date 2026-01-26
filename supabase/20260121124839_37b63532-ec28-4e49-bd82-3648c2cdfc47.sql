-- Create table to track organization data room storage
CREATE TABLE public.organization_dataroom_storage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  additional_storage_gb INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Create table to track individual data room storage purchases
CREATE TABLE public.dataroom_storage_purchases (
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
ALTER TABLE public.organization_dataroom_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataroom_storage_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for organization_dataroom_storage
CREATE POLICY "Users can view their organization's dataroom storage"
ON public.organization_dataroom_storage
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = organization_dataroom_storage.organization_id
  )
);

CREATE POLICY "Admins can update organization dataroom storage"
ON public.organization_dataroom_storage
FOR ALL
USING (
  public.has_role(auth.uid(), organization_id, 'admin')
);

-- Policies for dataroom_storage_purchases
CREATE POLICY "Users can view their organization's dataroom purchases"
ON public.dataroom_storage_purchases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND organization_id = dataroom_storage_purchases.organization_id
  )
);

CREATE POLICY "Users can insert their own dataroom purchases"
ON public.dataroom_storage_purchases
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_organization_dataroom_storage_updated_at
BEFORE UPDATE ON public.organization_dataroom_storage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dataroom_storage_purchases_updated_at
BEFORE UPDATE ON public.dataroom_storage_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();