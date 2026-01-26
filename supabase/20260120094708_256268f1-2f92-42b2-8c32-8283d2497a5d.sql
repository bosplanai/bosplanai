-- Create trigger for task assignment notifications
CREATE TRIGGER on_task_assignment_notify
AFTER INSERT ON public.task_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_task_assignment();

-- Create trigger for file sharing notifications
CREATE TRIGGER on_file_shared_notify
AFTER INSERT ON public.drive_file_access
FOR EACH ROW
EXECUTE FUNCTION public.notify_file_shared();

-- Create trigger for data room member notifications
CREATE TRIGGER on_data_room_member_notify
AFTER INSERT ON public.data_room_members
FOR EACH ROW
EXECUTE FUNCTION public.notify_data_room_member_added();