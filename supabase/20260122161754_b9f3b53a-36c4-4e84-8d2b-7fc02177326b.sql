-- Fix organization_storage: change additional_storage_gb to numeric to support fractional GB
ALTER TABLE public.organization_storage 
ALTER COLUMN additional_storage_gb TYPE numeric USING additional_storage_gb::numeric;

-- Fix organization_dataroom_storage: change additional_storage_gb to numeric to support fractional GB
ALTER TABLE public.organization_dataroom_storage 
ALTER COLUMN additional_storage_gb TYPE numeric USING additional_storage_gb::numeric;

-- Also update dataroom_storage_purchases storage_gb column to numeric if it exists
ALTER TABLE public.dataroom_storage_purchases 
ALTER COLUMN storage_gb TYPE numeric USING storage_gb::numeric;