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
import { formatDistanceToNow, differenceInDays, addDays } from "date-fns";

interface DeletedTask {
  id: string;
  title: string;
  category: string;
  priority: string;
  deleted_at: string;
}

export const RecyclingBin = ({ onRestore }: { onRestore?: () => void }) => {
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { profile } = useOrganization();
  const { toast } = useToast();

  const fetchDeletedTasks = async () => {
    if (!user || !profile) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, category, priority, deleted_at")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      setDeletedTasks(data || []);
    } catch (error) {
      console.error("Error fetching deleted tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeletedTasks();
      setSelectedIds(new Set());
    }
  }, [isOpen, user, profile]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === deletedTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletedTasks.map((t) => t.id)));
    }
  };

  const restoreTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: null })
        .eq("id", taskId);

      if (error) throw error;

      setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedIds((prev) => {
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

  const bulkRestore = async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: null })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      const count = selectedIds.size;
      setDeletedTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
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

  const permanentlyDelete = async (taskId: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);

      if (error) throw error;

      setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedIds((prev) => {
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

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      const count = selectedIds.size;
      setDeletedTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());

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

  const emptyBin = async () => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .not("deleted_at", "is", null);

      if (error) throw error;

      setDeletedTasks([]);

      toast({
        title: "Recycling bin emptied",
        description: "All deleted tasks have been permanently removed",
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

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 relative"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Recycle Bin</span>
          {deletedTasks.length > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 px-1 flex items-center justify-center text-xs">
              {deletedTasks.length}
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
            Deleted tasks are kept for 30 days before being permanently removed.
          </p>

          {deletedTasks.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 mr-auto">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.size === deletedTasks.length && deletedTasks.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select all ({selectedIds.size}/{deletedTasks.length})
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
          )}

          <ScrollArea className="h-[calc(100vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : deletedTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Trash2 className="w-12 h-12 mb-3 opacity-50" />
                <p>Recycling bin is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deletedTasks.map((task) => {
                  const daysRemaining = getDaysRemaining(task.deleted_at);

                  return (
                    <div
                      key={task.id}
                      className={`p-3 bg-card border rounded-lg space-y-2 transition-colors ${
                        selectedIds.has(task.id) ? "border-primary/50 bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(task.id)}
                          onCheckedChange={() => toggleSelect(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {task.title}
                            </h4>
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
                                onClick={() => permanentlyDelete(task.id)}
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
                              {formatDistanceToNow(new Date(task.deleted_at), {
                                addSuffix: true,
                              })}
                            </span>
                            <span className="mx-1">•</span>
                            <span
                              className={
                                daysRemaining <= 7 ? "text-destructive" : ""
                              }
                            >
                              {daysRemaining} days left
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RecyclingBin;
