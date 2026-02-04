import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Download,
  RotateCcw,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FileVersion {
  id: string;
  name: string;
  version: number;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
  status?: string;
  parent_file_id?: string | null;
}

interface DataRoomVersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  versions: FileVersion[];
  isLoading?: boolean;
  profileMap?: Record<string, string>;
  onView: (version: FileVersion) => void;
  onDownload: (version: FileVersion) => void;
  onRestore: (version: FileVersion) => void;
  onDelete: (version: FileVersion) => void;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  not_opened: { label: "Review Pending", color: "text-brand-orange" },
  in_review: { label: "In Review", color: "text-brand-teal" },
  review_failed: { label: "Review Failed", color: "text-brand-coral" },
  being_amended: { label: "Amending", color: "text-brand-orange" },
  completed: { label: "Completed", color: "text-brand-green" },
};

export function DataRoomVersionHistoryDialog({
  open,
  onOpenChange,
  fileName,
  versions,
  isLoading = false,
  profileMap = {},
  onView,
  onDownload,
  onRestore,
  onDelete,
  isRestoring = false,
  isDeleting = false,
}: DataRoomVersionHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            Version History - {fileName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium text-foreground mb-1">No versions yet</h3>
              <p className="text-sm text-muted-foreground">
                Version history will appear here when available
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="px-6 py-4 space-y-3">
                {versions.map((version, index) => {
                  const isLatest = index === 0;
                  const statusDisplay = STATUS_DISPLAY[version.status || "not_opened"] || STATUS_DISPLAY.not_opened;
                  const uploaderName = profileMap[version.uploaded_by] || "Unknown";

                  return (
                    <div
                      key={version.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        isLatest
                          ? "border-brand-orange/50 bg-brand-orange/5"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                            isLatest ? "bg-brand-orange/20" : "bg-muted"
                          )}>
                            <FileText className={cn(
                              "w-5 h-5",
                              isLatest ? "text-brand-orange" : "text-muted-foreground"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                Version {version.version}
                              </span>
                              {isLatest && (
                                <Badge className="bg-brand-orange text-white text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(version.created_at), "dd/MM/yyyy HH:mm")} • {uploaderName}
                            </p>
                            <div className={cn(
                              "inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded text-xs font-medium",
                              statusDisplay.color
                            )}>
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                version.status === "completed" ? "bg-brand-green" :
                                version.status === "review_failed" ? "bg-brand-coral" :
                                version.status === "in_review" ? "bg-brand-teal" : "bg-brand-orange"
                              )} />
                              {statusDisplay.label}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onView(version)}
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onDownload(version)}
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {!isLatest && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary"
                                onClick={() => onRestore(version)}
                                disabled={isRestoring}
                                title="Restore this version"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                              {versions.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => onDelete(version)}
                                  disabled={isDeleting}
                                  title="Delete this version"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DataRoomVersionHistoryDialog;
