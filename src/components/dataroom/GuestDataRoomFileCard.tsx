import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Download,
  Clock,
  Edit3,
  Trash2,
  ChevronDown,
  FileText,
  Image,
  Video,
  File,
  Lock,
  User,
  Check,
  PenLine,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Shield,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isEditableDocument } from "@/lib/documentUtils";

interface GuestDataRoomFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  folder_id?: string | null;
  is_restricted?: boolean;
  created_at: string;
  assigned_to?: string | null;
  status?: string;
  permission_level?: "view" | "edit";
  is_own_upload?: boolean;
}

interface GuestDataRoomFileCardProps {
  file: GuestDataRoomFile;
  folder?: { id: string; name: string } | null;
  uploaderName?: string;
  assigneeName?: string;
  version?: number;
  isDownloading?: boolean;
  isDeleting?: boolean;
  onView: () => void;
  onDownload: (format?: 'original' | 'pdf') => void;
  onViewVersions: () => void;
  onEditDocument?: () => void;
  onDelete?: () => void;
  onManagePermissions?: () => void;
}

const STATUS_DISPLAY: Record<string, { label: string; color: string; bgColor: string }> = {
  not_opened: { label: "Review Pending", color: "text-brand-orange", bgColor: "bg-brand-orange/10" },
  in_review: { label: "In Review", color: "text-brand-teal", bgColor: "bg-brand-teal/10" },
  review_failed: { label: "Review Failed", color: "text-brand-coral", bgColor: "bg-brand-coral/10" },
  being_amended: { label: "Amending", color: "text-brand-orange", bgColor: "bg-brand-orange/10" },
  completed: { label: "Completed", color: "text-brand-green", bgColor: "bg-brand-green/10" },
};

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return <File className="w-5 h-5 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <Image className="w-5 h-5 text-green-500" />;
  if (mimeType.startsWith("video/")) return <Video className="w-5 h-5 text-purple-500" />;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text") || mimeType.includes("sheet"))
    return <FileText className="w-5 h-5 text-orange-500" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export function GuestDataRoomFileCard({
  file,
  folder,
  uploaderName,
  assigneeName,
  version = 1,
  isDownloading = false,
  isDeleting = false,
  onView,
  onDownload,
  onViewVersions,
  onEditDocument,
  onDelete,
  onManagePermissions,
}: GuestDataRoomFileCardProps) {
  const statusDisplay = STATUS_DISPLAY[file.status || "not_opened"] || STATUS_DISPLAY.not_opened;
  const canEditDocument = isEditableDocument(file.mime_type, file.name) && file.permission_level === "edit";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 bg-card border-border/60">
      {/* Header with file icon, name, version badge, and dropdown */}
      <div className="p-4 pb-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {getFileIcon(file.mime_type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate flex-1" title={file.name}>
                {file.name}
              </h3>
              <Badge variant="outline" className="text-xs shrink-0">
                V{version}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Uploaded by {uploaderName || "Unknown"}
            </p>
          </div>
          {/* Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2 gap-1">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover">
              <DropdownMenuItem onClick={onView} className="gap-2">
                <Eye className="w-4 h-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-popover">
                    <DropdownMenuItem onClick={() => onDownload('original')} className="gap-2">
                      <FileDown className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span>Original Format</span>
                        <span className="text-xs text-muted-foreground">{file.name}</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDownload('pdf')} className="gap-2">
                      <FileDown className="w-4 h-4 text-destructive" />
                      <div className="flex flex-col">
                        <span>PDF Document</span>
                        <span className="text-xs text-muted-foreground">.pdf</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={onViewVersions} className="gap-2">
                <Clock className="w-4 h-4" />
                View Versions
              </DropdownMenuItem>
              {canEditDocument && onEditDocument && (
                <DropdownMenuItem onClick={onEditDocument} className="gap-2">
                  <Edit3 className="w-4 h-4" />
                  Edit Document
                </DropdownMenuItem>
              )}
              {file.is_own_upload && onManagePermissions && (
                <DropdownMenuItem onClick={onManagePermissions} className="gap-2">
                  <Shield className="w-4 h-4" />
                  Manage Permissions
                </DropdownMenuItem>
              )}
              {file.is_own_upload && onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onDelete} 
                    className="gap-2 text-destructive focus:text-destructive"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Restriction badge - guests cannot see folders */}
      {file.is_restricted && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
              <Lock className="w-3 h-3" />
              Restricted
            </Badge>
          </div>
        </div>
      )}

      {/* File info preview */}
      <div className="px-4 pb-3">
        <div className="bg-gray-50 dark:bg-[#2a2f38] rounded-lg p-3 text-xs text-muted-foreground dark:text-white/70 min-h-[80px] max-h-[100px] overflow-hidden">
          <p className="font-medium text-foreground/70 dark:text-white/80">{file.name}</p>
          <p>Size: {formatFileSize(file.file_size)}</p>
          <p>Uploaded: {format(new Date(file.created_at), "dd/MM/yyyy")}</p>
        </div>
      </div>

      {/* Status and Assigned To */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/40">
          {/* Current Status */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</span>
            <div className={`flex items-center gap-1.5 ${statusDisplay.color}`}>
              <div className={cn(
                "w-2 h-2 rounded-full flex-shrink-0",
                file.status === "completed" ? "bg-brand-green" :
                file.status === "review_failed" ? "bg-brand-coral" :
                file.status === "in_review" ? "bg-brand-teal" : "bg-brand-orange"
              )} />
              <span className="text-xs font-medium">{statusDisplay.label}</span>
            </div>
          </div>

          {/* Assigned To */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Assigned To</span>
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs">
                {assigneeName ? (
                  <span className="font-medium text-foreground">{assigneeName}</span>
                ) : (
                  <span className="italic text-muted-foreground">Unassigned</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GuestDataRoomFileCard;
