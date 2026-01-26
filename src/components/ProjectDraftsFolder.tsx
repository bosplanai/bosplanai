import { useEffect, useMemo, useState } from "react";
import { FileEdit, Trash2, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import {
  deleteProjectDraft,
  getProjectDrafts,
  ProjectDraft,
} from "@/lib/projectDrafts";

type Props = {
  onPublishDraft: (draft: ProjectDraft) => Promise<void>;
};

const ProjectDraftsFolder = ({ onPublishDraft }: Props) => {
  const { organization } = useOrganization();
  const { toast } = useToast();

  const organisationId = organization?.id ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  const draftsCount = useMemo(() => drafts.length, [drafts]);

  const loadDrafts = () => {
    if (!organisationId) return;
    setLoading(true);
    try {
      setDrafts(getProjectDrafts(organisationId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && organisationId) {
      loadDrafts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, organisationId]);

  const handlePublish = async (draft: ProjectDraft) => {
    try {
      setPublishing(draft.id);
      await onPublishDraft(draft);
      if (organisationId) {
        deleteProjectDraft(organisationId, draft.id);
        setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      }
      toast({
        title: "Draft published",
        description: "Your project has been created.",
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Failed to publish draft",
        variant: "destructive",
      });
    } finally {
      setPublishing(null);
    }
  };

  const handleDelete = () => {
    if (!draftToDelete || !organisationId) return;
    try {
      deleteProjectDraft(organisationId, draftToDelete);
      setDrafts((prev) => prev.filter((d) => d.id !== draftToDelete));
      toast({
        title: "Draft deleted",
        description: "The project draft has been permanently deleted",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDraftToDelete(null);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <FileEdit className="w-4 h-4" />
            Drafts
            {draftsCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {draftsCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-muted-foreground" />
              Project Drafts
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {!organisationId ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="font-medium text-foreground">No organisation selected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Select an organisation to view project drafts.
                </p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileEdit className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="font-medium text-foreground">No drafts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Save projects as drafts to continue later.
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
                    {draft.tasks.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {draft.tasks.length} task{draft.tasks.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Saved {format(new Date(draft.createdAtISO), "MMM d, yyyy")}
                    </span>
                    {draft.dueDateISO && (
                      <span>
                        Due {format(new Date(draft.dueDateISO), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => handlePublish(draft)}
                      disabled={publishing === draft.id}
                    >
                      {publishing === draft.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                      )}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project draft? This action cannot be undone.
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

export default ProjectDraftsFolder;
