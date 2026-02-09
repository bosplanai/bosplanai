import { useState } from "react";
import { Plus, CalendarIcon, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { TaskPriority } from "@/hooks/useTasks";

interface TaskInput {
  id: string;
  title: string;
  description: string;
  dueDate: Date | undefined;
  priority: TaskPriority;
  assignedUserId: string | null;
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProject: (
    title: string,
    description: string,
    dueDate: Date | undefined,
    tasks: Omit<TaskInput, "id">[]
  ) => Promise<void>;
  onSaveDraft?: (
    title: string,
    description: string,
    dueDate: Date | undefined,
    tasks: Omit<TaskInput, "id">[]
  ) => void;
}

const CreateProjectDialog = ({ open, onOpenChange, onCreateProject, onSaveDraft }: CreateProjectDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [tasks, setTasks] = useState<TaskInput[]>([]);
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { members } = useTeamMembers();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate(undefined);
    setTasks([]);
    setIsTasksOpen(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  const addTask = () => {
    setTasks([
      ...tasks,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        dueDate: undefined,
        priority: "medium",
        assignedUserId: null,
      },
    ]);
    setIsTasksOpen(true);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const updateTask = (id: string, updates: Partial<TaskInput>) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      // Filter out tasks without titles
      const validTasks = tasks
        .filter((t) => t.title.trim())
        .map(({ id, ...rest }) => rest);

      await onCreateProject(title, description, dueDate, validTasks);
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAsDraft = () => {
    if (!title.trim() || !onSaveDraft) return;
    const validTasks = tasks
      .filter((t) => t.title.trim())
      .map(({ id, ...rest }) => rest);

    onSaveDraft(title, description, dueDate, validTasks);
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Project Details */}
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              placeholder="Enter project title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter project description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tasks Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <Collapsible open={isTasksOpen} onOpenChange={setIsTasksOpen}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      {isTasksOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="font-medium">
                        Tasks {tasks.length > 0 && `(${tasks.length})`}
                      </span>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTask}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Task
                </Button>
              </div>

              <CollapsibleContent className="space-y-4 pt-4">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tasks added. Click "Add Task" to create tasks for this project.
                  </p>
                ) : (
                  tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="border rounded-md p-3 space-y-3 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Task {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(task.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Input
                          placeholder="Task title..."
                          value={task.title}
                          onChange={(e) =>
                            updateTask(task.id, { title: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Textarea
                          placeholder="Task description (optional)..."
                          value={task.description}
                          onChange={(e) =>
                            updateTask(task.id, { description: e.target.value })
                          }
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Due Date</Label>
                          <Popover modal={true}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "w-full justify-start text-left font-normal text-xs",
                                  !task.dueDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {task.dueDate
                                  ? format(task.dueDate, "MMM d")
                                  : "Set date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={task.dueDate}
                                onSelect={(date) =>
                                  updateTask(task.id, { dueDate: date })
                                }
                                initialFocus
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Priority</Label>
                          <Select
                            value={task.priority}
                            onValueChange={(value: TaskPriority) =>
                              updateTask(task.id, { priority: value })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Assign To</Label>
                          <Select
                            value={task.assignedUserId || "unassigned"}
                            onValueChange={(value) =>
                              updateTask(task.id, {
                                assignedUserId: value === "unassigned" ? null : value,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {members.map((member) => (
                                <SelectItem key={member.id} value={member.id}>
                                  {member.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {onSaveDraft && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAsDraft}
                disabled={!title.trim() || isSubmitting}
              >
                Save as Draft
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || isSubmitting}
              className={`bg-primary hover:bg-primary/90 text-primary-foreground ${!onSaveDraft ? 'col-span-full' : ''}`}
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectDialog;
