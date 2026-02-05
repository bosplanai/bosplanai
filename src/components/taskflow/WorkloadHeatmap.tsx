import { cn } from "@/lib/utils";
import { Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TeamMemberWorkload {
  id: string;
  full_name: string;
  job_role: string;
  todoTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
  overdueTasks: number;
  weeklyHours: number;
  estimatedWorkload: number;
  avgCompletionTime: number;
}

interface WorkloadHeatmapProps {
  workloads: TeamMemberWorkload[];
  onMemberClick?: (memberId: string) => void;
}

const getWorkloadColor = (percentage: number) => {
  if (percentage <= 50) return "bg-brand-green/20 border-brand-green/40";
  if (percentage <= 80) return "bg-brand-orange/20 border-brand-orange/40";
  if (percentage <= 100) return "bg-brand-coral/30 border-brand-coral/50";
  return "bg-destructive/30 border-destructive/50 animate-pulse";
};

const getWorkloadTextColor = (percentage: number) => {
  if (percentage <= 50) return "text-brand-green";
  if (percentage <= 80) return "text-brand-orange";
  return "text-destructive";
};

export function WorkloadHeatmap({ workloads, onMemberClick }: WorkloadHeatmapProps) {
  const sortedWorkloads = [...workloads].sort((a, b) => b.estimatedWorkload - a.estimatedWorkload);

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col max-h-[500px]">
      <div className="flex items-center gap-3 mb-5 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-brand-teal/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-brand-teal" />
        </div>
        <h3 className="font-semibold text-foreground text-base">Team Capacity & Workload</h3>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid gap-4 pr-2">
          {sortedWorkloads.map((member) => (
            <Tooltip key={member.id}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => onMemberClick?.(member.id)}
                  className={cn(
                    "p-5 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                    getWorkloadColor(member.estimatedWorkload)
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground text-base">{member.full_name}</p>
                      <p className="text-sm text-muted-foreground">{member.job_role}</p>
                    </div>
                    <div className={cn("text-3xl font-bold tabular-nums", getWorkloadTextColor(member.estimatedWorkload))}>
                      {member.estimatedWorkload}%
                    </div>
                  </div>
                  
                  {/* Workload bar */}
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-4">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        member.estimatedWorkload <= 50 ? "bg-brand-green" :
                        member.estimatedWorkload <= 80 ? "bg-brand-orange" :
                        "bg-destructive"
                      )}
                      style={{ width: `${Math.min(100, member.estimatedWorkload)}%` }}
                    />
                  </div>
                  
                  {/* Stats row */}
                  <div className="flex items-center gap-5 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{member.todoTasks} pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-brand-green" />
                      <span className="text-muted-foreground">{member.completedTasks} done</span>
                    </div>
                    {member.overdueTasks > 0 && (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-destructive font-medium">{member.overdueTasks} overdue</span>
                      </div>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs p-3">
                <div className="space-y-1.5">
                  <p className="font-medium text-sm">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">Weekly hours: {member.weeklyHours}h</p>
                  <p className="text-xs text-muted-foreground">High priority: {member.highPriorityTasks} tasks</p>
                  <p className="text-xs text-muted-foreground">Avg completion: {member.avgCompletionTime.toFixed(1)} days</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {workloads.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No team members found</p>
            </div>
          )}
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 pt-5 border-t border-border text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-brand-green/50" />
          <span className="text-muted-foreground">0-50%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-brand-orange/50" />
          <span className="text-muted-foreground">51-80%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-brand-coral/50" />
          <span className="text-muted-foreground">81-100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded bg-destructive/50" />
          <span className="text-muted-foreground">Overloaded</span>
        </div>
      </div>
    </div>
  );
}
