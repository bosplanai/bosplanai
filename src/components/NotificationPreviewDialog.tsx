import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, ListTodo, FileText, FolderLock, FileSignature, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Notification } from "@/hooks/useNotifications";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { DeclinedTaskReassignDialog } from "./DeclinedTaskReassignDialog";

interface NotificationPreviewDialogProps {
  notification: Notification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "task_assigned":
    case "task_completed":
    case "task_request":
    case "task_request_accepted":
    case "task_request_declined":
    case "task_declined":
    case "task_request_reassigned":
    case "task_request_reminder":
      return <ListTodo className="h-5 w-5 text-primary" />;
    case "file_shared":
    case "file_review":
      return <FileText className="h-5 w-5 text-blue-500" />;
    case "data_room_invite":
      return <FolderLock className="h-5 w-5 text-emerald-500" />;
    case "nda_signed":
      return <FileSignature className="h-5 w-5 text-brand-teal" />;
    case "policy_expired":
      return <Clock className="h-5 w-5 text-destructive" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

const getNotificationTypeLabel = (type: string) => {
  switch (type) {
    case "task_assigned": return "Task Request";
    case "task_completed": return "Task Completed";
    case "task_request": return "Task Request";
    case "task_request_accepted": return "Request Accepted";
    case "task_request_declined": return "Request Declined";
    case "task_declined": return "Task Declined";
    case "task_request_reassigned": return "Task Reassigned";
    case "task_request_reminder": return "Pending Reminder";
    case "file_shared": return "File Shared";
    case "file_review": return "File Review";
    case "data_room_invite": return "Data Room Invite";
    case "nda_signed": return "NDA Signed";
    case "policy_expired": return "Policy Expired";
    default: return "Notification";
  }
};

const getNavigationPath = (notification: Notification): string | null => {
  switch (notification.reference_type) {
    case "task": return "/";
    case "file": return "/drive";
    case "data_room": return "/dataroom";
    default: return null;
  }
};

// Check if notification is a declined task that can be reassigned
const isDeclinedTaskNotification = (notification: Notification): boolean => {
  return (
    (notification.type === "task_declined" || notification.type === "task_request_declined") &&
    notification.reference_type === "task" &&
    !!notification.reference_id
  );
};

export const NotificationPreviewDialog = ({
  notification,
  open,
  onOpenChange,
  onMarkAsRead,
  onDelete,
}: NotificationPreviewDialogProps) => {
  const { navigateOrg } = useOrgNavigation();
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);

  if (!notification) return null;

  const navigationPath = getNavigationPath(notification);
  const canReassign = isDeclinedTaskNotification(notification);

  const handleNavigate = () => {
    if (navigationPath) {
      onOpenChange(false);
      navigateOrg(navigationPath);
    }
  };

  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  const handleReassignClick = () => {
    setReassignDialogOpen(true);
  };

  const handleReassignSuccess = () => {
    onDelete(); // Remove the notification after successful reassignment
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base">{notification.title}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {getNotificationTypeLabel(notification.type)}
                  </Badge>
                  {!notification.is_read && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary">Unread</Badge>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Message Content */}
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {format(new Date(notification.created_at), "PPP 'at' p")} (
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })})
              </span>
            </div>

            {/* Reassign Action for Declined Tasks */}
            {canReassign && (
              <div className="pt-2 border-t">
                <Button
                  onClick={handleReassignClick}
                  className="w-full gap-2"
                  variant="default"
                >
                  <ArrowRight className="h-4 w-4" />
                  Review & Reassign Task
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <DeclinedTaskReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        taskId={notification.reference_id}
        onSuccess={handleReassignSuccess}
      />
    </>
  );
};
