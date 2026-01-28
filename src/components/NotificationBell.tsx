import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, Trash2, FileText, ListTodo, X, AlertTriangle, AlertCircle, Users, UserX, UserCheck, Activity, TrendingUp, CheckCircle2, FolderLock, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useTaskFlowData, type Alert } from "@/hooks/useTaskFlowData";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDistanceToNow } from "date-fns";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { cn } from "@/lib/utils";
import { NotificationPreviewDialog } from "./NotificationPreviewDialog";

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "task_assigned":
    case "task_completed":
    case "task_request":
    case "task_request_accepted":
    case "task_request_declined":
    case "task_request_reassigned":
    case "task_request_reminder":
      return <ListTodo className="h-4 w-4 text-primary" />;
    case "file_shared":
    case "file_review":
      return <FileText className="h-4 w-4 text-blue-500" />;
    case "data_room_invite":
      return <FolderLock className="h-4 w-4 text-emerald-500" />;
    case "nda_signed":
      return <FileSignature className="h-4 w-4 text-brand-teal" />;
    case "policy_expired":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const getAlertIcon = (type: string) => {
  switch (type) {
    case "overdue": return <AlertCircle className="w-4 h-4" />;
    case "at-risk": return <AlertTriangle className="w-4 h-4" />;
    case "overload": return <Users className="w-4 h-4" />;
    case "near-capacity": return <UserCheck className="w-4 h-4" />;
    case "unassigned": return <UserX className="w-4 h-4" />;
    case "on-track": return <CheckCircle2 className="w-4 h-4" />;
    case "workload-summary": return <Activity className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
};

const getAlertColors = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-destructive/10 border-destructive/30 text-destructive";
    case "warning":
      return "bg-brand-orange/10 border-brand-orange/30 text-brand-orange";
    case "success":
      return "bg-brand-green/10 border-brand-green/30 text-brand-green";
    case "info":
      return "bg-brand-teal/10 border-brand-teal/30 text-brand-teal";
    default:
      return "bg-muted border-border text-foreground";
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "live-overview": return "Live Overview";
    case "tasks-at-risk": return "Tasks at Risk";
    case "capacity": return "Team Capacity";
    case "on-track": return "On Track";
    default: return "Alerts";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "live-overview": return <Activity className="w-3 h-3" />;
    case "tasks-at-risk": return <AlertTriangle className="w-3 h-3" />;
    case "capacity": return <Users className="w-3 h-3" />;
    case "on-track": return <TrendingUp className="w-3 h-3" />;
    default: return <Bell className="w-3 h-3" />;
  }
};

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: {
  notification: Notification;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onClick: () => void;
}) => {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors",
        !notification.is_read && "bg-primary/5"
      )}
      onClick={onClick}
    >
      <div className="mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", !notification.is_read && "font-medium")}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
          })}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            title="Mark as read"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const AlertItem = ({ alert, onClick }: { alert: Alert; onClick: () => void }) => {
  return (
    <div
      className={cn(
        "p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-all hover:shadow-sm mb-2",
        getAlertColors(alert.severity)
      )}
      onClick={onClick}
    >
      <div className="shrink-0 mt-0.5">
        {getAlertIcon(alert.type)}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-relaxed line-clamp-2">{alert.message}</p>
        {alert.details && (
          <p className="text-xs opacity-80 leading-relaxed line-clamp-1">{alert.details}</p>
        )}
      </div>
    </div>
  );
};

export const NotificationBell = () => {
  const { navigateOrg } = useOrgNavigation();
  const [isOpen, setIsOpen] = useState(false);
  const [alertsViewedIds, setAlertsViewedIds] = useState<Set<string>>(new Set());
  const prevAlertsRef = useRef<string[]>([]);
  const { isViewer } = useUserRole();
  
  // Preview dialog state
  const [previewNotification, setPreviewNotification] = useState<Notification | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  // Only fetch TaskFlow alerts for non-viewer (non-team account) users
  const { alerts: rawAlerts, clearAlerts } = useTaskFlowData();
  const alerts = isViewer ? [] : rawAlerts;

  // Track new alerts that haven't been viewed
  const currentAlertIds = alerts.map(a => a.id);
  const unviewedAlerts = alerts.filter(a => !alertsViewedIds.has(a.id));
  
  const criticalCount = unviewedAlerts.filter(a => a.severity === "critical").length;
  const warningCount = unviewedAlerts.filter(a => a.severity === "warning").length;
  const totalAlertBadge = criticalCount + warningCount;

  // Group alerts by category
  const alertsByCategory = alerts.reduce((acc, alert) => {
    const category = alert.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  const categoryOrder = ["live-overview", "tasks-at-risk", "capacity", "on-track"];
  const sortedCategories = categoryOrder.filter(cat => alertsByCategory[cat]?.length > 0);

  // Mark notifications as read and alerts as viewed when popover opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Mark all notifications as read when opening the popover
      if (unreadCount > 0) {
        markAllAsRead.mutate();
      }
      // Mark all current alerts as viewed
      setAlertsViewedIds(new Set(currentAlertIds));
    }
  };

  // Reset viewed state for new alerts
  useEffect(() => {
    const newAlerts = currentAlertIds.filter(id => !prevAlertsRef.current.includes(id));
    if (newAlerts.length > 0 && !isOpen) {
      // New alerts arrived while popover is closed - they should show in badge
      setAlertsViewedIds(prev => {
        const updated = new Set(prev);
        newAlerts.forEach(id => updated.delete(id));
        return updated;
      });
    }
    prevAlertsRef.current = currentAlertIds;
  }, [currentAlertIds, isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read immediately
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    // Close the popover first, then open preview dialog
    setIsOpen(false);
    setPreviewNotification(notification);
    setPreviewOpen(true);
  };

  const handleAlertClick = (alert: Alert) => {
    navigateOrg("/taskflow");
  };

  const totalBadge = unreadCount + totalAlertBadge;

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {totalBadge > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {totalBadge > 9 ? "9+" : totalBadge}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <Tabs defaultValue="notifications" className="w-full">
            <div className="border-b px-2 pt-2">
              <TabsList className="w-full grid grid-cols-2 h-9">
                <TabsTrigger value="notifications" className="text-xs relative">
                  <Bell className="h-3.5 w-3.5 mr-1.5" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs relative">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                  Alerts
                  {totalAlertBadge > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded-full">
                      {totalAlertBadge}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="notifications" className="m-0">
              <div className="flex items-center justify-between p-2 border-b">
                <span className="text-xs text-muted-foreground">Recent activity</span>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => markAllAsRead.mutate()}
                    >
                      <CheckCheck className="h-3 w-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                      onClick={() => clearAllNotifications.mutate()}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-[320px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-20">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                    <Bell className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={() => markAsRead.mutate(notification.id)}
                      onDelete={() => deleteNotification.mutate(notification.id)}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="alerts" className="m-0">
              <div className="flex items-center justify-between p-2 border-b">
                <span className="text-xs text-muted-foreground">TaskFlow alerts</span>
                <div className="flex items-center gap-1.5">
                  {criticalCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-destructive text-destructive-foreground">
                      {criticalCount} critical
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-brand-orange text-white">
                      {warningCount} warning
                    </span>
                  )}
                  {alerts.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                      onClick={clearAlerts}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="h-[320px]">
                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mb-2 opacity-50 text-brand-green" />
                    <p className="text-sm">All clear! No alerts.</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-4">
                    {sortedCategories.map(category => (
                      <div key={category}>
                        <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                          {getCategoryIcon(category)}
                          <span className="text-[10px] font-semibold uppercase tracking-wider">
                            {getCategoryLabel(category)}
                          </span>
                          <span className="text-[10px] opacity-70">
                            ({alertsByCategory[category].length})
                          </span>
                        </div>
                        {alertsByCategory[category].map(alert => (
                          <AlertItem
                            key={alert.id}
                            alert={alert}
                            onClick={() => handleAlertClick(alert)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      {/* Notification Preview Dialog */}
      <NotificationPreviewDialog
        notification={previewNotification}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onMarkAsRead={() => {
          if (previewNotification && !previewNotification.is_read) {
            markAsRead.mutate(previewNotification.id);
          }
        }}
        onDelete={() => {
          if (previewNotification) {
            deleteNotification.mutate(previewNotification.id);
          }
        }}
      />
    </>
  );
};
