-- Remove duplicate super_admin role entry
DELETE FROM public.user_roles 
WHERE id = 'f2ba6d57-1d3a-4c40-af49-1f0846278ce8';
