import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import SideNavigation from "@/components/SideNavigation";
import { HardDrive, Upload, Folder, FolderPlus, Plus, ChevronDown, FileText, Image, Video, Music, File, Eye, Download, Trash2, GripVertical, ArrowUpDown, Check, Clock, AlertCircle, PenLine, CheckCircle2, FolderInput, X, CheckSquare, RotateCcw, ChevronUp, Settings2, Search, ArrowLeft, Lock, FileSignature, Megaphone, FileSpreadsheet, Scale, Users, Briefcase, BookOpen, BarChart3, Presentation, Tag, Edit3, LayoutTemplate, CreditCard } from "lucide-react";
import { useAppearance } from "@/contexts/AppearanceContext";
import bosplanLogo from "@/assets/bosplan-logo.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { FileUploadDialog } from "@/components/drive/FileUploadDialog";
import { Badge } from "@/components/ui/badge";
import { DocumentEditorDialog } from "@/components/drive/DocumentEditorDialog";
import { NotificationBell } from "@/components/NotificationBell";
import { useDriveStorage, DRIVE_STORAGE_QUERY_KEY } from "@/hooks/useDriveStorage";

// Upload progress state type
interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
}
type FileType = "all" | "images" | "documents" | "videos" | "audio" | "other";
type FileStatus = "all" | "not_opened" | "in_review" | "review_failed" | "being_amended" | "completed" | "binned";
type SortOrder = "newest" | "oldest" | "name_asc" | "name_desc" | "size_asc" | "size_desc";
interface DriveFolder {
  id: string;
  name: string;
  organization_id: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
}
interface DriveFile {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  status: string;
  version: number;
  assigned_to: string | null;
  uploaded_by: string;
  folder_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  last_viewed_at: string | null;
  parent_file_id: string | null;
  description: string | null;
  file_category?: string;
  is_restricted?: boolean;
  requires_signature?: boolean;
  signature_status?: string | null;
  signed_by?: string | null;
  signed_at?: string | null;
}

// Status display config for the card view
const STATUS_DISPLAY: Record<string, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  not_opened: {
    label: "Review Pending",
    color: "text-brand-orange",
    bgColor: "bg-brand-orange/10"
  },
  in_review: {
    label: "In Review",
    color: "text-brand-teal",
    bgColor: "bg-brand-teal/10"
  },
  review_failed: {
    label: "Reviewed & Changes Required",
    color: "text-brand-coral",
    bgColor: "bg-brand-coral/10"
  },
  being_amended: {
    label: "Being Amended",
    color: "text-brand-orange",
    bgColor: "bg-brand-orange/10"
  },
  completed: {
    label: "Reviewed & Approved",
    color: "text-brand-green",
    bgColor: "bg-brand-green/10"
  },
  binned: {
    label: "Binned",
    color: "text-muted-foreground",
    bgColor: "bg-muted"
  }
};

// File category display config
const CATEGORY_DISPLAY: Record<string, {
  label: string;
  icon: React.ElementType;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  general: {
    label: "General",
    icon: FileText,
    bgColor: "bg-slate-500/10",
    textColor: "text-slate-600 dark:text-slate-400",
    borderColor: "border-slate-500/20"
  },
  contract: {
    label: "Contract",
    icon: FileSignature,
    bgColor: "bg-brand-teal/10",
    textColor: "text-brand-teal",
    borderColor: "border-brand-teal/20"
  },
  strategy: {
    label: "Strategy",
    icon: Briefcase,
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-600 dark:text-purple-400",
    borderColor: "border-purple-500/20"
  },
  policy: {
    label: "Policy",
    icon: BookOpen,
    bgColor: "bg-indigo-500/10",
    textColor: "text-indigo-600 dark:text-indigo-400",
    borderColor: "border-indigo-500/20"
  },
  report: {
    label: "Report",
    icon: BarChart3,
    bgColor: "bg-cyan-500/10",
    textColor: "text-cyan-600 dark:text-cyan-400",
    borderColor: "border-cyan-500/20"
  },
  presentation: {
    label: "Presentation",
    icon: Presentation,
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-600 dark:text-orange-400",
    borderColor: "border-orange-500/20"
  },
  financial: {
    label: "Financial",
    icon: FileSpreadsheet,
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-500/20"
  },
  legal: {
    label: "Legal",
    icon: Scale,
    bgColor: "bg-rose-500/10",
    textColor: "text-rose-600 dark:text-rose-400",
    borderColor: "border-rose-500/20"
  },
  hr: {
    label: "HR",
    icon: Users,
    bgColor: "bg-pink-500/10",
    textColor: "text-pink-600 dark:text-pink-400",
    borderColor: "border-pink-500/20"
  },
  marketing: {
    label: "Marketing",
    icon: Megaphone,
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-500/20"
  },
  other: {
    label: "Other",
    icon: Tag,
    bgColor: "bg-gray-500/10",
    textColor: "text-gray-600 dark:text-gray-400",
    borderColor: "border-gray-500/20"
  }
};
const STATUS_OPTIONS = [{
  value: "not_opened",
  label: "Review Pending",
  icon: Clock,
  color: "text-brand-orange"
}, {
  value: "in_review",
  label: "In Review",
  icon: Eye,
  color: "text-brand-teal"
}, {
  value: "review_failed",
  label: "Review Failed",
  icon: AlertCircle,
  color: "text-brand-coral"
}, {
  value: "being_amended",
  label: "Being Amended",
  icon: PenLine,
  color: "text-brand-orange"
}, {
  value: "completed",
  label: "Completed",
  icon: CheckCircle2,
  color: "text-brand-green"
}, {
  value: "binned",
  label: "Recycling Bin",
  icon: Trash2,
  color: "text-muted-foreground"
}];
const TYPE_FILTERS = [{
  value: "all",
  label: "All Files",
  icon: Folder
}, {
  value: "images",
  label: "Images",
  icon: Image
}, {
  value: "documents",
  label: "Documents",
  icon: FileText
}, {
  value: "videos",
  label: "Videos",
  icon: Video
}, {
  value: "audio",
  label: "Audio",
  icon: Music
}, {
  value: "other",
  label: "Other",
  icon: File
}];
const getFileTypeFromMime = (mimeType: string | null): FileType => {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("video/")) return "videos";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text") || mimeType.includes("sheet") || mimeType.includes("presentation")) return "documents";
  return "other";
};
const getFileIcon = (mimeType: string | null) => {
  const type = getFileTypeFromMime(mimeType);
  switch (type) {
    case "images":
      return <Image className="w-5 h-5 text-green-500" />;
    case "videos":
      return <Video className="w-5 h-5 text-purple-500" />;
    case "audio":
      return <Music className="w-5 h-5 text-pink-500" />;
    case "documents":
      return <FileText className="w-5 h-5 text-orange-500" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
};
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
const Drive = () => {
  const {
    navigate
  } = useOrgNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    pendingSettings
  } = useAppearance();
  const driveTextSize = pendingSettings.driveFileTextSize;
  const {
    organization
  } = useOrganization();
  const {
    user
  } = useAuth();
  const {
    isAdmin,
    isMember,
    canSwitchOrganizations
  } = useUserRole();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FileType>("all");
  const [statusFilter, setStatusFilter] = useState<FileStatus>("all");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewMode, setViewMode] = useState<"all" | "shared">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [singleFileMoveDialogOpen, setSingleFileMoveDialogOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<DriveFile | null>(null);
  const [trashPanelOpen, setTrashPanelOpen] = useState(false);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<DriveFolder | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderConfirmOpen, setDeleteFolderConfirmOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<DriveFolder | null>(null);
  const [versionDialogFile, setVersionDialogFile] = useState<DriveFile | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const dragCounter = useRef(0);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [showUploadProgress, setShowUploadProgress] = useState(false);

  // Upload dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<FileList | null>(null);
  const [pendingUploadFolderId, setPendingUploadFolderId] = useState<string | null>(null);

  // Edit file metadata state
  const [editFileDialogOpen, setEditFileDialogOpen] = useState(false);
  const [fileToEdit, setFileToEdit] = useState<DriveFile | null>(null);
  const [editFileName, setEditFileName] = useState("");
  const [editFileDescription, setEditFileDescription] = useState("");
  const [editFileFolderId, setEditFileFolderId] = useState<string | null>(null);
  const [editFileAssignedTo, setEditFileAssignedTo] = useState<string | null>(null);

  // File preview state
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Document editor state
  const [documentEditorOpen, setDocumentEditorOpen] = useState(false);
  const [documentEditorFile, setDocumentEditorFile] = useState<DriveFile | null>(null);

  // Storage purchase dialog state
  const [storagePurchaseDialogOpen, setStoragePurchaseDialogOpen] = useState(false);
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);

  // Fetch folders
  const {
    data: folders = []
  } = useQuery({
    queryKey: ["drive-folders", organization?.id, currentFolderId],
    queryFn: async () => {
      if (!organization?.id) return [];
      let query = supabase.from("drive_folders").select("*").eq("organization_id", organization.id);
      if (currentFolderId) {
        query = query.eq("parent_id", currentFolderId);
      } else {
        query = query.is("parent_id", null);
      }
      const {
        data,
        error
      } = await query.order("name");
      if (error) throw error;
      return data as DriveFolder[];
    },
    enabled: !!organization?.id
  });

  // Fetch ALL folders for the filter section
  const {
    data: allFolders = []
  } = useQuery({
    queryKey: ["drive-all-folders", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const {
        data,
        error
      } = await supabase.from("drive_folders").select("*").eq("organization_id", organization.id).order("name");
      if (error) throw error;
      return data as DriveFolder[];
    },
    enabled: !!organization?.id
  });

  // Fetch files - only show latest versions (no parent_file_id means it's v1 or latest)
  const {
    data: files = []
  } = useQuery({
    queryKey: ["drive-files", organization?.id, currentFolderId, typeFilter, statusFilter, folderFilter, sortOrder],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch all non-deleted files
      let query = supabase.from("drive_files").select("*").eq("organization_id", organization.id).is("deleted_at", null);

      // Apply folder filter from the filter section
      if (folderFilter !== "all") {
        if (folderFilter === "uncategorized") {
          query = query.is("folder_id", null);
        } else if (folderFilter === "template-library") {
          // Filter by file_category = 'template' for files from Template Library
          query = query.eq("file_category", "template");
        } else if (folderFilter === "policy-library") {
          // Filter by file_category = 'policy' for files from Policy section
          query = query.eq("file_category", "policy");
        } else {
          query = query.eq("folder_id", folderFilter);
        }
      } else if (currentFolderId) {
        // If navigating into a folder
        query = query.eq("folder_id", currentFolderId);
      } else {
        // When showing "All Files" (no folder filter), exclude template and policy files
        // These are managed in their own dedicated sections
        query = query.or("file_category.is.null,file_category.not.in.(template,policy)");
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      switch (sortOrder) {
        case "newest":
          query = query.order("created_at", {
            ascending: false
          });
          break;
        case "oldest":
          query = query.order("created_at", {
            ascending: true
          });
          break;
        case "name_asc":
          query = query.order("name", {
            ascending: true
          });
          break;
        case "name_desc":
          query = query.order("name", {
            ascending: false
          });
          break;
        case "size_asc":
          query = query.order("file_size", {
            ascending: true
          });
          break;
        case "size_desc":
          query = query.order("file_size", {
            ascending: false
          });
          break;
      }
      const {
        data,
        error
      } = await query;
      if (error) throw error;
      let allFiles = data as DriveFile[];

      // Filter to show only latest versions of each file
      // Group files by their "file family" (parent_file_id or id for v1 files)
      const fileGroups: Record<string, DriveFile[]> = {};
      allFiles.forEach(file => {
        const groupKey = file.parent_file_id || file.id;
        if (!fileGroups[groupKey]) {
          fileGroups[groupKey] = [];
        }
        fileGroups[groupKey].push(file);
      });

      // Get only the latest version from each group
      const latestVersions = Object.values(fileGroups).map(group => {
        return group.reduce((latest, current) => current.version > latest.version ? current : latest);
      });

      // Apply type filter
      let filteredData = latestVersions;
      if (typeFilter !== "all") {
        filteredData = filteredData.filter(f => getFileTypeFromMime(f.mime_type) === typeFilter);
      }
      return filteredData;
    },
    enabled: !!organization?.id
  });

  // Fetch folder file counts
  const {
    data: folderCounts = {}
  } = useQuery({
    queryKey: ["drive-folder-counts", organization?.id, folders],
    queryFn: async () => {
      if (!organization?.id || folders.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const folder of folders) {
        const {
          count
        } = await supabase.from("drive_files").select("*", {
          count: "exact",
          head: true
        }).eq("folder_id", folder.id).is("deleted_at", null);
        counts[folder.id] = count || 0;
      }
      return counts;
    },
    enabled: !!organization?.id && folders.length > 0
  });

  // Use shared storage hook for real-time updates after purchases
  const { data: storageUsage = { used: 0, total: 100 * 1024 * 1024, additionalGb: 0 }, invalidate: invalidateStorage } = useDriveStorage(organization?.id);

  // Fetch team members for assignee filter and reviewer dropdown
  const {
    data: teamMembers = []
  } = useQuery({
    queryKey: ["team-members", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Fetch all profiles that have a role in this organization
      const {
        data: roles
      } = await supabase.from("user_roles").select("user_id").eq("organization_id", organization.id);
      if (!roles || roles.length === 0) return [];
      const userIds = roles.map(r => r.user_id);
      const {
        data
      } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      return data || [];
    },
    enabled: !!organization?.id
  });

  // Create a lookup map for profile names - also include uploaders from files
  const baseProfileMap = teamMembers.reduce((acc, member) => {
    acc[member.id] = member.full_name;
    return acc;
  }, {} as Record<string, string>);

  // Fetch additional profiles for uploaders who might not be in current org team members
  const uploaderIds = [...new Set(files.map(f => f.uploaded_by).filter(id => !baseProfileMap[id]))];
  const {
    data: uploaderProfiles = []
  } = useQuery({
    queryKey: ["uploader-profiles", uploaderIds],
    queryFn: async () => {
      if (uploaderIds.length === 0) return [];
      const {
        data
      } = await supabase.from("profiles").select("id, full_name").in("id", uploaderIds);
      return data || [];
    },
    enabled: uploaderIds.length > 0
  });

  // Combine both profile sources into final profileMap
  const profileMap = {
    ...baseProfileMap,
    ...uploaderProfiles.reduce((acc, p) => {
      acc[p.id] = p.full_name;
      return acc;
    }, {} as Record<string, string>)
  };

  // Fetch file versions for a specific file
  const {
    data: fileVersions = []
  } = useQuery({
    queryKey: ["file-versions", versionDialogFile?.id, versionDialogFile?.parent_file_id],
    queryFn: async () => {
      if (!versionDialogFile) return [];
      const parentId = versionDialogFile.parent_file_id || versionDialogFile.id;
      const {
        data,
        error
      } = await supabase.from("drive_files").select("*").or(`id.eq.${parentId},parent_file_id.eq.${parentId}`).is("deleted_at", null).order("version", {
        ascending: false
      });
      if (error) throw error;
      return data as DriveFile[];
    },
    enabled: !!versionDialogFile
  });

  // Fetch "Shared with me" files - restricted files where user has access + files assigned to user for review
  const {
    data: sharedWithMeFiles = []
  } = useQuery({
    queryKey: ["shared-with-me-files", organization?.id, user?.id],
    queryFn: async () => {
      if (!organization?.id || !user?.id) return [];

      // Fetch files where user has been granted access (restricted files)
      const {
        data: accessGrants
      } = await supabase.from("drive_file_access").select("file_id").eq("granted_to", user.id);
      const sharedFileIds = accessGrants?.map(a => a.file_id) || [];

      // Fetch files assigned to user for review (non-restricted files)
      const {
        data: assignedFiles
      } = await supabase.from("drive_files").select("*").eq("organization_id", organization.id).eq("assigned_to", user.id).is("deleted_at", null);

      // Fetch the restricted files user has access to
      let restrictedSharedFiles: DriveFile[] = [];
      if (sharedFileIds.length > 0) {
        const {
          data
        } = await supabase.from("drive_files").select("*").in("id", sharedFileIds).is("deleted_at", null);
        restrictedSharedFiles = (data || []) as DriveFile[];
      }

      // Combine and deduplicate
      const allSharedFiles = [...restrictedSharedFiles, ...(assignedFiles || [])];
      const uniqueFiles = allSharedFiles.reduce((acc, file) => {
        if (!acc.find(f => f.id === file.id)) {
          acc.push(file as DriveFile);
        }
        return acc;
      }, [] as DriveFile[]);
      return uniqueFiles;
    },
    enabled: !!organization?.id && !!user?.id
  });

  // Fetch all file shares for the organization

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!organization?.id || !user?.id) throw new Error("Not authenticated");
      const {
        data,
        error
      } = await supabase.from("drive_folders").insert({
        organization_id: organization.id,
        name,
        parent_id: currentFolderId,
        created_by: user.id
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-folders"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-all-folders"]
      });
      setCreateFolderOpen(false);
      setNewFolderName("");
      toast.success("Folder created");
    },
    onError: () => toast.error("Failed to create folder")
  });

  // Rename folder mutation
  const renameFolderMutation = useMutation({
    mutationFn: async ({
      folderId,
      name
    }: {
      folderId: string;
      name: string;
    }) => {
      const {
        error
      } = await supabase.from("drive_folders").update({
        name
      }).eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-folders"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-all-folders"]
      });
      setRenameFolderOpen(false);
      setFolderToRename(null);
      setRenameFolderName("");
      toast.success("Folder renamed");
    },
    onError: () => toast.error("Failed to rename folder")
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      // First, move all files in this folder to uncategorized (null)
      await supabase.from("drive_files").update({
        folder_id: null
      }).eq("folder_id", folderId);

      // Then delete the folder
      const {
        error
      } = await supabase.from("drive_folders").delete().eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-folders"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-all-folders"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-folder-counts"]
      });
      setDeleteFolderConfirmOpen(false);
      setFolderToDelete(null);
      setFolderFilter("all");
      toast.success("Folder deleted");
    },
    onError: () => toast.error("Failed to delete folder")
  });

  // Helper function to upload file with progress tracking using XMLHttpRequest
  const uploadFileWithProgress = useCallback(async (file: File, filePath: string, onProgress: (progress: number) => void): Promise<void> => {
    const {
      data: sessionData
    } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const url = `${supabaseUrl}/storage/v1/object/drive-files/${filePath}`;
      xhr.upload.addEventListener('progress', event => {
        if (event.lengthComputable) {
          const percentComplete = Math.round(event.loaded / event.total * 100);
          onProgress(percentComplete);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      xhr.open('POST', url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('x-upsert', 'false');
      xhr.send(file);
    });
  }, []);

  // Upload file mutation with versioning support, progress tracking, and permission options
  const uploadMutation = useMutation({
    mutationFn: async ({
      files,
      targetFolderId,
      fileCategory = "general",
      isRestricted = false,
      requiresSignature = false,
      assignedUsers = []
    }: {
      files: FileList | File[];
      targetFolderId?: string | null;
      fileCategory?: string;
      isRestricted?: boolean;
      requiresSignature?: boolean;
      assignedUsers?: string[];
    }) => {
      if (!organization?.id || !user?.id) throw new Error("Not authenticated");
      const fileArray = Array.from(files);
      const results: {
        name: string;
        isVersion: boolean;
        version?: number;
        fileId?: string;
      }[] = [];
      const uploadFolderId = targetFolderId !== undefined ? targetFolderId : currentFolderId;

      // Initialize progress tracking
      const initialProgress: UploadProgress[] = fileArray.map(f => ({
        fileName: f.name,
        progress: 0,
        status: 'uploading' as const
      }));
      setUploadProgress(initialProgress);
      setShowUploadProgress(true);
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];

        // Update progress callback for this file
        const updateProgress = (progress: number) => {
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? {
            ...p,
            progress,
            status: progress === 100 ? 'processing' : 'uploading'
          } : p));
        };
        try {
          // Check for existing file with same name in the same folder to create a new version
          let existingQuery = supabase.from("drive_files").select("*").eq("organization_id", organization.id).eq("name", file.name).is("deleted_at", null);

          // Match by folder context
          if (uploadFolderId) {
            existingQuery = existingQuery.eq("folder_id", uploadFolderId);
          } else {
            existingQuery = existingQuery.is("folder_id", null);
          }
          const {
            data: existingFiles
          } = await existingQuery.order("version", {
            ascending: false
          }).limit(1);
          const existingFile = existingFiles?.[0] as DriveFile | undefined;
          const filePath = `${organization.id}/${Date.now()}_${file.name}`;

          // Upload with progress tracking
          await uploadFileWithProgress(file, filePath, updateProgress);

          // Mark as processing
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? {
            ...p,
            progress: 100,
            status: 'processing'
          } : p));
          let newFileId: string | undefined;
          if (existingFile) {
            // Create new version linked to the parent
            const parentId = existingFile.parent_file_id || existingFile.id;
            const newVersion = existingFile.version + 1;
            const {
              data: insertedFile,
              error: dbError
            } = await supabase.from("drive_files").insert({
              organization_id: organization.id,
              folder_id: existingFile.folder_id,
              name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
              version: newVersion,
              parent_file_id: parentId,
              status: "not_opened",
              file_category: fileCategory,
              is_restricted: isRestricted,
              requires_signature: fileCategory === "contract" && requiresSignature
            }).select("id").single();
            if (dbError) throw dbError;
            newFileId = insertedFile?.id;
            results.push({
              name: file.name,
              isVersion: true,
              version: newVersion,
              fileId: newFileId
            });
          } else {
            // Create new file
            const {
              data: insertedFile,
              error: dbError
            } = await supabase.from("drive_files").insert({
              organization_id: organization.id,
              folder_id: uploadFolderId,
              name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
              version: 1,
              status: "not_opened",
              file_category: fileCategory,
              is_restricted: isRestricted,
              requires_signature: fileCategory === "contract" && requiresSignature
            }).select("id").single();
            if (dbError) throw dbError;
            newFileId = insertedFile?.id;
            results.push({
              name: file.name,
              isVersion: false,
              fileId: newFileId
            });
          }

          // If file is restricted and has assigned users, create access grants
          if (isRestricted && assignedUsers.length > 0 && newFileId) {
            const accessGrants = assignedUsers.map(grantedTo => ({
              file_id: newFileId,
              granted_to: grantedTo,
              granted_by: user.id
            }));
            await supabase.from("drive_file_access").insert(accessGrants);
          }

          // Mark as complete
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? {
            ...p,
            status: 'complete'
          } : p));

          // Invalidate queries after each file for instant updates
          queryClient.invalidateQueries({
            queryKey: ["drive-files"],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({
            queryKey: [DRIVE_STORAGE_QUERY_KEY],
            refetchType: 'all'
          });
          queryClient.invalidateQueries({
            queryKey: ["drive-folder-counts"],
            refetchType: 'all'
          });
        } catch (error) {
          // Mark as error
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? {
            ...p,
            status: 'error'
          } : p));
          throw error;
        }
      }
      return results;
    },
    onSuccess: results => {
      // Final invalidation to ensure everything is synced
      queryClient.invalidateQueries({
        queryKey: ["drive-files"],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({
        queryKey: [DRIVE_STORAGE_QUERY_KEY],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-folder-counts"],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({
        queryKey: ["file-versions"],
        refetchType: 'all'
      });

      // Hide progress after a delay
      setTimeout(() => {
        setShowUploadProgress(false);
        setUploadProgress([]);
      }, 2000);

      // Show appropriate toast messages
      const newFiles = results.filter(r => !r.isVersion);
      const versions = results.filter(r => r.isVersion);
      if (newFiles.length > 0 && versions.length > 0) {
        toast.success(`Uploaded ${newFiles.length} new file(s) and ${versions.length} version(s)`);
      } else if (versions.length > 0) {
        if (versions.length === 1) {
          toast.success(`${versions[0].name} uploaded as version ${versions[0].version}`);
        } else {
          toast.success(`${versions.length} file version(s) uploaded`);
        }
      } else if (newFiles.length > 0) {
        if (newFiles.length === 1) {
          toast.success(`${newFiles[0].name} uploaded successfully`);
        } else {
          toast.success(`${newFiles.length} file(s) uploaded successfully`);
        }
      }
    },
    onError: () => {
      setTimeout(() => {
        setShowUploadProgress(false);
        setUploadProgress([]);
      }, 3000);
      toast.error("Failed to upload files");
    },
    onSettled: () => {
      // Ensure the hidden file input is reset so users can upload again without refresh
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  });

  // Handle buy more storage - open purchase dialog
  const handleBuyMoreStorage = () => {
    setStoragePurchaseDialogOpen(true);
  };

  // Handle storage tier purchase
  const handlePurchaseTier = async (tier: string) => {
    if (!organization?.id) {
      toast.error("Organization not loaded. Please try again.");
      return;
    }
    try {
      setPurchasingTier(tier);
      toast.loading("Preparing checkout...", {
        id: "storage-checkout"
      });
      const {
        data,
        error
      } = await supabase.functions.invoke("create-storage-checkout", {
        body: {
          tier,
          organizationId: organization.id,
          returnOrigin: window.location.origin
        }
      });
      if (error) throw error;
      if (data?.url) {
        toast.dismiss("storage-checkout");
        setStoragePurchaseDialogOpen(false);
        // Open in the same tab - Stripe will redirect to /payment-success which handles verification
        window.location.assign(data.url);
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      toast.dismiss("storage-checkout");
      toast.error("Failed to start checkout. Please try again.");
      console.error("Storage checkout error:", error);
    } finally {
      setPurchasingTier(null);
    }
  };

  // Handle canceled storage purchase (success is handled by /payment-success trampoline)
  useEffect(() => {
    const purchaseStatus = searchParams.get("storage_purchase");
    if (purchaseStatus === "canceled") {
      toast.info("Storage purchase was canceled");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Open the upload dialog with pre-selected files
      setPendingUploadFiles(e.dataTransfer.files);
      setPendingUploadFolderId(currentFolderId);
      setUploadDialogOpen(true);
      e.dataTransfer.clearData();
    }
  };

  // Update file status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      fileId,
      status
    }: {
      fileId: string;
      status: string;
    }) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        status
      }).eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["drive-files"]
    })
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        deleted_at: new Date().toISOString()
      }).eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      queryClient.invalidateQueries({
        queryKey: [DRIVE_STORAGE_QUERY_KEY]
      });
      toast.success("File deleted");
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (fileIds: string[]) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        deleted_at: new Date().toISOString()
      }).in("id", fileIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      queryClient.invalidateQueries({
        queryKey: [DRIVE_STORAGE_QUERY_KEY]
      });
      setSelectedFiles(new Set());
      toast.success("Files deleted");
    },
    onError: () => toast.error("Failed to delete files")
  });

  // Bulk move mutation
  const bulkMoveMutation = useMutation({
    mutationFn: async ({
      fileIds,
      folderId
    }: {
      fileIds: string[];
      folderId: string | null;
    }) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        folder_id: folderId
      }).in("id", fileIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-folder-counts"]
      });
      setSelectedFiles(new Set());
      setMoveDialogOpen(false);
      toast.success("Files moved");
    },
    onError: () => toast.error("Failed to move files")
  });

  // Single file move mutation
  const singleFileMoveeMutation = useMutation({
    mutationFn: async ({
      fileId,
      folderId
    }: {
      fileId: string;
      folderId: string | null;
    }) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        folder_id: folderId
      }).eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-folder-counts"]
      });
      setSingleFileMoveDialogOpen(false);
      setFileToMove(null);
      toast.success("File moved");
    },
    onError: () => toast.error("Failed to move file")
  });

  // Bulk status change mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({
      fileIds,
      status
    }: {
      fileIds: string[];
      status: string;
    }) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        status
      }).in("id", fileIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      setSelectedFiles(new Set());
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status")
  });

  // Update file metadata mutation
  const updateFileMetadataMutation = useMutation({
    mutationFn: async ({
      fileId,
      name,
      description,
      folder_id,
      assigned_to
    }: {
      fileId: string;
      name: string;
      description: string | null;
      folder_id: string | null;
      assigned_to: string | null;
    }) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        name,
        description,
        folder_id,
        assigned_to
      }).eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      queryClient.invalidateQueries({
        queryKey: ["drive-folder-counts"]
      });
      setEditFileDialogOpen(false);
      setFileToEdit(null);
      toast.success("File details updated");
    },
    onError: () => toast.error("Failed to update file details")
  });

  // Helper to open edit dialog with file data
  const openEditFileDialog = (file: DriveFile) => {
    setFileToEdit(file);
    setEditFileName(file.name);
    setEditFileDescription(file.description || "");
    setEditFileFolderId(file.folder_id);
    setEditFileAssignedTo(file.assigned_to);
    setEditFileDialogOpen(true);
  };

  // allFolders is already defined above for both filter section and move dialog
  const {
    data: deletedFiles = []
  } = useQuery({
    queryKey: ["deleted-files", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const {
        data,
        error
      } = await supabase.from("drive_files").select("*").eq("organization_id", organization.id).not("deleted_at", "is", null).gte("deleted_at", thirtyDaysAgo.toISOString()).order("deleted_at", {
        ascending: false
      });
      if (error) throw error;
      return data as DriveFile[];
    },
    enabled: !!organization?.id
  });

  // Restore file mutation
  const restoreFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const {
        error
      } = await supabase.from("drive_files").update({
        deleted_at: null
      }).eq("id", fileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });
      queryClient.invalidateQueries({
        queryKey: ["deleted-files"]
      });
      queryClient.invalidateQueries({
        queryKey: [DRIVE_STORAGE_QUERY_KEY]
      });
      toast.success("File restored");
    },
    onError: () => toast.error("Failed to restore file")
  });

  // Permanently delete file mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (file: DriveFile) => {
      // Delete from storage
      await supabase.storage.from("drive-files").remove([file.file_path]);
      // Delete from database
      const {
        error
      } = await supabase.from("drive_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["deleted-files"]
      });
      queryClient.invalidateQueries({
        queryKey: [DRIVE_STORAGE_QUERY_KEY]
      });
      toast.success("File permanently deleted");
    },
    onError: () => toast.error("Failed to delete file")
  });
  const getDaysUntilDeletion = (deletedAt: string) => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted);
    expiry.setDate(expiry.getDate() + 30);
    const now = new Date();
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Download file
  const downloadFile = async (file: DriveFile) => {
    // Extract extension from file_path if the name doesn't have one
    let downloadName = file.name;
    const pathExtMatch = file.file_path.match(/\.([a-zA-Z0-9]+)$/);
    const nameExtMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);

    // If file_path has an extension but name doesn't, append it
    if (pathExtMatch && !nameExtMatch) {
      downloadName = `${file.name}.${pathExtMatch[1]}`;
    }
    const {
      data
    } = await supabase.storage.from("drive-files").createSignedUrl(file.file_path, 60, {
      download: downloadName
    });
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = downloadName;
      a.click();
    }
  };

  // View file and track last viewed - now opens preview dialog
  const viewFile = async (file: DriveFile) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(prev => {
      if (prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    try {
      // Update last_viewed_at
      await supabase.from("drive_files").update({
        last_viewed_at: new Date().toISOString()
      }).eq("id", file.id);
      queryClient.invalidateQueries({
        queryKey: ["drive-files"]
      });

      // PDFs can be blocked by browsers when embedded from signed URLs.
      // Download to a blob URL first to ensure reliable previews.
      if (file.mime_type === "application/pdf") {
        const {
          data: blob,
          error
        } = await supabase.storage.from("drive-files").download(file.file_path);
        if (error) throw error;
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
        }
      } else {
        const {
          data
        } = await supabase.storage.from("drive-files").createSignedUrl(file.file_path, 300);
        if (data?.signedUrl) {
          setPreviewUrl(data.signedUrl);
        }
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  // Close preview dialog
  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(prev => {
      if (prev?.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setPreviewLoading(false);
  };

  // Check if file type is previewable inline
  const isPreviewable = (mimeType: string | null): boolean => {
    if (!mimeType) return false;
    return mimeType.startsWith("image/") || mimeType.startsWith("video/") || mimeType.startsWith("audio/") || mimeType === "application/pdf";
  };

  // Get the most recent activity timestamp for sorting
  const getRecentActivity = (file: DriveFile) => {
    const created = new Date(file.created_at).getTime();
    const viewed = file.last_viewed_at ? new Date(file.last_viewed_at).getTime() : 0;
    return Math.max(created, viewed);
  };

  // Filter and sort files by search query and recent activity
  const searchLower = searchQuery.toLowerCase().trim();

  // Use shared files when in shared view mode, otherwise use regular files
  const baseFiles = viewMode === "shared" ? sharedWithMeFiles : files;
  const recentFiles = [...baseFiles].filter(file => !searchLower || file.name.toLowerCase().includes(searchLower)).sort((a, b) => getRecentActivity(b) - getRecentActivity(a));

  // Filter folders by search query (only show in "all" view)
  const filteredFolders = viewMode === "all" ? folders.filter(folder => !searchLower || folder.name.toLowerCase().includes(searchLower)) : [];
  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) newSelected.delete(fileId);else newSelected.add(fileId);
    setSelectedFiles(newSelected);
  };
  const selectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };
  const storagePercentage = storageUsage.used / storageUsage.total * 100;
  return <div className="min-h-screen bg-background flex relative pb-20 md:pb-0" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* Drop zone overlay */}
      {isDragging && <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-card border-4 border-dashed border-primary rounded-2xl p-8 sm:p-12 text-center shadow-xl mx-4">
            <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-primary animate-bounce" />
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Drop files to upload</h3>
            <p className="text-sm sm:text-base text-muted-foreground">Release to upload your files to {currentFolderId ? "this folder" : "My Files"}</p>
          </div>
        </div>}
      
      {/* Upload Progress Panel */}
      {showUploadProgress && uploadProgress.length > 0 && <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              <span className="font-medium text-xs sm:text-sm text-foreground">
                Uploading {uploadProgress.length} file{uploadProgress.length > 1 ? 's' : ''}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
          setShowUploadProgress(false);
          setUploadProgress([]);
        }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="max-h-48 sm:max-h-60 overflow-y-auto">
            {uploadProgress.map((item, idx) => <div key={idx} className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs sm:text-sm text-foreground truncate flex-1 mr-2" title={item.fileName}>
                    {item.fileName}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.status === 'complete' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : item.status === 'error' ? <AlertCircle className="w-4 h-4 text-destructive" /> : item.status === 'processing' ? 'Processing...' : `${item.progress}%`}
                  </span>
                </div>
                <Progress value={item.status === 'complete' ? 100 : item.progress} className={`h-1.5 ${item.status === 'complete' ? '[&>div]:bg-green-500' : item.status === 'error' ? '[&>div]:bg-destructive' : ''}`} />
              </div>)}
          </div>
        </div>}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header - matches TaskFlow/MagicMergeTool style */}
        <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-4 sm:py-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-teal to-brand-teal/70 flex items-center justify-center shadow-sm">
                  <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground">Bosdrive</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Store, organise & share files with your team</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap self-end sm:self-auto">
              {canSwitchOrganizations && <OrganizationSwitcher />}
              <NotificationBell />
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground bg-secondary/50 rounded-full px-3 py-1.5">
                <HardDrive className="w-4 h-4" />
                <span>{formatFileSize(storageUsage.used)}</span>
                <span className="hidden sm:inline">/ {formatFileSize(storageUsage.total)}</span>
                <div className="w-16 sm:w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{
                  width: `${Math.min(storagePercentage, 100)}%`
                }} />
                </div>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-[#E4452C] hover:text-[#E4452C] hover:bg-[#E4452C]/10 ml-1" onClick={handleBuyMoreStorage}>
                  <CreditCard className="w-3 h-3 mr-1" />
                  <span className="hidden md:inline">Buy More</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto bg-card/50">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {/* Hero Section - matches MagicMergeTool style */}
            <div className="bg-gradient-to-r from-brand-teal/10 via-brand-green/5 to-transparent rounded-2xl p-4 sm:p-6 border border-brand-teal/20">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-xl bg-brand-teal/20 shrink-0">
                  <HardDrive className="w-5 h-5 sm:w-6 sm:h-6 text-brand-teal" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Your Team's File Hub</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-2xl">Securely store, organise, and share files. Track review status and collaborate seamlessly.</p>
                </div>
              </div>
            </div>

            {/* Template Library */}
            <Card className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 bg-primary/5 hover:bg-primary/10 border-primary/20 mb-4" onClick={() => navigate("/templates")}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <LayoutTemplate className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Business Resources & Templates</span>
                  <p className="text-xs text-muted-foreground">A central library for storing and managing business templates, shared resources, and company policies in one place.</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
              </div>
            </Card>

          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 flex-wrap">
            {/* Search Bar */}
            <div className="relative group flex-1 min-w-[140px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
              <Input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-full rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-md focus:shadow-md transition-all duration-300 text-sm" style={{
                borderColor: '#8CC646'
              }} />
              {searchQuery && <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 p-0.5 rounded-full hover:bg-muted" onClick={() => setSearchQuery("")}>
                  <X className="w-4 h-4" />
                </button>}
            </div>
            
            <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e => {
              if (!e.target.files || e.target.files.length === 0) return;

              // Open the upload dialog with pre-selected files
              setPendingUploadFiles(e.target.files);
              setPendingUploadFolderId(currentFolderId);
              setUploadDialogOpen(true);

              // Allow re-uploading the same file name without needing a refresh
              if (fileInputRef.current) fileInputRef.current.value = "";
            }} />
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground dark:text-black gap-1.5 sm:gap-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300 btn-smooth text-xs sm:text-sm px-3 sm:px-4" onClick={() => setUploadDialogOpen(true)} disabled={uploadMutation.isPending}>
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Files</span>
              <span className="sm:hidden">Upload</span>
            </Button>
            <Button className="gap-1.5 sm:gap-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300 text-white dark:text-black hover:opacity-90 bg-brand-orange border-brand-orange hover:bg-brand-orange/90 text-xs sm:text-sm px-3 sm:px-4" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">New Folder</span>
              <span className="sm:hidden">Folder</span>
            </Button>
            <Button variant="outline" className="gap-1.5 sm:gap-2 rounded-full shadow-sm hover:shadow-md transition-all duration-300 border-[#E4452C]/30 text-[#E4452C] hover:bg-[#E4452C]/10 text-xs sm:text-sm px-3 sm:px-4" onClick={handleBuyMoreStorage}>
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Buy More Storage</span>
              <span className="sm:hidden">Storage</span>
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 mb-6 sm:mb-8">
            <Button variant={viewMode === "all" ? "default" : "outline"} onClick={() => {
              setViewMode("all");
              setCurrentFolderId(null);
            }} className={`gap-2 rounded-full transition-all duration-300 text-xs sm:text-sm ${viewMode === "all" ? "bg-primary text-primary-foreground dark:text-black" : "hover:bg-secondary"}`}>
              <HardDrive className="w-4 h-4" />
              <span>All Files</span>
            </Button>
            <Button variant={viewMode === "shared" ? "default" : "outline"} onClick={() => {
              setViewMode("shared");
              setCurrentFolderId(null);
              setFolderFilter("all");
            }} className={`gap-2 rounded-full transition-all duration-300 text-xs sm:text-sm ${viewMode === "shared" ? "bg-brand-teal text-white" : "hover:bg-secondary"}`}>
              <Users className="w-4 h-4" />
              <span>Shared with me</span>
              {sharedWithMeFiles.length > 0 && viewMode !== "shared" && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {sharedWithMeFiles.length}
                </Badge>}
            </Button>
          </div>

          {/* Filters Section - only show in "all" view */}
          {viewMode === "all" && <Card className="p-4 sm:p-6 mb-6 sm:mb-8 bg-card border border-border/40 shadow-sm rounded-2xl">
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <ArrowUpDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#8CC646]" />
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Filters</h2>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Type, Status & Folders Filters */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={v => setTypeFilter(v as FileType)}>
                  <SelectTrigger className="w-[130px] sm:w-[160px] rounded-full bg-card shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm font-normal gap-1 sm:gap-2" style={{
                    borderColor: '#8CC646'
                  }}>
                    <File className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="File type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 shadow-lg">
                    {TYPE_FILTERS.map(filter => {
                      const Icon = filter.icon;
                      return <SelectItem key={filter.value} value={filter.value} className="rounded-lg">
                          <span className="flex items-center gap-2">
                            
                            {filter.label}
                          </span>
                        </SelectItem>;
                    })}
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={v => setStatusFilter(v as FileStatus)}>
                  <SelectTrigger className="w-[130px] sm:w-[160px] rounded-full bg-card shadow-sm hover:shadow-md transition-all duration-300 text-xs sm:text-sm font-normal gap-1 sm:gap-2" style={{
                    borderColor: '#8CC646'
                  }}>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/60 shadow-lg">
                    <SelectItem value="all" className="rounded-lg">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map(status => {
                      const Icon = status.icon;
                      return <SelectItem key={status.value} value={status.value} className="rounded-lg">
                          <span className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${status.color}`} />
                            {status.label}
                          </span>
                        </SelectItem>;
                    })}
                  </SelectContent>
                </Select>

                {/* Folders Filter - uses DropdownMenu for rename/delete actions - hidden when inside a folder */}
                {!currentFolderId && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 sm:h-10 px-2 sm:px-3 rounded-full bg-card shadow-sm hover:shadow-md transition-all duration-300 gap-1 sm:gap-2 min-w-[130px] sm:min-w-[160px] justify-start font-normal text-xs sm:text-sm" style={{
                      borderColor: '#8CC646'
                    }}>
                      <Folder className="w-4 h-4 text-muted-foreground" />
                      <span className="flex-1 text-left text-xs sm:text-sm font-normal truncate">
                        {folderFilter === "all" ? "All Folders" : folderFilter === "uncategorized" ? "Uncategorized" : allFolders.find(f => f.id === folderFilter)?.name || "Unknown"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-xl border-border/60 shadow-lg min-w-[180px]">
                    <DropdownMenuItem onClick={() => setFolderFilter("all")} className={`rounded-lg gap-2 ${folderFilter === "all" ? "bg-accent" : ""}`}>
                      All Folders
                      {folderFilter === "all" && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFolderFilter("uncategorized")} className={`rounded-lg gap-2 ${folderFilter === "uncategorized" ? "bg-accent" : ""}`}>
                      <File className="w-4 h-4" />
                      Uncategorized
                      {folderFilter === "uncategorized" && <Check className="w-4 h-4 ml-auto" />}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {allFolders.map(folder => <DropdownMenuItem key={folder.id} className="rounded-lg gap-2 group justify-between" onClick={() => setFolderFilter(folder.id)}>
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4" />
                          {folder.name}
                        </div>
                        <div className="flex items-center gap-1">
                          {folderFilter === folder.id && <Check className="w-4 h-4" />}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={e => {
                            e.stopPropagation();
                            setFolderToRename(folder);
                            setRenameFolderName(folder.name);
                            setRenameFolderOpen(true);
                          }}>
                              <PenLine className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={e => {
                            e.stopPropagation();
                            setFolderToDelete(folder);
                            setDeleteFolderConfirmOpen(true);
                          }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>}
              </div>
            </div>
          </Card>}

          {/* Bulk Action Bar */}
          {selectedFiles.size > 0 && <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="gap-2" onClick={selectAllFiles}>
                  <CheckSquare className="w-4 h-4" />
                  {selectedFiles.size === files.length ? "Deselect All" : "Select All"}
                </Button>
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Bulk Status Change */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Clock className="w-4 h-4" />
                      Change Status
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    {STATUS_OPTIONS.map(status => <DropdownMenuItem key={status.value} onClick={() => bulkStatusMutation.mutate({
                    fileIds: Array.from(selectedFiles),
                    status: status.value
                  })} className="gap-2">
                        <status.icon className={`w-4 h-4 ${status.color}`} />
                        {status.label}
                      </DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Bulk Move */}
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setMoveDialogOpen(true)}>
                  <FolderInput className="w-4 h-4" />
                  Move to Folder
                </Button>

                {/* Bulk Delete */}
                <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" onClick={() => bulkDeleteMutation.mutate(Array.from(selectedFiles))} disabled={bulkDeleteMutation.isPending}>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>

                {/* Clear Selection */}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedFiles(new Set())}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>}

          {/* Folders Section */}
          {filteredFolders.length > 0 && <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Folder className="w-5 h-5 text-brand-teal" />
                <h2 className="text-lg font-semibold text-foreground">Folders</h2>
                <span className="text-sm text-muted-foreground">({filteredFolders.length})</span>
              </div>
              <Card className="p-4 bg-card border border-border dark:bg-[#1D2128]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFolders.map(folder => <div key={folder.id} className={`p-5 rounded-lg cursor-pointer transition-all border-2 bg-[#ffffff] dark:bg-[#2a2f38] ${dragOverFolderId === folder.id ? "border-primary bg-primary/5 scale-[1.02]" : "border-transparent hover:border-[#F5B638]/30 hover:bg-[#ffffff] dark:hover:bg-[#2a2f38]"}`} onClick={() => setCurrentFolderId(folder.id)} onDragOver={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(folder.id);
                }} onDragEnter={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(folder.id);
                }} onDragLeave={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (dragOverFolderId === folder.id) {
                    setDragOverFolderId(null);
                  }
                }} onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(null);
                  setIsDragging(false);
                  dragCounter.current = 0;

                  // Check if this is a file upload from external source
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    // Open the upload dialog with pre-selected files and target folder
                    setPendingUploadFiles(e.dataTransfer.files);
                    setPendingUploadFolderId(folder.id);
                    setUploadDialogOpen(true);
                    e.dataTransfer.clearData();
                    return;
                  }

                  // Otherwise, it's an internal file move
                  const fileId = e.dataTransfer.getData("fileId");
                  if (fileId) {
                    singleFileMoveeMutation.mutate({
                      fileId,
                      folderId: folder.id
                    });
                  }
                }}>
                      <div className="flex flex-col items-center text-center relative group">
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => {
                        e.stopPropagation();
                        setFolderToRename(folder);
                        setRenameFolderName(folder.name);
                        setRenameFolderOpen(true);
                      }}>
                            <PenLine className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => {
                        e.stopPropagation();
                        setFolderToDelete(folder);
                        setDeleteFolderConfirmOpen(true);
                      }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <Folder className={`w-14 h-14 mb-3 transition-colors ${dragOverFolderId === folder.id ? "text-primary" : "text-brand-teal"}`} fill={dragOverFolderId === folder.id ? "hsl(var(--primary) / 0.3)" : "hsl(var(--brand-teal))"} />
                        <h3 className="font-medium text-foreground dark:text-white">{folder.name}</h3>
                        <p className="text-sm text-muted-foreground dark:text-white/70">
                          {folderCounts[folder.id] || 0} Files
                        </p>
                        {dragOverFolderId === folder.id && <p className="text-xs text-primary mt-2 font-medium">Drop to upload here</p>}
                      </div>
                    </div>)}
                </div>
              </Card>
            </div>}

          {/* Files Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {viewMode === "shared" ? <>
                  <Users className="w-5 h-5 text-brand-teal" />
                  <h2 className="text-lg font-semibold text-foreground">Shared with me</h2>
                </> : <>
                  <Clock className="w-5 h-5 text-brand-coral" />
                  <h2 className="text-lg font-semibold text-foreground">All Files</h2>
                </>}
              <span className="text-sm text-muted-foreground">({recentFiles.length})</span>
            </div>

            {viewMode === "shared" && <p className="text-sm text-muted-foreground mb-4">
                Files that have been shared with you or assigned to you for review.
              </p>}

            {recentFiles.length === 0 ? <Card className="p-12 text-center">
                {viewMode === "shared" ? <>
                    <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">No Shared Files</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Files shared with you or assigned for review will appear here.
                    </p>
                  </> : <>
                    <HardDrive className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">No Files Yet</h2>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Upload files to store and share them with your team.
                    </p>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setUploadDialogOpen(true)}>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Your First File
                    </Button>
                  </>}
              </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentFiles.map(file => {
                const statusDisplay = STATUS_DISPLAY[file.status] || STATUS_DISPLAY.not_opened;
                const uploaderName = profileMap[file.uploaded_by] || "Unknown";
                const folder = allFolders.find(f => f.id === file.folder_id);
                return <Card key={file.id} className="bg-white dark:bg-[#1D2128] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-grab active:cursor-grabbing" draggable onDragStart={e => {
                  e.dataTransfer.setData("fileId", file.id);
                  e.dataTransfer.effectAllowed = "move";
                }} onDragEnd={() => {
                  setDragOverFolderId(null);
                }}>
                      {/* Header with file icon and version */}
                      <div className="p-4 pb-2">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 bg-brand-teal/10 rounded-xl flex items-center justify-center shadow-sm border border-brand-teal/20">
                              <FileText className="w-6 h-6 text-brand-teal" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground dark:text-white truncate max-w-[140px]" style={{
                              fontSize: `${0.875 * driveTextSize}rem`
                            }}>{file.name.replace(/\.[^/.]+$/, "")}</h3>
                                <span className="font-medium text-muted-foreground dark:text-white/70 bg-muted dark:bg-[#2a2f38] px-1.5 py-0.5 rounded" style={{
                              fontSize: `${0.75 * driveTextSize}rem`
                            }}>V{file.version}</span>
                              </div>
                              <p className="text-muted-foreground dark:text-white/60" style={{
                            fontSize: `${0.75 * driveTextSize}rem`
                          }}>Uploaded by {uploaderName.split(" ")[0]}. {uploaderName.split(" ")[1]?.[0] || ""}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => viewFile(file)} className="gap-2">
                                <Eye className="w-4 h-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => downloadFile(file)} className="gap-2">
                                <Download className="w-4 h-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                            setFileToMove(file);
                            setSingleFileMoveDialogOpen(true);
                          }} className="gap-2">
                                <FolderInput className="w-4 h-4" />
                                Move to folder
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setVersionDialogFile(file)} className="gap-2">
                                <Clock className="w-4 h-4" />
                                View Versions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditFileDialog(file)} className="gap-2">
                                <Settings2 className="w-4 h-4" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                            setDocumentEditorFile(file);
                            setDocumentEditorOpen(true);
                          }} className="gap-2">
                                <Edit3 className="w-4 h-4" />
                                Edit Document
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteFileMutation.mutate(file.id)} className="gap-2 text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Folder metadata badge and permission indicators */}
                      <div className="px-4 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs gap-1 bg-brand-green/10 text-brand-green border-brand-green/20">
                            <Folder className="w-3 h-3" />
                            {folder ? folder.name : file.file_category === "template" ? "Template Library" : "No folder"}
                          </Badge>
                          {file.is_restricted && <Badge variant="outline" className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                              <Lock className="w-3 h-3" />
                              Restricted
                            </Badge>}
                          {file.file_category && CATEGORY_DISPLAY[file.file_category] && (() => {
                        const category = CATEGORY_DISPLAY[file.file_category!];
                        const CategoryIcon = category.icon;
                        return <Badge variant="outline" className={`text-xs gap-1 ${category.bgColor} ${category.textColor} ${category.borderColor}`}>
                                  <CategoryIcon className="w-3 h-3" />
                                  {category.label}
                                </Badge>;
                      })()}
                          {file.requires_signature && <Badge variant="outline" className={`text-xs gap-1 ${file.signature_status === 'signed' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                              <PenLine className="w-3 h-3" />
                              {file.signature_status === 'signed' ? 'Signed' : 'Awaiting Signature'}
                            </Badge>}
                          {/* Share type indicator for shared view */}
                          {viewMode === "shared" && <>
                              {file.is_restricted && <Badge variant="outline" className="text-xs gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                                  <Lock className="w-3 h-3" />
                                  Shared Access
                                </Badge>}
                              {file.assigned_to === user?.id && !file.is_restricted && <Badge variant="outline" className="text-xs gap-1 bg-brand-teal/10 text-brand-teal border-brand-teal/20">
                                  <Eye className="w-3 h-3" />
                                  For Review
                                </Badge>}
                            </>}
                        </div>
                      </div>

                      {/* File description/content preview */}
                      <div className="px-4 pb-3">
                        <div className="bg-gray-50 dark:bg-[#2a2f38] rounded-lg p-3 text-xs text-muted-foreground dark:text-white/70 min-h-[100px] max-h-[120px] overflow-hidden">
                          {file.description ? <p>{file.description}</p> : <div className="space-y-1.5">
                              <p className="font-medium text-foreground/70 dark:text-white/80">{file.name}</p>
                              <p>File type: {file.mime_type || "Unknown"}</p>
                              <p>Size: {formatFileSize(file.file_size)}</p>
                              <p>Uploaded: {format(new Date(file.created_at), "dd/MM/yyyy")}</p>
                            </div>}
                        </div>
                      </div>

                      {/* Status badge and shared users */}
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`flex items-center gap-2 ${statusDisplay.color} hover:opacity-80 transition-opacity cursor-pointer`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${file.status === "completed" ? "bg-[#8CC646]" : file.status === "review_failed" ? "bg-[#DF4C33]" : file.status === "in_review" ? "bg-[#176884]" : "bg-[#F5B536]"}`} />
                                <span className="text-sm font-medium">{statusDisplay.label}</span>
                                <ChevronDown className="w-3 h-3 ml-1" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-popover">
                              {STATUS_OPTIONS.filter(opt => opt.value !== "binned").map(option => {
                            const Icon = option.icon;
                            return <DropdownMenuItem key={option.value} onClick={() => updateStatusMutation.mutate({
                              fileId: file.id,
                              status: option.value
                            })} className={`gap-2 ${file.status === option.value ? "bg-accent" : ""}`}>
                                    <Icon className={`w-4 h-4 ${option.color}`} />
                                    {option.label}
                                    {file.status === option.value && <Check className="w-4 h-4 ml-auto" />}
                                  </DropdownMenuItem>;
                          })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {file.assigned_to && <p className="text-xs text-muted-foreground mt-1">
                            Assigned to {profileMap[file.assigned_to] || "Unknown"}
                          </p>}
                      </div>
                    </Card>;
              })}
              </div>}
          </div>

          {/* Back to parent folder */}
          {currentFolderId && <Button variant="ghost" className="mt-4" onClick={() => setCurrentFolderId(null)}>
              ← Back
            </Button>}
        </div>
      </div>
      </div>
      <SideNavigation />

      {/* Recycle Bin Panel */}
      <div className={`fixed bottom-4 right-20 z-40 transition-all duration-300 ${trashPanelOpen ? "w-80" : "w-auto"}`}>
        {trashPanelOpen ? <Card className="shadow-xl border-2 overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer" onClick={() => setTrashPanelOpen(false)}>
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">Recycle Bin</span>
                <span className="text-xs text-muted-foreground">({deletedFiles.length})</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {deletedFiles.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">
                  <Trash2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Recycle bin is empty</p>
                </div> : <div className="p-2 space-y-1">
                  {deletedFiles.map(file => <div key={file.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 group">
                      {getFileIcon(file.mime_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getDaysUntilDeletion(file.deleted_at!)} days left
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => restoreFileMutation.mutate(file.id)} disabled={restoreFileMutation.isPending}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => permanentDeleteMutation.mutate(file)} disabled={permanentDeleteMutation.isPending}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </div>
            <div className="p-2 border-t bg-muted/30 text-xs text-center text-muted-foreground">
              Files are permanently deleted after 30 days
            </div>
          </Card> : <Button variant="outline" size="sm" className="shadow-lg gap-2 bg-background" onClick={() => setTrashPanelOpen(true)}>
            <Trash2 className="w-4 h-4" />
            Recycle Bin
            {deletedFiles.length > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px]">
                {deletedFiles.length}
              </span>}
            <ChevronUp className="w-3 h-3" />
          </Button>}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input id="folder-name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => createFolderMutation.mutate(newFolderName)} disabled={!newFolderName.trim() || createFolderMutation.isPending}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-folder">Folder Name</Label>
            <Input id="rename-folder" value={renameFolderName} onChange={e => setRenameFolderName(e.target.value)} placeholder="Enter new folder name" className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setRenameFolderOpen(false);
            setFolderToRename(null);
            setRenameFolderName("");
          }}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => folderToRename && renameFolderMutation.mutate({
            folderId: folderToRename.id,
            name: renameFolderName
          })} disabled={!renameFolderName.trim() || renameFolderMutation.isPending}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={deleteFolderConfirmOpen} onOpenChange={setDeleteFolderConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete "{folderToDelete?.name}"? Files in this folder will be moved to uncategorized.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setDeleteFolderConfirmOpen(false);
            setFolderToDelete(null);
          }}>Cancel</Button>
            <Button variant="destructive" onClick={() => folderToDelete && deleteFolderMutation.mutate(folderToDelete.id)} disabled={deleteFolderMutation.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Move Files Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {selectedFiles.size} file{selectedFiles.size !== 1 ? "s" : ""} to folder</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
            <Button variant={currentFolderId === null ? "secondary" : "ghost"} className="w-full justify-start gap-2" onClick={() => bulkMoveMutation.mutate({
            fileIds: Array.from(selectedFiles),
            folderId: null
          })} disabled={currentFolderId === null || bulkMoveMutation.isPending}>
              <Folder className="w-4 h-4" />
              My Files
            </Button>
            {allFolders.map(folder => <Button key={folder.id} variant={folder.id === currentFolderId ? "secondary" : "ghost"} className="w-full justify-start gap-2" onClick={() => bulkMoveMutation.mutate({
            fileIds: Array.from(selectedFiles),
            folderId: folder.id
          })} disabled={folder.id === currentFolderId || bulkMoveMutation.isPending}>
                <Folder className="w-4 h-4 text-orange-400" />
                {folder.name}
              </Button>)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single File Move Dialog */}
      <Dialog open={singleFileMoveDialogOpen} onOpenChange={setSingleFileMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move "{fileToMove?.name}" to folder</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-64 overflow-y-auto">
            <Button variant={fileToMove?.folder_id === null ? "secondary" : "ghost"} className="w-full justify-start gap-2" onClick={() => fileToMove && singleFileMoveeMutation.mutate({
            fileId: fileToMove.id,
            folderId: null
          })} disabled={fileToMove?.folder_id === null || singleFileMoveeMutation.isPending}>
              <File className="w-4 h-4" />
              Uncategorized (No folder)
            </Button>
            {allFolders.map(folder => <Button key={folder.id} variant={folder.id === fileToMove?.folder_id ? "secondary" : "ghost"} className="w-full justify-start gap-2" onClick={() => fileToMove && singleFileMoveeMutation.mutate({
            fileId: fileToMove.id,
            folderId: folder.id
          })} disabled={folder.id === fileToMove?.folder_id || singleFileMoveeMutation.isPending}>
                <Folder className="w-4 h-4 text-orange-400" />
                {folder.name}
              </Button>)}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setSingleFileMoveDialogOpen(false);
            setFileToMove(null);
          }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={!!versionDialogFile} onOpenChange={open => !open && setVersionDialogFile(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Version History - {versionDialogFile?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3 max-h-96 overflow-y-auto">
            {fileVersions.map(version => {
            const uploaderName = profileMap[version.uploaded_by] || "Unknown";
            const isLatestVersion = version.version === Math.max(...fileVersions.map(v => v.version));
            const statusDisplay = STATUS_DISPLAY[version.status] || {
              label: version.status,
              color: "text-muted-foreground",
              bgColor: "bg-muted"
            };
            return <div key={version.id} className={`flex items-center justify-between p-4 rounded-lg border ${isLatestVersion ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">Version {version.version}</p>
                        {isLatestVersion && <span className="text-xs font-medium bg-primary text-primary-foreground px-2 py-0.5 rounded">
                            Current
                          </span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(version.created_at), "dd/MM/yyyy HH:mm")} • {uploaderName}
                      </p>
                      <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded text-xs font-medium ${statusDisplay.bgColor} ${statusDisplay.color}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${version.status === "completed" ? "bg-green-500" : version.status === "review_failed" ? "bg-orange-500" : version.status === "in_review" ? "bg-purple-500" : "bg-yellow-500"}`} />
                        {statusDisplay.label}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewFile(version)} title="View">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadFile(version)} title="Download">
                      <Download className="w-4 h-4" />
                    </Button>
                    {!isLatestVersion && fileVersions.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                  deleteFileMutation.mutate(version.id);
                  queryClient.invalidateQueries({
                    queryKey: ["file-versions"]
                  });
                }} title="Delete this version">
                        <Trash2 className="w-4 h-4" />
                      </Button>}
                  </div>
                </div>;
          })}
            {fileVersions.length === 0 && <p className="text-center text-muted-foreground py-4">No version history available</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogFile(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit File Details Dialog */}
      <Dialog open={editFileDialogOpen} onOpenChange={open => {
      if (!open) {
        setEditFileDialogOpen(false);
        setFileToEdit(null);
      }
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit File Details</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="edit-file-name">File Name</Label>
              <Input id="edit-file-name" value={editFileName} onChange={e => setEditFileName(e.target.value)} placeholder="Enter file name" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="edit-file-description">Description</Label>
              <Textarea id="edit-file-description" value={editFileDescription} onChange={e => setEditFileDescription(e.target.value)} placeholder="Add a description (optional)" className="mt-2 min-h-[80px]" />
            </div>
            <div>
              <Label>Folder</Label>
              <Select value={editFileFolderId || "uncategorized"} onValueChange={val => setEditFileFolderId(val === "uncategorized" ? null : val)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">
                    <div className="flex items-center gap-2">
                      <File className="w-4 h-4" />
                      Uncategorized
                    </div>
                  </SelectItem>
                  {allFolders.map(folder => <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-orange-400" />
                        {folder.name}
                      </div>
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assigned Reviewer</Label>
              <Select value={editFileAssignedTo || "unassigned"} onValueChange={val => setEditFileAssignedTo(val === "unassigned" ? null : val)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select reviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map(member => <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setEditFileDialogOpen(false);
            setFileToEdit(null);
          }}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => fileToEdit && updateFileMetadataMutation.mutate({
            fileId: fileToEdit.id,
            name: editFileName,
            description: editFileDescription || null,
            folder_id: editFileFolderId,
            assigned_to: editFileAssignedTo
          })} disabled={!editFileName.trim() || updateFileMetadataMutation.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={open => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile && getFileIcon(previewFile.mime_type)}
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-0">
            {previewLoading ? <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div> : previewUrl && previewFile ? <>
                {previewFile.mime_type?.startsWith("image/") && <div className="flex items-center justify-center p-4">
                    <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
                  </div>}
                {previewFile.mime_type?.startsWith("video/") && <div className="flex items-center justify-center p-4">
                    <video src={previewUrl} controls className="max-w-full max-h-[60vh] rounded-lg" />
                  </div>}
                {previewFile.mime_type?.startsWith("audio/") && <div className="flex items-center justify-center p-8">
                    <audio src={previewUrl} controls className="w-full max-w-md" />
                  </div>}
                {previewFile.mime_type === "application/pdf" && <div className="w-full h-[60vh] rounded-lg border overflow-hidden bg-background">
                    <iframe src={previewUrl} className="w-full h-full" title={previewFile.name} />
                  </div>}
                {!isPreviewable(previewFile.mime_type) && <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                    <File className="w-16 h-16 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Preview not available for this file type.
                    </p>
                    <Button onClick={() => downloadFile(previewFile)} className="gap-2">
                      <Download className="w-4 h-4" />
                      Download to View
                    </Button>
                  </div>}
              </> : <div className="flex items-center justify-center h-64 text-muted-foreground">
                Failed to load preview
              </div>}
          </div>
          <DialogFooter className="flex-shrink-0">
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-sm text-muted-foreground">
                {previewFile && formatFileSize(previewFile.file_size)}
              </span>
              <div className="flex gap-2">
                {previewFile && <Button variant="outline" onClick={() => downloadFile(previewFile)} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>}
                <Button variant="outline" onClick={closePreview}>
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog with permissions */}
      <FileUploadDialog open={uploadDialogOpen} onOpenChange={open => {
      setUploadDialogOpen(open);
      if (!open) {
        setPendingUploadFiles(null);
        setPendingUploadFolderId(null);
      }
    }} teamMembers={teamMembers} folders={allFolders} currentFolderId={pendingUploadFolderId ?? currentFolderId} initialFiles={pendingUploadFiles} onClearInitialFiles={() => {
      setPendingUploadFiles(null);
      setPendingUploadFolderId(null);
    }} onUpload={async (files, options) => {
      await uploadMutation.mutateAsync({
        files,
        targetFolderId: options.folderId,
        fileCategory: options.fileCategory,
        isRestricted: options.isRestricted,
        requiresSignature: options.requiresSignature,
        assignedUsers: options.assignedUsers
      });
    }} onCreateFolder={async name => {
      const result = await createFolderMutation.mutateAsync(name);
      return result ? {
        id: result.id,
        name: result.name
      } : null;
    }} />

      {/* Document Editor Dialog */}
      <DocumentEditorDialog open={documentEditorOpen} onOpenChange={setDocumentEditorOpen} file={documentEditorFile} />

      {/* Storage Purchase Dialog */}
      <Dialog open={storagePurchaseDialogOpen} onOpenChange={setStoragePurchaseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Buy More Storage
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Choose a storage plan for your organization. All team members will have access to the additional storage.
            </p>
            
            {/* 1GB Option */}
            <Card className={`p-4 cursor-pointer hover:border-primary/50 transition-all ${purchasingTier === "1gb" ? "border-primary" : ""}`} onClick={() => !purchasingTier && handlePurchaseTier("1gb")}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">1 GB</h4>
                  <p className="text-sm text-muted-foreground">Perfect for small teams</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#E4452C]">$1.49</span>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
            </Card>

            {/* 10GB Option */}
            <Card className={`p-4 cursor-pointer hover:border-primary/50 transition-all border-primary/30 relative ${purchasingTier === "10gb" ? "border-primary" : ""}`} onClick={() => !purchasingTier && handlePurchaseTier("10gb")}>
              <Badge className="absolute -top-2 right-2 bg-[#E4452C] text-white text-[10px]">Popular</Badge>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">10 GB</h4>
                  <p className="text-sm text-muted-foreground">Best value for growing teams</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#E4452C]">$9.99</span>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
            </Card>

            {/* 100GB Option */}
            <Card className={`p-4 cursor-pointer hover:border-primary/50 transition-all ${purchasingTier === "100gb" ? "border-primary" : ""}`} onClick={() => !purchasingTier && handlePurchaseTier("100gb")}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">100 GB</h4>
                  <p className="text-sm text-muted-foreground">For large organizations</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#E4452C]">$99</span>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoragePurchaseDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>;
};
export default Drive;