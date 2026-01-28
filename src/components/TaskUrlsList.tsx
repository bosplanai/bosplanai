import { useState } from "react";
import { Link2, Plus, X, ExternalLink, Loader2 } from "lucide-react";
import { useTaskUrls, TaskUrl } from "@/hooks/useTaskUrls";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface TaskUrlsListProps {
  taskId: string;
  organizationId: string;
  canEdit?: boolean;
}

const TaskUrlsList = ({
  taskId,
  organizationId,
  canEdit = true,
}: TaskUrlsListProps) => {
  const { urls, loading, addUrl, deleteUrl } = useTaskUrls(taskId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUrl = async () => {
    if (!newUrl.trim()) return;
    
    setIsAdding(true);
    await addUrl(newUrl, null, organizationId);
    setNewUrl("");
    setIsAdding(false);
  };

  const handleRemove = (url: TaskUrl) => {
    deleteUrl(url.id);
  };

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return url;
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* View URLs Button */}
      {urls.length > 0 && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Link2 className="w-3 h-3" />
              View URLs ({urls.length})
            </button>
          </DialogTrigger>
          <DialogContent
            className="max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>Task URLs</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading URLs...
                </div>
              ) : (
                urls.map((url) => (
                  <div
                    key={url.id}
                    className="flex items-center justify-between p-2 bg-muted rounded-md text-sm group"
                  >
                    <a
                      href={url.url.startsWith("http") ? url.url : `https://${url.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 min-w-0 flex-1 text-primary hover:underline"
                    >
                      <Link2 className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{formatUrl(url.url)}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" />
                    </a>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(url)}
                        className="h-6 w-6 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}

              {/* Add URL input in dialog */}
              {canEdit && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Input
                    placeholder="https://example.com"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddUrl();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleAddUrl}
                    disabled={!newUrl.trim() || isAdding}
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add URL Button - only show when no URLs exist */}
      {canEdit && urls.length === 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Link2 className="w-3 h-3" />
              Add URL
            </button>
          </DialogTrigger>
          <DialogContent
            className="max-w-md"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>Add URL</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 pt-4">
              <Input
                placeholder="https://example.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleAddUrl}
                disabled={!newUrl.trim() || isAdding}
              >
                {isAdding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TaskUrlsList;
