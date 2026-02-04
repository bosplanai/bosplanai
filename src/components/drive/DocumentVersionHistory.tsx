import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentVersion } from "@/hooks/useDocumentEditor";
import { History, RotateCcw, Eye, Clock, User, FileText, Loader2, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

interface DocumentVersionHistoryProps {
  versions: DocumentVersion[];
  isLoading: boolean;
  onRestore: (version: DocumentVersion) => void;
  onRefresh: () => void;
  currentContent: string;
}

export function DocumentVersionHistory({
  versions,
  isLoading,
  onRestore,
  onRefresh,
  currentContent,
}: DocumentVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<DocumentVersion | null>(null);

  const handleRestore = () => {
    if (confirmRestore) {
      onRestore(confirmRestore);
      setConfirmRestore(null);
      setIsOpen(false);
    }
  };

  return (
    <>

      {/* Version History Panel */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Version History
            </DialogTitle>
            <DialogDescription>
              View and restore previous versions of this document
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-foreground mb-1">No versions yet</h3>
                <p className="text-sm text-muted-foreground">
                  Versions are automatically saved as you edit the document
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="px-6 py-4 space-y-3">
                  {versions.map((version, index) => (
                    <div
                      key={version.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        index === 0 
                          ? "border-primary/50 bg-primary/5" 
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              Version {version.version_number}
                            </span>
                            {index === 0 && (
                              <Badge variant="default" className="text-xs">
                                Latest
                              </Badge>
                            )}
                          </div>
                          
                          {version.version_note && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                              {version.version_note}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {version.creator_name}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="flex items-center gap-1 cursor-help">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {format(new Date(version.created_at), "PPpp")}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPreviewVersion(version)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview this version</TooltipContent>
                          </Tooltip>

                          {index !== 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => setConfirmRestore(version)}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Restore
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Restore this version</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Version Dialog */}
      <Dialog open={!!previewVersion} onOpenChange={(open) => !open && setPreviewVersion(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Version {previewVersion?.version_number} Preview
              </DialogTitle>
            </div>
            <DialogDescription>
              {previewVersion?.version_note || `Created ${previewVersion ? formatDistanceToNow(new Date(previewVersion.created_at), { addSuffix: true }) : ''}`}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 max-h-[500px]">
            <div 
              className="px-8 py-6 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewVersion?.content || "") }}
            />
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button variant="outline" onClick={() => setPreviewVersion(null)}>
              Close
            </Button>
            {previewVersion && versions[0]?.id !== previewVersion.id && (
              <Button onClick={() => {
                setConfirmRestore(previewVersion);
                setPreviewVersion(null);
              }} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Restore This Version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Restore Dialog */}
      <Dialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Restore Version {confirmRestore?.version_number}?</DialogTitle>
            <DialogDescription>
              This will replace the current document content with this version. 
              Your current content will be saved as a new version before restoring.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
