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
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/sanitize";
import { isEditableDocument as isEditableDocumentUtil } from "@/lib/documentUtils";

interface PreviewFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "video" | "document" | "other";
  mimeType?: string;
  permissionLevel?: "view" | "edit";
}

interface Comment {
  id: string;
  commenter_name: string;
  commenter_email: string;
  comment: string;
  is_guest: boolean;
  created_at: string;
}

interface GuestFilePreviewDialogProps {
  file: PreviewFile | null;
  onClose: () => void;
  token: string;
  email: string;
  guestName: string;
  onEditDocument?: () => void;
}

const GuestFilePreviewDialog = ({
  file,
  onClose,
  token,
  email,
  guestName,
  onEditDocument,
}: GuestFilePreviewDialogProps) => {
  const [newComment, setNewComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const queryClient = useQueryClient();

  // Check if file is editable
  const isEditableDocument = file?.mimeType ? isEditableDocumentUtil(file.mimeType, file.name) : false;
  const canEdit = isEditableDocument && file?.permissionLevel === "edit";

  // Fetch document content for editable documents
  useEffect(() => {
    const fetchDocumentContent = async () => {
      if (!file?.id || !isEditableDocument) {
        setDocumentContent(null);
        return;
      }

      setContentLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "guest-get-document-content",
          {
            body: { token, email: email.toLowerCase(), fileId: file.id },
          }
        );

        if (!error && data?.document?.content) {
          const content = data.document.content;
          // Accept any content, including placeholder - we'll show it rather than broken Google Docs Viewer
          if (content && content.trim() !== "" && content !== "<p></p>") {
            setDocumentContent(content);
          } else {
            // Set a placeholder for empty documents
            setDocumentContent("<p class='text-muted-foreground'>This document is empty. Click 'Edit Document' to add content.</p>");
          }
        } else {
          // Set a placeholder when document fetch fails
          setDocumentContent("<p class='text-muted-foreground'>Document content is loading. Click 'Edit Document' to view and edit.</p>");
        }
      } catch (err) {
        console.error("Error fetching document content:", err);
        // Set a placeholder on error
        setDocumentContent("<p class='text-muted-foreground'>Unable to load document preview. Click 'Edit Document' to view.</p>");
      } finally {
        setContentLoading(false);
      }
    };

    if (file?.id) {
      fetchDocumentContent();
    }
  }, [file?.id, isEditableDocument, token, email]);

  // Fetch comments via edge function
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["guest-file-comments", file?.id, token, email],
    queryFn: async () => {
      if (!file?.id) return [];
      const { data, error } = await supabase.functions.invoke("get-guest-file-comments", {
        body: { token, email, fileId: file.id },
      });

      if (error) throw error;
      return (data?.comments || []) as Comment[];
    },
    enabled: !!file?.id && !!token && !!email,
  });

  // Add comment mutation via edge function
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      if (!file?.id) return;
      const { data, error } = await supabase.functions.invoke("guest-add-file-comment", {
        body: { token, email, fileId: file.id, comment },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      setNewComment("");
      setShowCommentInput(false);
      queryClient.invalidateQueries({ queryKey: ["guest-file-comments", file?.id, token, email] });
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add comment");
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

  const handleDownload = (format?: "original" | "pdf") => {
    if (!file?.url) return;
    
    if (format === "pdf") {
      const printWindow = window.open(file.url, "_blank");
      if (printWindow) {
        toast.success("Opening file for PDF export. Use browser's Print > Save as PDF.");
      }
    } else {
      window.open(file.url, "_blank");
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
                {/* Edit Document button for editable files with edit permission */}
                {canEdit && onEditDocument && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      onClose();
                      onEditDocument();
                    }}
                    className="bg-primary hover:bg-primary/90 gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Document
                  </Button>
                )}
                {/* Download dropdown */}
                {file.permissionLevel !== "view" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Download className="w-4 h-4" />
                        Download
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => handleDownload("original")} className="gap-2">
                        <FileDown className="w-4 h-4 text-primary" />
                        Original Format
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload("pdf")} className="gap-2">
                        <FileDown className="w-4 h-4 text-destructive" />
                        PDF Document
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/20">
              {contentLoading ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading document...</p>
                </div>
              ) : documentContent ? (
                <ScrollArea className="w-full h-full">
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-4xl mx-auto p-6 bg-white dark:bg-muted/20 rounded-lg shadow-sm"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(documentContent) }}
                  />
                </ScrollArea>
              ) : file.type === "image" ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : file.type === "pdf" ? (
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`}
                  className="w-full h-full rounded-lg border bg-white"
                  title={file.name}
                />
              ) : file.type === "video" ? (
                <video
                  src={file.url}
                  controls
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                  controlsList="nodownload"
                >
                  <source src={file.url} />
                  Your browser does not support the video tag.
                </video>
              ) : file.type === "document" ? (
                <div className="w-full h-full flex flex-col">
                  <iframe
                    src={`https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`}
                    className="w-full h-full rounded-lg border bg-white"
                    title={file.name}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <FileIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">{file.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Preview not available for this file type
                  </p>
                  {file.permissionLevel !== "view" ? (
                    <Button onClick={() => handleDownload("original")} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download File
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You have view-only access to this file
                    </p>
                  )}
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
                      {guestName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{guestName}</span>
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
    </Dialog>
  );
};

export default GuestFilePreviewDialog;
