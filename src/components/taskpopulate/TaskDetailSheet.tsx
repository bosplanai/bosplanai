import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Building2, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useProjects } from "@/hooks/useProjects";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useUserOrganizations } from "@/contexts/UserOrganizationsContext";
import { cn } from "@/lib/utils";

export type DestinationType = "personal" | "product" | "operational" | "strategic";

export interface TaskDetails {
  title: string;
  description: string;
  destination: DestinationType;
  projectId: string | null;
  dueDate: Date | undefined;
  priority: "high" | "medium" | "low";
  assignedUserId: string | null;
  organizationId: string | null;
}

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle: string;
  initialDescription?: string;
  initialDestination?: DestinationType;
  initialProjectId?: string | null;
  initialDueDate?: Date;
  initialPriority?: "high" | "medium" | "low";
  initialAssignedUserId?: string | null;
  onSave: (details: TaskDetails) => void;
  canAccessOperational?: boolean;
  canAccessStrategic?: boolean;
}

const priorityOptions = [
  { value: "high", label: "High", className: "text-priority-high" },
  { value: "medium", label: "Medium", className: "text-priority-medium" },
  { value: "low", label: "Low", className: "text-priority-low" },
];

const allDestinationOptions = [
  { value: "personal", label: "Personal Checklist" },
  { value: "product", label: "Product Management" },
  { value: "operational", label: "Operations" },
  { value: "strategic", label: "Strategic" },
];

const TaskDetailSheet = ({
  open,
  onOpenChange,
  initialTitle,
  initialDescription = "",
  initialDestination = "personal",
  initialProjectId = null,
  initialDueDate,
  initialPriority = "medium",
  initialAssignedUserId = null,
  onSave,
  canAccessOperational = true,
  canAccessStrategic = true,
}: TaskDetailSheetProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [destination, setDestination] = useState<DestinationType>(initialDestination);
  const [projectId, setProjectId] = useState<string>(initialProjectId || "none");
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDueDate);
  const [priority, setPriority] = useState<"high" | "medium" | "low">(initialPriority);
  const [assignedUserId, setAssignedUserId] = useState<string>(initialAssignedUserId || "none");
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const { projects, addProject } = useProjects();
  const { members } = useTeamMembers();
  const { organizations, activeOrgId } = useUserOrganizations();
  
  const [selectedOrgId, setSelectedOrgId] = useState<string>(activeOrgId || "");
  const hasMultipleOrgs = organizations.length > 1;

  // Filter destination options based on role permissions
  const destinationOptions = allDestinationOptions.filter(opt => {
    if (opt.value === "operational") return canAccessOperational;
    if (opt.value === "strategic") return canAccessStrategic;
    return true;
  });

  // Reset form when sheet opens with initial values
  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setDestination(initialDestination);
      setProjectId(initialProjectId || "none");
      setDueDate(initialDueDate);
      setPriority(initialPriority);
      setAssignedUserId(initialAssignedUserId || "none");
      setSelectedOrgId(activeOrgId || organizations[0]?.id || "");
      setNewProjectName("");
    }
  }, [open, initialTitle, initialDescription, initialDestination, initialProjectId, initialDueDate, initialPriority, initialAssignedUserId, activeOrgId, organizations]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreatingProject(true);
    try {
      // Pass the selected organization ID to create the project in the correct org
      const project = await addProject(newProjectName.trim(), "", undefined, selectedOrgId || undefined);
      if (project) {
        setProjectId(project.id);
        setNewProjectName("");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim(),
      destination,
      projectId: projectId !== "none" ? projectId : null,
      dueDate,
      priority,
      assignedUserId: assignedUserId !== "none" ? assignedUserId : null,
      organizationId: selectedOrgId || null,
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Task Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Organization Switcher - Only show if user has multiple organizations */}
          {hasMultipleOrgs && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Organization
              </Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Task will be created in the selected organization
              </p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="task-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="Enter a concise task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="task-description">
              Description{" "}
              <span className="text-muted-foreground text-xs">
                ({description.length}/500)
              </span>
            </Label>
            <Textarea
              id="task-description"
              placeholder="Enter description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={4}
              maxLength={500}
            />
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label>Assign To Board</Label>
            <Select
              value={destination}
              onValueChange={(v) => setDestination(v as DestinationType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assign Team Member - Only show for Product Management */}
          {destination === "product" && members.length > 0 && (
            <div className="space-y-2">
              <Label>Assign To Team Member</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member (optional)" />
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

          {/* Project */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)" />
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
            <div className="flex gap-2">
              <Input
                placeholder="Or create new project..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateProject();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || isCreatingProject}
              >
                {isCreatingProject ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDueDate(undefined)}
                className="text-xs text-muted-foreground"
              >
                Clear date
              </Button>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as "high" | "medium" | "low")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    <span className={p.className}>{p.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!title.trim()}
            >
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetailSheet;
