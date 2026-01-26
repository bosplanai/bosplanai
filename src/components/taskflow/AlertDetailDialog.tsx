import { format, parseISO, differenceInDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle, 
  AlertTriangle, 
  Users, 
  UserX, 
  CheckCircle2, 
  Activity,
  UserCheck,
  Calendar,
  User,
  ArrowRight,
  Clock
} from "lucide-react";
import type { Alert } from "@/hooks/useTaskFlowData";
import { cn } from "@/lib/utils";

interface AlertDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: Alert | null;
  onTakeAction?: (alert: Alert) => void;
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case "overdue": return <AlertCircle className="w-6 h-6" />;
    case "at-risk": return <AlertTriangle className="w-6 h-6" />;
    case "overload": return <Users className="w-6 h-6" />;
    case "near-capacity": return <UserCheck className="w-6 h-6" />;
    case "unassigned": return <UserX className="w-6 h-6" />;
    case "on-track": return <CheckCircle2 className="w-6 h-6" />;
    case "workload-summary": return <Activity className="w-6 h-6" />;
    default: return <AlertCircle className="w-6 h-6" />;
  }
};

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case "critical":
      return {
        bg: "bg-destructive/10",
        border: "border-destructive/30",
        text: "text-destructive",
        badge: "bg-destructive text-destructive-foreground",
      };
    case "warning":
      return {
        bg: "bg-brand-orange/10",
        border: "border-brand-orange/30",
        text: "text-brand-orange",
        badge: "bg-brand-orange text-white",
      };
    case "success":
      return {
        bg: "bg-brand-green/10",
        border: "border-brand-green/30",
        text: "text-brand-green",
        badge: "bg-brand-green text-white",
      };
    case "info":
      return {
        bg: "bg-brand-teal/10",
        border: "border-brand-teal/30",
        text: "text-brand-teal",
        badge: "bg-brand-teal text-white",
      };
    default:
      return {
        bg: "bg-muted",
        border: "border-border",
        text: "text-foreground",
        badge: "bg-muted text-foreground",
      };
  }
};

const getAlertTypeLabel = (type: string) => {
  switch (type) {
    case "overdue": return "Overdue Task";
    case "at-risk": return "At Risk";
    case "overload": return "Team Member Overloaded";
    case "near-capacity": return "Approaching Capacity";
    case "unassigned": return "Unassigned Task";
    case "on-track": return "On Track";
    case "workload-summary": return "Team Overview";
    default: return "Alert";
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "live-overview": return "Live Overview";
    case "tasks-at-risk": return "Tasks at Risk";
    case "capacity": return "Team Capacity";
    case "on-track": return "On Track";
    default: return "Alert";
  }
};

const getRecommendation = (alert: Alert): string => {
  switch (alert.type) {
    case "overdue":
      return "Consider reassigning this task to a team member with available capacity, or adjust the deadline if needed. Follow up with the assignee to understand any blockers.";
    case "at-risk":
      return "This task may not be completed on time. Review the workload of the assignee and consider redistributing tasks or adjusting priorities.";
    case "overload":
      return "This team member has too many tasks. Consider reassigning some tasks to other members or adjusting deadlines to balance the workload.";
    case "near-capacity":
      return "Monitor this team member's workload closely. Avoid assigning additional high-priority tasks without reviewing their current commitments.";
    case "unassigned":
      return "Assign this high-priority task to a team member with available capacity to ensure it gets addressed promptly.";
    case "on-track":
      return "Tasks are progressing well. Continue monitoring and maintain current workflow.";
    case "workload-summary":
      return "Review team capacity regularly to ensure balanced workload distribution and prevent burnout.";
    default:
      return "Review this alert and take appropriate action.";
  }
};

const getActionLabel = (alert: Alert): string | null => {
  switch (alert.type) {
    case "overdue":
    case "at-risk":
    case "unassigned":
      return "Reassign Task";
    case "overload":
    case "near-capacity":
      return "View Working Hours";
    default:
      return null;
  }
};

export function AlertDetailDialog({ 
  open, 
  onOpenChange, 
  alert,
  onTakeAction 
}: AlertDetailDialogProps) {
  if (!alert) return null;

  const styles = getSeverityStyles(alert.severity);
  const actionLabel = getActionLabel(alert);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              styles.bg,
              styles.border,
              "border"
            )}>
              <span className={styles.text}>
                {getAlertIcon(alert.type)}
              </span>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{getAlertTypeLabel(alert.type)}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(alert.category)}
                </Badge>
                <Badge className={cn("text-xs", styles.badge)}>
                  {alert.severity}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Alert Message */}
          <div className={cn(
            "p-4 rounded-lg border",
            styles.bg,
            styles.border
          )}>
            <p className="font-medium text-foreground">{alert.message}</p>
            {alert.details && (
              <p className="text-sm text-muted-foreground mt-1">{alert.details}</p>
            )}
          </div>

          {/* Context Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Context</h4>
            <div className="grid gap-2">
              {alert.taskId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Task requires attention</span>
                </div>
              )}
              {alert.userId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>Related to a team member</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Generated just now</span>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Recommended Action</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getRecommendation(alert)}
            </p>
          </div>

          {/* Action Button */}
          {actionLabel && onTakeAction && (
            <Button 
              className="w-full" 
              onClick={() => {
                onTakeAction(alert);
                onOpenChange(false);
              }}
            >
              {actionLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
