import { useState, useCallback } from "react";
import { Pencil, Trash2, GripVertical, User, Briefcase, Settings, Target, Calendar, Flag, FolderOpen, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import TaskDetailSheet, { TaskDetails, DestinationType } from "./TaskDetailSheet";
import { useProjects } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeamMembers";

export interface ParsedTask {
  id: string;
  text: string;
  selected: boolean;
  title?: string;
  description?: string;
  destination?: DestinationType;
  projectId?: string | null;
  dueDate?: Date;
  priority?: "high" | "medium" | "low";
  assignedUserId?: string | null;
  organizationId?: string | null;
}

interface GeneratedTaskItemProps {
  task: ParsedTask;
  onToggleSelect: (id: string) => void;
  onEdit: (id: string, details: TaskDetails) => void;
  onRemove: (id: string) => void;
  onQuickUpdate: (id: string, updates: Partial<ParsedTask>) => void;
  canAccessOperational?: boolean;
  canAccessStrategic?: boolean;
  canCreateProject?: boolean;
}

const destinationConfig = {
  personal: { label: "Personal", icon: User, className: "bg-brand-teal/10 text-brand-teal border-brand-teal/20" },
  product: { label: "Product", icon: Briefcase, className: "bg-brand-orange/10 text-brand-orange border-brand-orange/20" },
  operational: { label: "Operations", icon: Settings, className: "bg-brand-coral/10 text-brand-coral border-brand-coral/20" },
  strategic: { label: "Strategic", icon: Target, className: "bg-brand-green/10 text-brand-green border-brand-green/20" },
};

const priorityConfig = {
  high: { label: "High", className: "text-priority-high bg-priority-high/10" },
  medium: { label: "Medium", className: "text-priority-medium bg-priority-medium/10" },
  low: { label: "Low", className: "text-priority-low bg-priority-low/10" },
};

const GeneratedTaskItem = ({
  task,
  onToggleSelect,
  onEdit,
  onRemove,
  onQuickUpdate,
  canAccessOperational = true,
  canAccessStrategic = true,
  canCreateProject = true,
}: GeneratedTaskItemProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { projects } = useProjects();
  const { members } = useTeamMembers();

  const handleSaveDetails = (details: TaskDetails) => {
    onEdit(task.id, details);
  };

  const handleDestinationChange = useCallback((value: string) => {
    onQuickUpdate(task.id, { destination: value as DestinationType });
  }, [task.id, onQuickUpdate]);

  const handlePriorityChange = useCallback((value: string) => {
    onQuickUpdate(task.id, { priority: value as "high" | "medium" | "low" });
  }, [task.id, onQuickUpdate]);

  const handleProjectChange = useCallback((value: string) => {
    onQuickUpdate(task.id, { projectId: value === "none" ? null : value });
  }, [task.id, onQuickUpdate]);

  const handleAssigneeChange = useCallback((value: string) => {
    onQuickUpdate(task.id, { assignedUserId: value === "none" ? null : value });
  }, [task.id, onQuickUpdate]);

  const handleDateSelect = useCallback((date: Date | undefined) => {
    onQuickUpdate(task.id, { dueDate: date });
  }, [task.id, onQuickUpdate]);

  const destination = task.destination || "personal";
  const destConfig = destinationConfig[destination];
  const DestIcon = destConfig.icon;
  const priority = task.priority || "medium";
  const prioConfig = priorityConfig[priority];

  // Get display values
  const selectedProject = projects.find(p => p.id === task.projectId);
  const selectedMember = members.find(m => m.user_id === task.assignedUserId);

  // Display title (auto-generated or custom) vs the full text as description
  const displayTitle = task.title || task.text;
  const displayDescription = task.description || (task.title ? task.text : undefined);

  return (
    <>
      <div
        className={cn(
          "group flex flex-col gap-3 p-4 rounded-lg border transition-colors",
          task.selected
            ? "border-brand-orange/50 bg-brand-orange/5"
            : "border-border hover:border-muted-foreground/30"
        )}
      >
        {/* Header Row */}
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2 pt-0.5">
            <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
            <Checkbox
              checked={task.selected}
              onCheckedChange={() => onToggleSelect(task.id)}
              className="data-[state=checked]:bg-brand-orange data-[state=checked]:border-brand-orange"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium leading-relaxed",
                task.selected ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {displayTitle}
            </p>
            {displayDescription && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {displayDescription}
              </p>
            )}
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsSheetOpen(true)}
              className="h-7 w-7"
              title="Edit all details"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onRemove(task.id)}
              className="h-7 w-7 hover:text-destructive"
              title="Remove task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick Edit Row - Always visible */}
        <div className="flex flex-wrap items-center gap-2 pl-10">
          {/* Board/Destination */}
          <Select value={destination} onValueChange={handleDestinationChange}>
            <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs gap-1 border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personal">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Personal
                </div>
              </SelectItem>
              <SelectItem value="product">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3 h-3" />
                  Product
                </div>
              </SelectItem>
              {canAccessOperational && (
                <SelectItem value="operational">
                  <div className="flex items-center gap-2">
                    <Settings className="w-3 h-3" />
                    Operations
                  </div>
                </SelectItem>
              )}
              {canAccessStrategic && (
                <SelectItem value="strategic">
                  <div className="flex items-center gap-2">
                    <Target className="w-3 h-3" />
                    Strategic
                  </div>
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select value={priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="h-7 w-auto min-w-[80px] text-xs gap-1 border-dashed">
              <Flag className="w-3 h-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                <span className="text-priority-low">Low</span>
              </SelectItem>
              <SelectItem value="medium">
                <span className="text-priority-medium">Medium</span>
              </SelectItem>
              <SelectItem value="high">
                <span className="text-priority-high">High</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Project */}
          <Select value={task.projectId || "none"} onValueChange={handleProjectChange}>
            <SelectTrigger className="h-7 w-auto min-w-[100px] max-w-[150px] text-xs gap-1 border-dashed">
              <FolderOpen className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {selectedProject?.title || "No Project"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assignee - Show for product, operational, and strategic boards */}
          {(destination === "product" || destination === "operational" || destination === "strategic") && members.length > 0 && (
            <Select value={task.assignedUserId || "none"} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="h-7 w-auto min-w-[100px] max-w-[140px] text-xs gap-1 border-dashed">
                <UserCheck className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {selectedMember?.full_name || "Unassigned"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.user_id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Due Date */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs gap-1 border-dashed",
                  !task.dueDate && "text-muted-foreground"
                )}
              >
                <Calendar className="w-3 h-3" />
                {task.dueDate ? format(task.dueDate, "MMM d") : "Due date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={task.dueDate}
                onSelect={handleDateSelect}
                initialFocus
                className="pointer-events-auto"
              />
              {task.dueDate && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateSelect(undefined)}
                    className="w-full text-xs"
                  >
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <TaskDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        initialTitle={task.title || ""}
        initialDescription={task.text}
        initialDestination={task.destination}
        initialProjectId={task.projectId}
        initialDueDate={task.dueDate}
        initialPriority={task.priority}
        initialAssignedUserId={task.assignedUserId}
        onSave={handleSaveDetails}
        canAccessOperational={canAccessOperational}
        canAccessStrategic={canAccessStrategic}
        canCreateProject={canCreateProject}
      />
    </>
  );
};

export default GeneratedTaskItem;
