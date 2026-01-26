import { cn } from "@/lib/utils";
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle, 
  Users, 
  UserX, 
  X, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Activity,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Alert } from "@/hooks/useTaskFlowData";

interface AlertsPanelProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  onDismiss?: (alertId: string) => void;
}

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

const getAlertColors = (severity: string, type: string) => {
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
    case "live-overview": return <Activity className="w-3.5 h-3.5" />;
    case "tasks-at-risk": return <AlertTriangle className="w-3.5 h-3.5" />;
    case "capacity": return <Users className="w-3.5 h-3.5" />;
    case "on-track": return <TrendingUp className="w-3.5 h-3.5" />;
    default: return <Bell className="w-3.5 h-3.5" />;
  }
};

export function AlertsPanel({ alerts, onAlertClick, onDismiss }: AlertsPanelProps) {
  // Group alerts by category
  const alertsByCategory = alerts.reduce((acc, alert) => {
    const category = alert.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(alert);
    return acc;
  }, {} as Record<string, Alert[]>);

  const categoryOrder = ["live-overview", "tasks-at-risk", "capacity", "on-track"];
  const sortedCategories = categoryOrder.filter(cat => alertsByCategory[cat]?.length > 0);

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  return (
    <div className="bg-card rounded-xl border border-border p-5 h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center">
          <Bell className="w-5 h-5 text-brand-orange" />
        </div>
        <h3 className="font-semibold text-foreground text-base">Alerts</h3>
        <div className="ml-auto flex flex-wrap gap-2">
          {criticalCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-destructive text-destructive-foreground">
              {criticalCount} critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-orange text-white">
              {warningCount} warning
            </span>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 pr-3">
          {sortedCategories.map(category => (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                {getCategoryIcon(category)}
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {getCategoryLabel(category)}
                </span>
                <span className="text-xs opacity-70">
                  ({alertsByCategory[category].length})
                </span>
              </div>
              
              {/* Alerts in category */}
              <div className="space-y-3">
                {alertsByCategory[category].map(alert => (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 rounded-xl border flex items-start gap-4 cursor-pointer transition-all hover:shadow-sm",
                      getAlertColors(alert.severity, alert.type)
                    )}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <div className="shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-relaxed">{alert.message}</p>
                      {alert.details && (
                        <p className="text-xs opacity-80 leading-relaxed line-clamp-2">{alert.details}</p>
                      )}
                    </div>
                    {onDismiss && alert.type !== "workload-summary" && alert.type !== "on-track" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-7 w-7 opacity-60 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismiss(alert.id);
                        }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {alerts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">All clear! No alerts at this time.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
