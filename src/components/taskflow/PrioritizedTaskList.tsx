import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Clock, User, FolderKanban, ArrowRight, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

const priorityConfig: Record<string, { label: string; className: string }> = {
  high: { label: "High", className: "bg-priority-high/10 text-priority-high" },
  medium: { label: "Med", className: "bg-priority-medium/10 text-priority-medium" },
  low: { label: "Low", className: "bg-priority-low/10 text-priority-low" },
};

const riskConfig: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
  high: { label: "High Risk", className: "bg-brand-coral/10 text-brand-coral" },
  medium: { label: "Medium Risk", className: "bg-brand-orange/10 text-brand-orange" },
  low: { label: "Low Risk", className: "bg-brand-green/10 text-brand-green" },
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const TaskCard = ({ 
  task, 
  isUrgent, 
  onTaskClick, 
  onReassign 
}: { 
  task: TaskWithRisk; 
  isUrgent?: boolean;
  onTaskClick?: (taskId: string) => void;
  onReassign?: (taskId: string) => void;
}) => {
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.medium;
  const riskInfo = riskConfig[task.riskLevel] || riskConfig.low;
  const isOverdue = task.due_date && differenceInDays(parseISO(task.due_date), new Date()) < 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3.5 bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 ease-out cursor-pointer border border-border/40 hover:border-primary/25 group",
        isUrgent && "border-destructive/30 bg-destructive/5"
      )}
      onClick={() => onTaskClick?.(task.id)}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-taskIcon/90 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
        <ListTodo className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-foreground text-sm leading-snug group-hover:text-primary transition-colors duration-200 truncate">
            {task.title}
          </p>
          <span className={cn("font-semibold px-2 py-0.5 rounded-full flex-shrink-0 text-[0.625rem]", priorityInfo.className)}>
            {priorityInfo.label}
          </span>
          <span className={cn("font-semibold px-2 py-0.5 rounded-full flex-shrink-0 text-[0.625rem]", riskInfo.className)}>
            {riskInfo.label}
          </span>
        </div>
        
        {task.riskReason && (
          <p className="text-muted-foreground mt-1 text-xs line-clamp-2">
            {task.riskReason}
          </p>
        )}

        {/* Project badge */}
        <div className="flex items-center gap-1 mt-2">
          <FolderKanban className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium truncate max-w-[150px]">
            {task.project_title || "No Project"}
          </span>
        </div>

        {/* User avatar and due date */}
        <div className="flex items-center gap-3 mt-2">
          {task.assigned_user_name ? (
            <div title={`Assigned to ${task.assigned_user_name}`}>
              <Avatar className="w-5 h-5 border-2 border-primary">
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
                  {getInitials(task.assigned_user_name)}
                </AvatarFallback>
              </Avatar>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-brand-coral">
              <User className="w-3 h-3" />
              <span className="text-xs">Unassigned</span>
            </div>
          )}
          
          {task.due_date && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}>
              <Clock className="w-3 h-3" />
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
              className="shrink-0 h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity"
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
  );
};

export function PrioritizedTaskList({ tasks, onTaskClick, onReassign }: PrioritizedTaskListProps) {
  const criticalTasks = tasks.filter(t => t.riskLevel === "critical");
  const highRiskTasks = tasks.filter(t => t.riskLevel === "high");
  const otherTasks = tasks.filter(t => t.riskLevel !== "critical" && t.riskLevel !== "high");

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
              {criticalTasks.map(task => (
                <TaskCard key={task.id} task={task} isUrgent onTaskClick={onTaskClick} onReassign={onReassign} />
              ))}
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
              {highRiskTasks.map(task => (
                <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} onReassign={onReassign} />
              ))}
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
              {otherTasks.slice(0, 10).map(task => (
                <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} onReassign={onReassign} />
              ))}
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
