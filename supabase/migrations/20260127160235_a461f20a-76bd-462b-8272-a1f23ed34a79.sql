-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-logos', 'organization-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for organization logos bucket (public read, org member write)
CREATE POLICY "Anyone can view organization logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'organization-logos');

CREATE POLICY "Org members can upload their organization logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "Org admins can update their organization logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);

CREATE POLICY "Org admins can delete their organization logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'organization-logos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND (storage.foldername(name))[1] = ur.organization_id::text
  )
);