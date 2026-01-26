-- Add additional fields to customers table for CRM
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS mobile TEXT,
ADD COLUMN IF NOT EXISTS enquiry_source TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Update existing records to split contact_name into first/last
UPDATE public.customers 
SET first_name = split_part(COALESCE(contact_name, company_name), ' ', 1),
    last_name = CASE 
      WHEN position(' ' in COALESCE(contact_name, company_name)) > 0 
      THEN substring(COALESCE(contact_name, company_name) from position(' ' in COALESCE(contact_name, company_name)) + 1)
      ELSE ''
    END
WHERE first_name IS NULL;