import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { useProjectAttachments, ProjectAttachment } from "@/hooks/useProjectAttachments";
import AttachmentPreview from "./AttachmentPreview";
import { useToast } from "@/hooks/use-toast";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface ProjectAttachmentsListProps {
  projectId: string;
  organizationId: string;
  canEdit?: boolean;
}

const ProjectAttachmentsList = ({
  projectId,
  organizationId,
  canEdit = true,
}: ProjectAttachmentsListProps) => {
  const { attachments, loading, uploadAttachment, deleteAttachment } =
    useProjectAttachments(projectId);
  const [isUploading, setIsUploading] = useState(false);
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
          description: `${file.name} is not supported. Use PDF, Office, or image files.`,
          variant: "destructive",
        });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 25MB limit.`,
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

  const handleRemove = (att: ProjectAttachment) => {
    deleteAttachment(att.id, att.file_path);
  };

  if (loading && attachments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        Loading attachments...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <AttachmentPreview
              key={att.id}
              fileName={att.file_name}
              fileUrl={att.signed_url || ""}
              mimeType={att.mime_type}
              fileSize={att.file_size}
              onRemove={canEdit ? () => handleRemove(att) : undefined}
            />
          ))}
        </div>
      )}

      {canEdit && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3" />
          )}
          {isUploading ? "Uploading..." : "Add attachment"}
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

export default ProjectAttachmentsList;
