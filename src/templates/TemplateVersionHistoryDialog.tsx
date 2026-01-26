import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Template, TemplateVersion, useTemplates } from "@/hooks/useTemplates";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, ChevronDown, ChevronRight, CheckSquare } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TemplateVersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
}

const TemplateVersionHistoryDialog = ({ open, onOpenChange, template }: TemplateVersionHistoryDialogProps) => {
  const { getTemplateVersions, rollbackToVersion } = useTemplates();
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<{ id: string; number: number } | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  useEffect(() => {
    const loadVersions = async () => {
      if (open && template.id) {
        setLoading(true);
        const data = await getTemplateVersions(template.id);
        setVersions(data);
        setLoading(false);
      }
    };
    loadVersions();
  }, [open, template.id]);

  const toggleVersion = (versionId: string) => {
    const newExpanded = new Set(expandedVersions);
    if (newExpanded.has(versionId)) {
      newExpanded.delete(versionId);
    } else {
      newExpanded.add(versionId);
    }
    setExpandedVersions(newExpanded);
  };

  const handleRollbackClick = (versionId: string, versionNumber: number) => {
    setSelectedVersion({ id: versionId, number: versionNumber });
    setRollbackDialogOpen(true);
  };

  const handleRollbackConfirm = async () => {
    if (!selectedVersion) return;
    
    setIsRollingBack(true);
    try {
      await rollbackToVersion(template.id, selectedVersion.id, selectedVersion.number);
      const data = await getTemplateVersions(template.id);
      setVersions(data);
    } finally {
      setIsRollingBack(false);
      setRollbackDialogOpen(false);
      setSelectedVersion(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <DialogTitle>Version History</DialogTitle>
            </div>
            <DialogDescription>
              {template.name} - View all versions and rollback if needed
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse p-4 border rounded-lg">
                    <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No version history available
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <Collapsible 
                    key={version.id} 
                    open={expandedVersions.has(version.id)}
                    onOpenChange={() => toggleVersion(version.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {expandedVersions.has(version.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Version {version.version_number}</span>
                                {index === 0 && (
                                  <Badge variant="secondary" className="text-xs">Current</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {version.version_note || "No description"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                            {index !== 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRollbackClick(version.id, version.version_number);
                                }}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Rollback
                              </Button>
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                            <CheckSquare className="h-4 w-4" />
                            Tasks in this version ({version.tasks?.length || 0})
                          </h4>
                          {version.tasks && version.tasks.length > 0 ? (
                            <div className="space-y-1">
                              {version.tasks.map((task) => (
                                <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                                  <span className="text-muted-foreground">•</span>
                                  <span>{task.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {task.priority}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No tasks in this version</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback to Version {selectedVersion?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a new version with the same tasks as version {selectedVersion?.number}. 
              No data will be lost - you can always rollback again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollbackConfirm} disabled={isRollingBack}>
              {isRollingBack ? "Rolling back..." : "Confirm Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TemplateVersionHistoryDialog;
