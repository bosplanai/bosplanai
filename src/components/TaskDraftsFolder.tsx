import { useState, useEffect } from "react";
import { FileEdit, Trash2, Send, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Badge } from "./ui/badge";
import { useTasks, Task } from "@/hooks/useTasks";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

const TaskDraftsFolder = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const { fetchDraftTasks, publishDraft, deleteTask } = useTasks();
  const { organization, profile } = useOrganization();
  const activeOrgId = organization?.id || profile?.organization_id;
  const { toast } = useToast();

  const loadDrafts = async () => {
    setLoading(true);
    const draftTasks = await fetchDraftTasks();
    setDrafts(draftTasks);
    setLoading(false);
  };

  // Clear drafts when org changes; reload if sheet is open
  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    } else {
      setDrafts([]);
    }
  }, [isOpen, activeOrgId]);

  const handlePublish = async (taskId: string) => {
    const success = await publishDraft(taskId);
    if (success) {
      setDrafts((prev) => prev.filter((d) => d.id !== taskId));
    }
  };

  const handleDelete = async () => {
    if (!draftToDelete) return;
    
    try {
      await deleteTask(draftToDelete);
      setDrafts((prev) => prev.filter((d) => d.id !== draftToDelete));
      toast({
        title: "Draft deleted",
        description: "The draft has been permanently deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDraftToDelete(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileEdit className="w-4 h-4" />
            Drafts
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {drafts.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-muted-foreground" />
              Task Drafts
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileEdit className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="font-medium text-foreground">No drafts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Save tasks as drafts to continue later
                </p>
              </div>
            ) : (
              drafts.map((draft) => (
                <Card key={draft.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{draft.title}</h4>
                      {draft.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {draft.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${getPriorityColor(draft.priority)}`}
                    >
                      {draft.priority}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Created {format(new Date(draft.created_at), "MMM d, yyyy")}</span>
                    {draft.project && (
                      <>
                        <ChevronRight className="w-3 h-3" />
                        <span>{draft.project.title}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handlePublish(draft.id)}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Publish
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDraftToDelete(draft.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskDraftsFolder;
