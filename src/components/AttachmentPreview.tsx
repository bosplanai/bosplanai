import { Download, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentPreviewProps {
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number;
  onRemove?: () => void;
  className?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (mimeType?: string | null): boolean => {
  return !!mimeType && mimeType.startsWith("image/");
};

const isPdf = (mimeType?: string | null): boolean => {
  return mimeType === "application/pdf";
};

const AttachmentPreview = ({
  fileName,
  fileUrl,
  mimeType,
  fileSize,
  onRemove,
  className,
}: AttachmentPreviewProps) => {
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      // Fetch the file and create a blob download to avoid browser blocking
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: try opening in new tab
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group",
        className
      )}
    >
      {/* Thumbnail / Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-md bg-background flex items-center justify-center overflow-hidden border border-border/50">
        {isImage(mimeType) && fileUrl ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement!.innerHTML =
                '<svg class="w-5 h-5 text-muted-foreground"><use href="#image-icon"/></svg>';
            }}
          />
        ) : isPdf(mimeType) ? (
          <FileText className="w-5 h-5 text-destructive" />
        ) : (
          <Paperclip className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate" title={fileName}>
          {fileName}
        </p>
        {fileSize !== undefined && (
          <p className="text-[10px] text-muted-foreground">{formatFileSize(fileSize)}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onRemove();
            }}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            title="Remove"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default AttachmentPreview;
