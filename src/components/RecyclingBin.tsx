import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { formatDistanceToNow, differenceInDays, addDays } from "date-fns";

interface DeletedTask {
  id: string;
  title: string;
  category: string;
  priority: string;
  deleted_at: string;
}

interface DeletedProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deleted_at: string;
}

interface RecyclingBinProps {
  onRestore?: () => void;
  variant?: "tasks" | "projects" | "both";
}

export const RecyclingBin = ({ onRestore, variant = "both" }: RecyclingBinProps) => {
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);
  const [deletedProjects, setDeletedProjects] = useState<DeletedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"tasks" | "projects">(
    variant === "projects" ? "projects" : "tasks"
  );
  const { user } = useAuth();
  const { organization, profile } = useOrganization();
  const { toast } = useToast();
  const activeOrgId = organization?.id || profile?.organization_id;

  const fetchDeletedItems = async () => {
    if (!user || !activeOrgId) return;

    setLoading(true);
    try {
      // Fetch deleted tasks if needed
      if (variant === "tasks" || variant === "both") {
        const { data: tasksData, error: tasksError } = await supabase
          .from("tasks")
          .select("id, title, category, priority, deleted_at")
          .eq("organization_id", activeOrgId)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false });

        if (tasksError) throw tasksError;
        setDeletedTasks(tasksData || []);
      }

      // Fetch deleted projects if needed
      if (variant === "projects" || variant === "both") {
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, title, description, status, deleted_at")
          .eq("organization_id", activeOrgId)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false });

        if (projectsError) throw projectsError;
        setDeletedProjects(projectsData || []);
      }
    } catch (error) {
      console.error("Error fetching deleted items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeletedItems();
      setSelectedTaskIds(new Set());
      setSelectedProjectIds(new Set());
    } else {
      // Clear stale data when org changes while sheet is closed
      setDeletedTasks([]);
      setDeletedProjects([]);
    }
  }, [isOpen, user, activeOrgId]);

  // Task selection handlers
  const toggleTaskSelect = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllTasks = () => {
    if (selectedTaskIds.size === deletedTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(deletedTasks.map((t) => t.id)));
    }
  };

  // Project selection handlers
  const toggleProjectSelect = (id: string) => {
    setSelectedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllProjects = () => {
    if (selectedProjectIds.size === deletedProjects.length) {
      setSelectedProjectIds(new Set());
    } else {
      setSelectedProjectIds(new Set(deletedProjects.map((p) => p.id)));
    }
  };

  // Task restore/delete handlers
  const restoreTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: null })
        .eq("id", taskId);

      if (error) throw error;

      setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      onRestore?.();

      toast({
        title: "Task restored",
        description: "The task has been restored successfully",
      });
    } catch (error) {
      console.error("Error restoring task:", error);
      toast({
        title: "Error",
        description: "Failed to restore task",
        variant: "destructive",
      });
    }
  };

  const bulkRestoreTasks = async () => {
    if (selectedTaskIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: null })
        .in("id", Array.from(selectedTaskIds));

      if (error) throw error;

      const count = selectedTaskIds.size;
      setDeletedTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
      setSelectedTaskIds(new Set());
      onRestore?.();

      toast({
        title: "Tasks restored",
        description: `${count} task${count > 1 ? "s" : ""} restored successfully`,
      });
    } catch (error) {
      console.error("Error restoring tasks:", error);
      toast({
        title: "Error",
        description: "Failed to restore tasks",
        variant: "destructive",
      });
    }
  };

  const permanentlyDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });

      toast({
        title: "Task permanently deleted",
        description: "The task has been permanently deleted",
      });
    } catch (error) {
      console.error("Error permanently deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to permanently delete task",
        variant: "destructive",
      });
    }
  };

  const bulkDeleteTasks = async () => {
    if (selectedTaskIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", Array.from(selectedTaskIds));

      if (error) throw error;

      const count = selectedTaskIds.size;
      setDeletedTasks((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
      setSelectedTaskIds(new Set());

      toast({
        title: "Tasks permanently deleted",
        description: `${count} task${count > 1 ? "s" : ""} permanently deleted`,
      });
    } catch (error) {
      console.error("Error deleting tasks:", error);
      toast({
        title: "Error",
        description: "Failed to delete tasks",
        variant: "destructive",
      });
    }
  };

  // Project restore/delete handlers
  const restoreProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: null })
        .eq("id", projectId);

      if (error) throw error;

      setDeletedProjects((prev) => prev.filter((p) => p.id !== projectId));
      setSelectedProjectIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
      onRestore?.();

      toast({
        title: "Project restored",
        description: "The project has been restored successfully",
      });
    } catch (error) {
      console.error("Error restoring project:", error);
      toast({
        title: "Error",
        description: "Failed to restore project",
        variant: "destructive",
      });
    }
  };

  const bulkRestoreProjects = async () => {
    if (selectedProjectIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("projects")
        .update({ deleted_at: null })
        .in("id", Array.from(selectedProjectIds));

      if (error) throw error;

      const count = selectedProjectIds.size;
      setDeletedProjects((prev) => prev.filter((p) => !selectedProjectIds.has(p.id)));
      setSelectedProjectIds(new Set());
      onRestore?.();

      toast({
        title: "Projects restored",
        description: `${count} project${count > 1 ? "s" : ""} restored successfully`,
      });
    } catch (error) {
      console.error("Error restoring projects:", error);
      toast({
        title: "Error",
        description: "Failed to restore projects",
        variant: "destructive",
      });
    }
  };

  const permanentlyDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);

      if (error) throw error;

      setDeletedProjects((prev) => prev.filter((p) => p.id !== projectId));
      setSelectedProjectIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });

      toast({
        title: "Project permanently deleted",
        description: "The project has been permanently deleted",
      });
    } catch (error) {
      console.error("Error permanently deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to permanently delete project",
        variant: "destructive",
      });
    }
  };

  const bulkDeleteProjects = async () => {
    if (selectedProjectIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .in("id", Array.from(selectedProjectIds));

      if (error) throw error;

      const count = selectedProjectIds.size;
      setDeletedProjects((prev) => prev.filter((p) => !selectedProjectIds.has(p.id)));
      setSelectedProjectIds(new Set());

      toast({
        title: "Projects permanently deleted",
        description: `${count} project${count > 1 ? "s" : ""} permanently deleted`,
      });
    } catch (error) {
      console.error("Error deleting projects:", error);
      toast({
        title: "Error",
        description: "Failed to delete projects",
        variant: "destructive",
      });
    }
  };

  const emptyBin = async () => {
    if (!activeOrgId) return;
    try {
      if (variant === "tasks" || variant === "both") {
        await supabase.from("tasks").delete().eq("organization_id", activeOrgId).not("deleted_at", "is", null);
        setDeletedTasks([]);
      }
      if (variant === "projects" || variant === "both") {
        await supabase.from("projects").delete().eq("organization_id", activeOrgId).not("deleted_at", "is", null);
        setDeletedProjects([]);
      }

      toast({
        title: "Recycling bin emptied",
        description: "All deleted items have been permanently removed",
      });
    } catch (error) {
      console.error("Error emptying recycling bin:", error);
      toast({
        title: "Error",
        description: "Failed to empty recycling bin",
        variant: "destructive",
      });
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt);
    const expiryDate = addDays(deleteDate, 30);
    return differenceInDays(expiryDate, new Date());
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "operational":
        return "Operational";
      case "strategic":
        return "Strategic";
      case "product":
        return "Product";
      default:
        return category;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-priority-high/10 text-priority-high";
      case "medium":
        return "bg-priority-medium/10 text-priority-medium";
      case "low":
        return "bg-priority-low/10 text-priority-low";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "in_progress":
        return "In Progress";
      case "done":
        return "Complete";
      default:
        return status;
    }
  };

  const totalCount = deletedTasks.length + deletedProjects.length;
  const currentCount = variant === "tasks" ? deletedTasks.length : 
                       variant === "projects" ? deletedProjects.length : totalCount;

  const renderTaskItem = (task: DeletedTask) => {
    const daysRemaining = getDaysRemaining(task.deleted_at);
    return (
      <div
        key={task.id}
        className={`p-3 bg-card border rounded-lg space-y-2 transition-colors ${
          selectedTaskIds.has(task.id) ? "border-primary/50 bg-primary/5" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selectedTaskIds.has(task.id)}
            onCheckedChange={() => toggleTaskSelect(task.id)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary"
                  onClick={() => restoreTask(task.id)}
                  title="Restore task"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => permanentlyDeleteTask(task.id)}
                  title="Delete permanently"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-2">
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(task.category)}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-xs ${getPriorityColor(task.priority)}`}
              >
                {task.priority}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Calendar className="w-3 h-3" />
              <span>
                Deleted{" "}
                {formatDistanceToNow(new Date(task.deleted_at), { addSuffix: true })}
              </span>
              <span className="mx-1">•</span>
              <span className={daysRemaining <= 7 ? "text-destructive" : ""}>
                {daysRemaining} days left
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectItem = (project: DeletedProject) => {
    const daysRemaining = getDaysRemaining(project.deleted_at);
    return (
      <div
        key={project.id}
        className={`p-3 bg-card border rounded-lg space-y-2 transition-colors ${
          selectedProjectIds.has(project.id) ? "border-primary/50 bg-primary/5" : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selectedProjectIds.has(project.id)}
            onCheckedChange={() => toggleProjectSelect(project.id)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm line-clamp-2">{project.title}</h4>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary"
                  onClick={() => restoreProject(project.id)}
                  title="Restore project"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => permanentlyDeleteProject(project.id)}
                  title="Delete permanently"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {project.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap mt-2">
              <Badge variant="secondary" className="text-xs">
                {getStatusLabel(project.status)}
              </Badge>
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Calendar className="w-3 h-3" />
              <span>
                Deleted{" "}
                {formatDistanceToNow(new Date(project.deleted_at), { addSuffix: true })}
              </span>
              <span className="mx-1">•</span>
              <span className={daysRemaining <= 7 ? "text-destructive" : ""}>
                {daysRemaining} days left
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBulkActions = (type: "tasks" | "projects") => {
    const selectedIds = type === "tasks" ? selectedTaskIds : selectedProjectIds;
    const items = type === "tasks" ? deletedTasks : deletedProjects;
    const toggleSelectAll = type === "tasks" ? toggleSelectAllTasks : toggleSelectAllProjects;
    const bulkRestore = type === "tasks" ? bulkRestoreTasks : bulkRestoreProjects;
    const bulkDelete = type === "tasks" ? bulkDeleteTasks : bulkDeleteProjects;

    if (items.length === 0) return null;

    return (
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <Checkbox
            id={`select-all-${type}`}
            checked={selectedIds.size === items.length && items.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <label htmlFor={`select-all-${type}`} className="text-sm cursor-pointer">
            Select all ({selectedIds.size}/{items.length})
          </label>
        </div>

        {selectedIds.size > 0 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={bulkRestore}
              className="gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore ({selectedIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={bulkDelete}
              className="gap-1 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedIds.size})
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={emptyBin}
          className="text-destructive hover:text-destructive"
        >
          Empty Bin
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Recycle Bin</span>
          {currentCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1 flex items-center justify-center text-xs"
            >
              {currentCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Recycling Bin
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Deleted items are kept for 30 days before being permanently removed.
          </p>

          {variant === "both" ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tasks" | "projects")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="tasks" className="gap-1">
                  Tasks
                  {deletedTasks.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {deletedTasks.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-1">
                  Projects
                  {deletedProjects.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {deletedProjects.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tasks" className="mt-0">
                {renderBulkActions("tasks")}
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : deletedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Trash2 className="w-12 h-12 mb-3 opacity-50" />
                      <p>No deleted tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-3">{deletedTasks.map(renderTaskItem)}</div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="projects" className="mt-0">
                {renderBulkActions("projects")}
                <ScrollArea className="h-[calc(100vh-280px)]">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : deletedProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Trash2 className="w-12 h-12 mb-3 opacity-50" />
                      <p>No deleted projects</p>
                    </div>
                  ) : (
                    <div className="space-y-3">{deletedProjects.map(renderProjectItem)}</div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {renderBulkActions(variant)}
              <ScrollArea className="h-[calc(100vh-200px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : variant === "tasks" ? (
                  deletedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Trash2 className="w-12 h-12 mb-3 opacity-50" />
                      <p>No deleted tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-3">{deletedTasks.map(renderTaskItem)}</div>
                  )
                ) : deletedProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Trash2 className="w-12 h-12 mb-3 opacity-50" />
                    <p>No deleted projects</p>
                  </div>
                ) : (
                  <div className="space-y-3">{deletedProjects.map(renderProjectItem)}</div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RecyclingBin;
