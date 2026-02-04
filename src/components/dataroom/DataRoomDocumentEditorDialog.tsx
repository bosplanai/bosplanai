import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DocumentEditor } from "@/components/drive/DocumentEditor";
import { DataRoomDocumentVersionHistory } from "./DataRoomDocumentVersionHistory";
import { useDataRoomDocumentEditor } from "@/hooks/useDataRoomDocumentEditor";
import { supabase } from "@/integrations/supabase/client";
import { X, FileText, Cloud, CloudOff, Users, Loader2, Check, Save, Download, FileDown, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface DataRoomDocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    name: string;
    file_path?: string;
    mime_type?: string | null;
  } | null;
  dataRoomId: string;
  organizationId: string;
}

export function DataRoomDocumentEditorDialog({
  open,
  onOpenChange,
  file,
  dataRoomId,
  organizationId,
}: DataRoomDocumentEditorDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();
  const wasOpenRef = useRef(false);

  const {
    content,
    contentType,
    isLoading,
    isParsing,
    isSaving,
    lastSaved,
    collaborators,
    versions,
    isLoadingVersions,
    updateContent,
    save,
    saveVersion,
    restoreVersion,
    fetchVersions,
    reloadFromFile,
  } = useDataRoomDocumentEditor({
    fileId: file?.id || "",
    dataRoomId,
    organizationId,
    filePath: file?.file_path,
    mimeType: file?.mime_type || undefined,
  });

  // Invalidate file queries when dialog closes to refresh version counts
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      // Dialog was open and is now closing - invalidate queries to refresh version counts
      queryClient.invalidateQueries({ queryKey: ["data-room-files"] });
      queryClient.invalidateQueries({ queryKey: ["data-room-file-versions"] });
    }
    wasOpenRef.current = open;
  }, [open, queryClient]);

  const handleExport = async (format: string) => {
    if (!file || !content) return;
    
    // Handle PDF export with browser print
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <title>${file.name}</title>
              <style>
                @media print {
                  @page { margin: 1in; size: A4; }
                }
                body { 
                  font-family: 'Times New Roman', Georgia, serif; 
                  font-size: 12pt; 
                  line-height: 1.6;
                  color: #000;
                  max-width: 800px;
                  margin: 0 auto;
                  padding: 2em;
                }
                h1 { font-size: 24pt; font-weight: bold; margin: 0.5em 0; }
                h2 { font-size: 18pt; font-weight: bold; margin: 0.5em 0; }
                h3 { font-size: 14pt; font-weight: bold; margin: 0.5em 0; }
                p { margin: 0.5em 0; }
                table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                td, th { border: 1px solid #000; padding: 8px; }
                th { background: #f0f0f0; font-weight: bold; }
                blockquote { border-left: 3px solid #ccc; padding-left: 1em; margin: 1em 0; color: #555; }
                ul, ol { margin: 0.5em 0; padding-left: 2em; }
                img { max-width: 100%; height: auto; }
              </style>
            </head>
            <body>
              ${content}
            </body>
          </html>
        `;
        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
        toast.success("Print dialog opened - select 'Save as PDF' to export");
      } else {
        toast.error("Could not open print window. Please allow popups.");
      }
      return;
    }
    
    setIsExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        toast.error("Not authenticated");
        return;
      }

      const response = await fetch(
        `https://qiikjhvzlwzysbtzhdcd.supabase.co/functions/v1/export-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            format,
            fileName: file.name,
          }),
        }
      );

      const result = await response.json();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Download the file
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export document");
    } finally {
      setIsExporting(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">{file.name}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isSaving ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" />
                    Saved {format(lastSaved, "h:mm a")}
                  </span>
                ) : (
                  <span>Not saved</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isExporting || !content}
                      className="gap-2"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Download document in various formats</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExport('docx')} className="gap-2">
                  <FileDown className="w-4 h-4 text-blue-600" />
                  <div className="flex flex-col">
                    <span>Word Document</span>
                    <span className="text-xs text-muted-foreground">.docx</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2">
                  <FileDown className="w-4 h-4 text-red-600" />
                  <div className="flex flex-col">
                    <span>PDF Document</span>
                    <span className="text-xs text-muted-foreground">.pdf</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('rtf')} className="gap-2">
                  <FileDown className="w-4 h-4 text-purple-600" />
                  <div className="flex flex-col">
                    <span>Rich Text Format</span>
                    <span className="text-xs text-muted-foreground">.rtf</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('html')} className="gap-2">
                  <FileDown className="w-4 h-4 text-orange-600" />
                  <div className="flex flex-col">
                    <span>HTML Document</span>
                    <span className="text-xs text-muted-foreground">.html</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('txt')} className="gap-2">
                  <FileDown className="w-4 h-4 text-gray-600" />
                  <div className="flex flex-col">
                    <span>Plain Text</span>
                    <span className="text-xs text-muted-foreground">.txt</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Version History Button */}
            <DataRoomDocumentVersionHistory
              versions={versions}
              isLoading={isLoadingVersions}
              onRestore={restoreVersion}
              onRefresh={fetchVersions}
              currentContent={content}
            />

            {/* Save Version Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveVersion("Manual save")}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Version</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a named version snapshot</TooltipContent>
            </Tooltip>

            {/* Reload from File Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reloadFromFile}
                  disabled={isParsing || !file?.file_path}
                  className="gap-2"
                >
                  {isParsing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Reload</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload content from original uploaded file</TooltipContent>
            </Tooltip>

            {/* Collaborators */}
            {collaborators.length > 0 && (
              <div className="flex items-center gap-2 ml-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div className="flex -space-x-2">
                  {collaborators.slice(0, 3).map((collaborator) => (
                    <Tooltip key={collaborator.user_id}>
                      <TooltipTrigger asChild>
                        <Avatar className="w-7 h-7 border-2 border-background">
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                            {collaborator.full_name?.charAt(0)?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        {collaborator.full_name || "Unknown"} is editing
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {collaborators.length > 3 && (
                    <Avatar className="w-7 h-7 border-2 border-background">
                      <AvatarFallback className="text-xs bg-muted">
                        +{collaborators.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            )}

            {/* Sync Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                  isSaving ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                )}>
                  {isSaving ? (
                    <>
                      <CloudOff className="w-3 h-3" />
                      Syncing
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3" />
                      Synced
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isSaving ? "Changes are being saved..." : "All changes saved to cloud"}
              </TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {isLoading || isParsing ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              {isParsing && (
                <p className="text-sm text-muted-foreground">Extracting content from uploaded file...</p>
              )}
            </div>
          ) : (
            <DocumentEditor
              content={content}
              onContentChange={updateContent}
              contentType={contentType}
              className="h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
