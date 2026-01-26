-- Fix the notify_file_shared function to use correct column name
CREATE OR REPLACE FUNCTION public.notify_file_shared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    file_name TEXT;
    file_org_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT name, organization_id INTO file_name, file_org_id 
        FROM public.drive_files 
        WHERE id = NEW.file_id;
        
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
        VALUES (
            NEW.granted_to,
            file_org_id,
            'file_shared',
            'File Shared',
            'A file has been shared with you: ' || COALESCE(file_name, 'Untitled'),
            NEW.file_id,
            'file'
        );
    END IF;
    RETURN NEW;
END;
$$;