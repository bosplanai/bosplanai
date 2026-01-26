-- Drop the overly permissive policies that allow any authenticated user to access all file permissions
DROP POLICY IF EXISTS "Users can view file permissions" ON public.data_room_file_permissions;
DROP POLICY IF EXISTS "Users can manage file permissions" ON public.data_room_file_permissions;