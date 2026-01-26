-- Create trigger function to notify users when they are added to a data room
CREATE OR REPLACE FUNCTION public.notify_data_room_member_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    room_name TEXT;
    adder_name TEXT;
BEGIN
    -- Get the data room name
    SELECT name INTO room_name 
    FROM public.data_rooms 
    WHERE id = NEW.data_room_id;
    
    -- Get the name of the person who added the member
    SELECT full_name INTO adder_name 
    FROM public.profiles 
    WHERE id = NEW.added_by;
    
    -- Create notification for the new member
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
    VALUES (
        NEW.user_id,
        NEW.organization_id,
        'data_room_invite',
        'Data Room Access Granted',
        'You have been added to the data room: ' || COALESCE(room_name, 'Untitled') || ' by ' || COALESCE(adder_name, 'a team member'),
        NEW.data_room_id,
        'data_room'
    );
    
    RETURN NEW;
END;
$function$;

-- Create trigger for data room member additions
DROP TRIGGER IF EXISTS notify_data_room_member_added_trigger ON public.data_room_members;
CREATE TRIGGER notify_data_room_member_added_trigger
AFTER INSERT ON public.data_room_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_data_room_member_added();

-- Create trigger function to notify data room creator when NDA is signed
CREATE OR REPLACE FUNCTION public.notify_nda_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    room_record RECORD;
BEGIN
    -- Get the data room details and creator
    SELECT dr.id, dr.name, dr.created_by, dr.organization_id 
    INTO room_record
    FROM public.data_rooms dr
    WHERE dr.id = NEW.data_room_id;
    
    -- Create notification for the data room creator
    IF room_record.created_by IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_id, reference_type)
        VALUES (
            room_record.created_by,
            room_record.organization_id,
            'nda_signed',
            'NDA Signed',
            NEW.signer_name || ' (' || NEW.signer_email || ') has signed the NDA for data room: ' || COALESCE(room_record.name, 'Untitled'),
            NEW.data_room_id,
            'data_room'
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for NDA signatures
DROP TRIGGER IF EXISTS notify_nda_signed_trigger ON public.data_room_nda_signatures;
CREATE TRIGGER notify_nda_signed_trigger
AFTER INSERT ON public.data_room_nda_signatures
FOR EACH ROW
EXECUTE FUNCTION public.notify_nda_signed();