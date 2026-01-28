import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTasks, TaskPriority } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useUserRole } from "@/hooks/useUserRole";
import { usePersonalChecklist } from "@/hooks/usePersonalChecklist";
import { ParsedTask } from "./GeneratedTaskItem";

type DashboardType = "product" | "operational" | "strategic" | "personal";

interface TaskConfig {
  dashboard: DashboardType;
  projectId: string;
  title: string;
  details: string;
  assignedUserId: string;
  dueDate: Date | undefined;
  priority: TaskPriority;
}

interface TaskCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTasks: ParsedTask[];
  onComplete: () => void;
}

const TaskCreationWizard = ({
  open,
  onOpenChange,
  selectedTasks,
  onComplete,
}: TaskCreationWizardProps) => {
  const { toast } = useToast();
  const { addTask } = useTasks();
  const { projects, addProject } = useProjects();
  const { members } = useTeamMembers();
  const { canAccessOperational, canAccessStrategic, isAdmin } = useUserRole();
  const { addItem: addChecklistItem } = usePersonalChecklist();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [taskConfigs, setTaskConfigs] = useState<TaskConfig[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Initialize task configs when modal opens
  useEffect(() => {
    if (open && selectedTasks.length > 0) {
      setTaskConfigs(
        selectedTasks.map((task) => ({
          dashboard: (task.destination || "product") as DashboardType,
          projectId: task.projectId || "",
          title: task.text,
          details: task.description || "",
          assignedUserId: task.assignedUserId || "",
          dueDate: task.dueDate,
          priority: (task.priority || "medium") as TaskPriority,
        }))
      );
      setCurrentIndex(0);
      setCompletedCount(0);
    }
  }, [open, selectedTasks]);

  const currentConfig = taskConfigs[currentIndex];
  const isLastTask = currentIndex === taskConfigs.length - 1;
  const progress = ((currentIndex + 1) / taskConfigs.length) * 100;

  const updateCurrentConfig = (updates: Partial<TaskConfig>) => {
    setTaskConfigs((prev) =>
      prev.map((config, i) =>
        i === currentIndex ? { ...config, ...updates } : config
      )
    );
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreatingProject(true);
    try {
      const project = await addProject(newProjectName.trim(), "", undefined);
      if (project) {
        updateCurrentConfig({ projectId: project.id });
        setNewProjectName("");
        toast({ title: "Project created" });
      }
    } catch (error) {
      toast({ title: "Failed to create project", variant: "destructive" });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const createSingleTask = async (config: TaskConfig) => {
    if (config.dashboard === "personal") {
      await addChecklistItem({
        title: config.title.trim(),
        description: config.details.trim() || undefined,
        dueDate: config.dueDate ? config.dueDate.toISOString() : undefined,
        priority: config.priority,
        projectId: config.projectId || undefined,
      });
    } else {
      // Map dashboard to category - strategic must be explicitly set
      let category: string;
      if (config.dashboard === "strategic") {
        category = "strategic";
      } else if (config.dashboard === "operational") {
        category = "operational";
      } else {
        category = "product"; // Default to product for any other case
      }

      await addTask(
        config.title.trim(),
        "ListTodo",
        category,
        config.priority,
        config.details.trim(),
        "weekly",
        config.projectId || null,
        config.dueDate ? config.dueDate.toISOString().split("T")[0] : null,
        config.assignedUserId || null,
        config.assignedUserId ? [config.assignedUserId] : [],
        false
      );
    }
  };

  const handleNext = () => {
    if (!currentConfig?.title.trim()) {
      toast({ title: "Please enter a task title", variant: "destructive" });
      return;
    }
    setCurrentIndex((prev) => Math.min(prev + 1, taskConfigs.length - 1));
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleCreateAll = async () => {
    // Validate all tasks have titles
    const invalidIndex = taskConfigs.findIndex((c) => !c.title.trim());
    if (invalidIndex !== -1) {
      setCurrentIndex(invalidIndex);
      toast({ title: "Please enter a title for all tasks", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;

    try {
      for (let i = 0; i < taskConfigs.length; i++) {
        try {
          await createSingleTask(taskConfigs[i]);
          successCount++;
          setCompletedCount(successCount);
        } catch (error) {
          console.error(`Failed to create task ${i + 1}:`, error);
        }
      }

      toast({
        title: `Created ${successCount} of ${taskConfigs.length} tasks`,
        description: successCount === taskConfigs.length ? "All tasks created successfully!" : undefined,
      });

      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create tasks:", error);
      toast({
        title: "Failed to create some tasks",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentConfig) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              Task {currentIndex + 1} of {taskConfigs.length}
            </span>
            {isSubmitting && (
              <span className="text-sm font-normal text-muted-foreground">
                Creating {completedCount + 1}/{taskConfigs.length}...
              </span>
            )}
          </DialogTitle>
          <Progress value={progress} className="h-1 mt-2" />
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Dashboard Selection */}
          <div className="space-y-2">
            <Label>Select Dashboard</Label>
            <Select
              value={currentConfig.dashboard}
              onValueChange={(v) => updateCurrentConfig({ dashboard: v as DashboardType })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a dashboard" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product Management</SelectItem>
                {canAccessOperational && (
                  <SelectItem value="operational">Operations</SelectItem>
                )}
                {canAccessStrategic && (
                  <SelectItem value="strategic">Strategic</SelectItem>
                )}
                <SelectItem value="personal">Personal Checklist</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label>Select Project or Create New</Label>
            <Select
              value={currentConfig.projectId || "none"}
              onValueChange={(v) => updateCurrentConfig({ projectId: v === "none" ? "" : v })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a project (optional)" />
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

            {isAdmin && (
              <div className="flex gap-2">
                <Input
                  placeholder="Or create new project..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || isCreatingProject || isSubmitting}
                >
                  {isCreatingProject ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={currentConfig.title}
              onChange={(e) => updateCurrentConfig({ title: e.target.value })}
              placeholder="Enter task title"
              disabled={isSubmitting}
            />
          </div>

          {/* Task Details */}
          <div className="space-y-2">
            <Label htmlFor="details">Task Details (Optional)</Label>
            <Textarea
              id="details"
              value={currentConfig.details}
              onChange={(e) => updateCurrentConfig({ details: e.target.value })}
              placeholder="Enter task details"
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Team Member Assignment - Only for Product dashboard */}
          {currentConfig.dashboard === "product" && members.length > 0 && (
            <div className="space-y-2">
              <Label>Assign Team Member (Optional)</Label>
              <Select
                value={currentConfig.assignedUserId || "none"}
                onValueChange={(v) => updateCurrentConfig({ assignedUserId: v === "none" ? "" : v })}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
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
            </div>
          )}

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !currentConfig.dueDate && "text-muted-foreground"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentConfig.dueDate
                    ? format(currentConfig.dueDate, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentConfig.dueDate}
                  onSelect={(date) => updateCurrentConfig({ dueDate: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={currentConfig.priority}
              onValueChange={(v) => updateCurrentConfig({ priority: v as TaskPriority })}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentIndex === 0 || isSubmitting}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <div className="flex gap-2">
              {!isLastTask && (
                <Button variant="outline" onClick={handleNext} className="gap-2" disabled={isSubmitting}>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              <Button
                onClick={handleCreateAll}
                disabled={isSubmitting}
                className="gap-2 bg-brand-green hover:bg-brand-green/90 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create All ({taskConfigs.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCreationWizard;
