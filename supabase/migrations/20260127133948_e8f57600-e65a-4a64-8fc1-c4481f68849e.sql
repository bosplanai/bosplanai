-- Delete test accounts: support@workingatspeed.com and support@qualitymvp.com

-- User IDs:
-- support@workingatspeed.com: 21ee9354-7191-4a40-8d2c-69cf970f3d70
-- support@qualitymvp.com: 7524518f-ba25-4694-aea4-13e4c6711ddf

-- Organization IDs:
-- Working At Speed: 76f2bf0b-0723-4030-bb53-5996daac4927
-- QualityMVP: e031dae2-e98a-4867-af2e-421c649bc6db

-- Delete user roles first (foreign key constraint)
DELETE FROM public.user_roles 
WHERE user_id IN (
  '21ee9354-7191-4a40-8d2c-69cf970f3d70',
  '7524518f-ba25-4694-aea4-13e4c6711ddf'
);

-- Delete profiles (foreign key constraint)
DELETE FROM public.profiles 
WHERE id IN (
  '21ee9354-7191-4a40-8d2c-69cf970f3d70',
  '7524518f-ba25-4694-aea4-13e4c6711ddf'
);

-- Delete organizations
DELETE FROM public.organizations 
WHERE id IN (
  '76f2bf0b-0723-4030-bb53-5996daac4927',
  'e031dae2-e98a-4867-af2e-421c649bc6db'
);

-- Delete auth users (using Supabase's auth schema)
DELETE FROM auth.users 
WHERE email IN (
  'support@workingatspeed.com',
  'support@qualitymvp.com'
);