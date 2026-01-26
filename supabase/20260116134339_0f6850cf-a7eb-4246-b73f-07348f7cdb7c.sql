-- Add signature_url column to store the uploaded signature image URL
ALTER TABLE public.data_room_nda_signatures 
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Create storage bucket for NDA signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('nda-signatures', 'nda-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own signatures
CREATE POLICY "Users can upload their own NDA signatures"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'nda-signatures' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own signatures
CREATE POLICY "Users can view their own NDA signatures"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'nda-signatures'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);