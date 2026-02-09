-- Create storage_purchases table for tracking Bosdrive storage purchases
CREATE TABLE public.storage_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_session_id text NOT NULL,
  price_id text NOT NULL,
  storage_gb numeric NOT NULL DEFAULT 0,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view storage purchases"
ON public.storage_purchases FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can insert storage purchases"
ON public.storage_purchases FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_storage_purchases_org ON public.storage_purchases(organization_id);
CREATE INDEX idx_storage_purchases_session ON public.storage_purchases(stripe_session_id);

-- Create organization_storage table for tracking Bosdrive additional storage
CREATE TABLE public.organization_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  additional_storage_gb numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view organization storage"
ON public.organization_storage FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can upsert organization storage"
ON public.organization_storage FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update organization storage"
ON public.organization_storage FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

-- Create dataroom_storage_purchases table
CREATE TABLE public.dataroom_storage_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stripe_session_id text NOT NULL,
  price_id text NOT NULL,
  storage_gb numeric NOT NULL DEFAULT 0,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dataroom_storage_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view dataroom storage purchases"
ON public.dataroom_storage_purchases FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can insert dataroom storage purchases"
ON public.dataroom_storage_purchases FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_dataroom_storage_purchases_org ON public.dataroom_storage_purchases(organization_id);
CREATE INDEX idx_dataroom_storage_purchases_session ON public.dataroom_storage_purchases(stripe_session_id);

-- Create organization_dataroom_storage table
CREATE TABLE public.organization_dataroom_storage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  additional_storage_gb numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_dataroom_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view dataroom organization storage"
ON public.organization_dataroom_storage FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can upsert dataroom organization storage"
ON public.organization_dataroom_storage FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update dataroom organization storage"
ON public.organization_dataroom_storage FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));