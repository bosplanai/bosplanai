import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  X, 
  Image, 
  FileText, 
  FileIcon, 
  MessageSquare, 
  Send, 
  Loader2, 
  Plus,
  Download,
  Video,
  File,
  Edit,
  FileDown,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { DataRoomDocumentEditorDialog } from "./DataRoomDocumentEditorDialog";
import { sanitizeHtml } from "@/lib/sanitize";
import { toast } from "sonner";
import { 
  isEditableDocument as isEditableDocumentUtil, 
  isOfficeDocument 
} from "@/lib/documentUtils";

interface PreviewFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "video" | "document" | "other";
  mimeType?: string;
  file_path?: string;
}

interface Comment {
  id: string;
  commenter_id: string | null;
  commenter_name: string;
  commenter_email: string;
  comment: string;
  is_guest: boolean;
  created_at: string;
}

interface DataRoomFilePreviewDialogProps {
  file: PreviewFile | null;
  onClose: () => void;
  dataRoomId: string;
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
}

const DataRoomFilePreviewDialog = ({
  file,
  onClose,
  dataRoomId,
  organizationId,
  userId,
  userName,
  userEmail,
}: DataRoomFilePreviewDialogProps) => {
  const [newComment, setNewComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const queryClient = useQueryClient();

  // Check if file is editable using utility function
  const isEditableDocument = file?.mimeType ? isEditableDocumentUtil(file.mimeType, file.name) : false;
  
  // Check if file is an Office document (for Google Docs viewer)
  const isOfficeDoc = file?.mimeType ? isOfficeDocument(file.mimeType, file.name) : false;

  // Fetch the latest document content for editable documents
  useEffect(() => {
    const fetchDocumentContent = async () => {
      if (!file?.id || !isEditableDocument) {
        setDocumentContent(null);
        return;
      }

      setContentLoading(true);
      try {
        const { data, error } = await supabase
          .from("data_room_document_content")
          .select("content")
          .eq("file_id", file.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching document content:", error);
          setDocumentContent(null);
        } else if (data?.content) {
          setDocumentContent(data.content);
        } else {
          setDocumentContent(null);
        }
      } catch (err) {
        console.error("Error fetching document content:", err);
        setDocumentContent(null);
      } finally {
        setContentLoading(false);
      }
    };

    fetchDocumentContent();
  }, [file?.id, isEditableDocument]);

  // Reset content when dialog closes
  useEffect(() => {
    if (!file) {
      setDocumentContent(null);
    }
  }, [file]);

  // Fetch comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["data-room-file-comments", file?.id],
    queryFn: async () => {
      if (!file?.id) return [];
      const { data, error } = await supabase
        .from("data_room_file_comments")
        .select("*")
        .eq("file_id", file.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!file?.id,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!file?.id) return;
      const { error } = await supabase.from("data_room_file_comments").insert({
        file_id: file.id,
        data_room_id: dataRoomId,
        organization_id: organizationId,
        commenter_id: userId,
        commenter_name: userName,
        commenter_email: userEmail,
        comment,
        is_guest: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      setShowCommentInput(false);
      queryClient.invalidateQueries({ queryKey: ["data-room-file-comments", file?.id] });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleDownload = (format?: 'original' | 'pdf') => {
    if (!file) return;
    
    if (format === 'pdf') {
      // For PDF export, use browser print if we have document content
      if (documentContent) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const printHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>${baseName}</title>
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
                ${documentContent}
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
      } else {
        toast.info("PDF export is available for edited documents. Edit the document first to enable PDF export.");
      }
      return;
    }
    
    // Original format download
    if (file.url) {
      window.open(file.url, "_blank");
    }
  };

  // Refetch document content (e.g., after editing)
  const refetchDocumentContent = async () => {
    if (!file?.id || !isEditableDocument) return;
    
    setContentLoading(true);
    try {
      const { data, error } = await supabase
        .from("data_room_document_content")
        .select("content")
        .eq("file_id", file.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching document content:", error);
      } else if (data?.content) {
        setDocumentContent(data.content);
      }
    } catch (err) {
      console.error("Error fetching document content:", err);
    } finally {
      setContentLoading(false);
    }
  };

  const handleEditorClose = (open: boolean) => {
    setShowEditor(open);
    if (!open) {
      // Refetch content when editor closes
      refetchDocumentContent();
    }
  };

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-[85vh]">
          {/* File Preview Area */}
          <div className="flex-1 flex flex-col bg-muted/30 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
              <div className="flex items-center gap-2 min-w-0">
                {file.type === "image" ? (
                  <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />
                ) : file.type === "pdf" ? (
                  <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : file.type === "video" ? (
                  <Video className="w-5 h-5 text-purple-500 flex-shrink-0" />
                ) : file.type === "document" ? (
                  <File className="w-5 h-5 text-blue-600 flex-shrink-0" />
                ) : (
                  <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="font-medium truncate">{file.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Only show Edit button for editable documents (docx, xlsx) */}
                {isEditableDocument && (
                  <Button variant="default" size="sm" onClick={() => setShowEditor(true)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit Document
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Download className="w-4 h-4" />
                      Download
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleDownload('original')} className="gap-2">
                      <FileDown className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span>Original Format</span>
                        <span className="text-xs text-muted-foreground">{file.name}</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload('pdf')} className="gap-2">
                      <FileDown className="w-4 h-4 text-destructive" />
                      <div className="flex flex-col">
                        <span>PDF Document</span>
                        <span className="text-xs text-muted-foreground">.pdf</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/20">
              {file.type === "image" && (
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              )}
              {file.type === "pdf" && (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`}
                  className="w-full h-full rounded-lg border bg-white"
                  title={file.name}
                />
              )}
              {file.type === "video" && (
                <video
                  src={file.url}
                  controls
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                  controlsList="nodownload"
                >
                  <source src={file.url} />
                  Your browser does not support the video tag.
                </video>
              )}
              {file.type === "document" && (
                <div className="w-full h-full flex flex-col">
                  {contentLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : documentContent ? (
                    <div className="w-full h-full bg-white rounded-lg border overflow-auto">
                      <div 
                        className="prose prose-sm max-w-none p-8"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(documentContent) }}
                      />
                    </div>
                  ) : (
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`}
                      className="w-full h-full rounded-lg border bg-white"
                      title={file.name}
                    />
                  )}
                </div>
              )}
              {file.type === "other" && (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <FileIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">{file.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview not available for this file type
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gap-2">
                        <Download className="w-4 h-4" />
                        Download File
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      <DropdownMenuItem onClick={() => handleDownload('original')} className="gap-2">
                        <FileDown className="w-4 h-4 text-primary" />
                        <div className="flex flex-col">
                          <span>Original Format</span>
                          <span className="text-xs text-muted-foreground">{file.name}</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('pdf')} className="gap-2">
                        <FileDown className="w-4 h-4 text-destructive" />
                        <div className="flex flex-col">
                          <span>PDF Document</span>
                          <span className="text-xs text-muted-foreground">.pdf</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>

          {/* Comments Sidebar */}
          <div className="w-80 flex flex-col border-l bg-background">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Comments</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowCommentInput(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New
                </Button>
                <span>{comments.length} items</span>
              </div>
            </div>

            {/* Comments List */}
            <ScrollArea className="flex-1">
              <div className="p-4">
                {commentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      There are no comments on this file.
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 text-primary"
                      onClick={() => setShowCommentInput(true)}
                    >
                      Add comment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment, index) => (
                      <div key={comment.id}>
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {comment.commenter_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {comment.commenter_name}
                              </span>
                              {comment.is_guest && (
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Guest
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), "MMM d, HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
                              {comment.comment}
                            </p>
                          </div>
                        </div>
                        {index < comments.length - 1 && (
                          <Separator className="mt-4" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* New Comment Input */}
            {showCommentInput && (
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {userName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{userName}</span>
                </div>
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[80px] resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCommentInput(false);
                      setNewComment("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    {addCommentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Send className="w-4 h-4 mr-1" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            )}

            {/* Always Show Add Comment Bar When Not Showing Input */}
            {!showCommentInput && comments.length > 0 && (
              <div className="border-t p-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setShowCommentInput(true)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add a comment...
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Document Editor Dialog */}
      <DataRoomDocumentEditorDialog
        open={showEditor}
        onOpenChange={handleEditorClose}
        file={file ? {
          id: file.id,
          name: file.name,
          file_path: file.file_path,
          mime_type: file.mimeType,
        } : null}
        dataRoomId={dataRoomId}
        organizationId={organizationId}
      />
    </Dialog>
  );
};

export default DataRoomFilePreviewDialog;
