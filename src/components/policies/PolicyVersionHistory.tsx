import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, FileText, Download, Eye, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Policy, usePolicies } from "@/hooks/usePolicies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PolicyFilePreviewDialog, type PolicyPreviewFile } from "./PolicyFilePreviewDialog";

interface PolicyVersionHistoryProps {
  policy: Policy | null;
  onClose: () => void;
}

export const PolicyVersionHistory = ({ policy, onClose }: PolicyVersionHistoryProps) => {
  const { usePolicyVersions } = usePolicies();
  const { data: versions = [], isLoading } = usePolicyVersions(policy?.id || null);
  const [previewFile, setPreviewFile] = useState<PolicyPreviewFile | null>(null);

  const handleDownloadVersion = async (filePath: string | undefined, originalFileName: string) => {
    if (!filePath) return;

    try {
      const { data, error } = await supabase.storage
        .from("drive-files")
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      // Retain the original file name
      a.download = originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  return (
    <Dialog open={!!policy} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History: {policy?.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading version history...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No version history available
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`relative pl-6 pb-6 ${
                    index < versions.length - 1 ? "border-l-2 border-muted" : ""
                  }`}
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full ${
                      index === 0 ? "bg-primary" : "bg-muted-foreground"
                    }`}
                  />

                  <div className="bg-muted/50 rounded-lg p-4 ml-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            Version {version.version_number}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>

                        {version.change_notes && (
                          <p className="text-sm">{version.change_notes}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(version.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          {version.creator && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {version.creator.full_name}
                            </div>
                          )}
                        </div>

                        {version.file && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded text-sm">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">
                                {version.file.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {version.file && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const fp = version.file?.file_path;
                              if (!fp) return;
                              setPreviewFile({
                                name: version.file?.name || "document",
                                file_path: fp,
                                mime_type: version.file?.mime_type || null,
                              });
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownloadVersion(
                                version.file?.file_path,
                                version.file?.name || "document"
                              )
                            }
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <PolicyFilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />
      </DialogContent>
    </Dialog>
  );
};
