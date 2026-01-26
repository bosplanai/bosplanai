import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Clock, User, FolderOpen, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskWithRisk {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  project_id: string | null;
  project_title: string | null;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskReason: string;
  predictedCompletionDays: number;
}

interface PrioritizedTaskListProps {
  tasks: TaskWithRisk[];
  onTaskClick?: (taskId: string) => void;
  onReassign?: (taskId: string) => void;
}

const getRiskBadgeVariant = (level: string) => {
  switch (level) {
    case "critical": return "destructive";
    case "high": return "destructive";
    case "medium": return "secondary";
    default: return "outline";
  }
};

const getRiskIcon = (level: string) => {
  switch (level) {
    case "critical": return <AlertCircle className="w-4 h-4" />;
    case "high": return <AlertTriangle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high": return "text-destructive";
    case "medium": return "text-brand-teal";
    default: return "text-brand-green";
  }
};

export function PrioritizedTaskList({ tasks, onTaskClick, onReassign }: PrioritizedTaskListProps) {
  const criticalTasks = tasks.filter(t => t.riskLevel === "critical");
  const highRiskTasks = tasks.filter(t => t.riskLevel === "high");
  const otherTasks = tasks.filter(t => t.riskLevel !== "critical" && t.riskLevel !== "high");

  const renderTaskCard = (task: TaskWithRisk, isUrgent = false) => (
    <div
      key={task.id}
      className={cn(
        "p-5 rounded-xl border transition-all hover:shadow-md cursor-pointer",
        isUrgent 
          ? "bg-destructive/5 border-destructive/30" 
          : "bg-card border-border"
      )}
      onClick={() => onTaskClick?.(task.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getRiskBadgeVariant(task.riskLevel)} className="text-xs px-2.5 py-1">
              {getRiskIcon(task.riskLevel)}
              <span className="ml-1.5 capitalize">{task.riskLevel}</span>
            </Badge>
            <Badge variant="outline" className={cn("text-xs px-2.5 py-1", getPriorityColor(task.priority))}>
              {task.priority} priority
            </Badge>
          </div>
          
          <h4 className="font-medium text-foreground text-base leading-snug">{task.title}</h4>
          
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {task.riskReason}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-muted-foreground">
            {task.assigned_user_name ? (
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>{task.assigned_user_name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-brand-coral">
                <User className="w-4 h-4" />
                <span>Unassigned</span>
              </div>
            )}
            
            {task.project_title && (
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4" />
                <span className="truncate max-w-[140px]">{task.project_title}</span>
              </div>
            )}
            
            {task.due_date && (
              <div className={cn(
                "flex items-center gap-1.5",
                differenceInDays(parseISO(task.due_date), new Date()) < 0 && "text-destructive"
              )}>
                <Clock className="w-4 h-4" />
                <span>{format(parseISO(task.due_date), "MMM d")}</span>
              </div>
            )}
          </div>
        </div>
        
        {onReassign && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-9 w-9"
                onClick={(e) => {
                  e.stopPropagation();
                  onReassign(task.id);
                }}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reassign task</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-brand-coral/10 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-brand-coral" />
        </div>
        <h3 className="font-semibold text-foreground text-base">Prioritized Task List</h3>
        <span className="text-sm text-muted-foreground ml-auto">
          {tasks.length} pending tasks
        </span>
      </div>
      
      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
        {/* Critical Section */}
        {criticalTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4" />
              Critical - Immediate Attention ({criticalTasks.length})
            </h4>
            <div className="space-y-3">
              {criticalTasks.map(task => renderTaskCard(task, true))}
            </div>
          </div>
        )}
        
        {/* High Risk Section */}
        {highRiskTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-brand-coral flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" />
              High Risk ({highRiskTasks.length})
            </h4>
            <div className="space-y-3">
              {highRiskTasks.map(task => renderTaskCard(task))}
            </div>
          </div>
        )}
        
        {/* Other Tasks */}
        {otherTasks.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" />
              Other Tasks ({otherTasks.length})
            </h4>
            <div className="space-y-3">
              {otherTasks.slice(0, 10).map(task => renderTaskCard(task))}
              {otherTasks.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  +{otherTasks.length - 10} more tasks
                </p>
              )}
            </div>
          </div>
        )}
        
        {tasks.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No pending tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
