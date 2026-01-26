import { useRef, useState } from "react";
import { Upload, Loader2, Paperclip } from "lucide-react";
import { useTaskAttachments, TaskAttachment } from "@/hooks/useTaskAttachments";
import AttachmentPreview from "./AttachmentPreview";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface TaskAttachmentsListProps {
  taskId: string;
  organizationId: string;
  canEdit?: boolean;
}

const TaskAttachmentsList = ({
  taskId,
  organizationId,
  canEdit = true,
}: TaskAttachmentsListProps) => {
  const { attachments, loading, uploadAttachment, deleteAttachment } =
    useTaskAttachments(taskId);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    for (const file of files) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not supported. Use PDF, Word, or image files.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      await uploadAttachment(file, organizationId);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (att: TaskAttachment) => {
    deleteAttachment(att.id, att.file_path);
  };

  return (
    <div className="flex items-center gap-3">
      {/* View Attachments Button */}
      {attachments.length > 0 && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Paperclip className="w-3 h-3" />
              View Attachments ({attachments.length})
            </button>
          </DialogTrigger>
          <DialogContent 
            className="max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <DialogHeader>
              <DialogTitle>Task Attachments</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 pt-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading attachments...
                </div>
              ) : (
                attachments.map((att) => (
                  <AttachmentPreview
                    key={att.id}
                    fileName={att.file_name}
                    fileUrl={att.signed_url || ""}
                    mimeType={att.mime_type}
                    fileSize={att.file_size}
                    onRemove={canEdit ? () => handleRemove(att) : undefined}
                  />
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Attachment Button */}
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={isUploading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          {isUploading ? "Uploading..." : "Add Attachment"}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_TYPES.join(",")}
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default TaskAttachmentsList;
