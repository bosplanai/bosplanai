import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Folder, 
  FileText, 
  Download, 
  ChevronRight, 
  Home,
  Lock,
  Image,
  File,
  FileSpreadsheet,
  Presentation,
  Upload,
  CloudUpload,
  ArrowLeft,
  FolderPlus,
  FolderLock,
  MessageSquare,
  Activity,
  Users,
  Send,
  Mail,
  CheckCircle,
  FileUp,
  UserPlus,
  Eye,
  FileSignature,
  Trash2,
  RefreshCw,
  Shield,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import bosplanLogo from "@/assets/bosplan-logo.png";
import GuestFilePreviewDialog from "@/components/dataroom/GuestFilePreviewDialog";
import GuestDataRoomDocumentEditorDialog from "@/components/dataroom/GuestDataRoomDocumentEditorDialog";
import { GuestAddToFolderDropdown } from "@/components/dataroom/GuestAddToFolderDropdown";
import { GuestDataRoomFileCard } from "@/components/dataroom/GuestDataRoomFileCard";
import { DataRoomVersionHistoryDialog } from "@/components/dataroom/DataRoomVersionHistoryDialog";
import { isEditableDocument as isEditableDocumentUtil } from "@/lib/documentUtils";

interface PreviewFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "video" | "document" | "other";
  mimeType?: string;
  permissionLevel?: "view" | "edit";
}

interface DataRoomInfo {
  id: string;
  name: string;
  description: string | null;
  organizationName: string;
  organizationId: string;
}

interface FolderItem {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface FileItem {
  id: string;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
  permission_level?: "view" | "edit";
  folder_id?: string | null;
  folder_name?: string | null;
  is_own_upload?: boolean;
  version?: number;
  assigned_to?: string | null;
  uploaded_by?: string;
  is_restricted?: boolean;
  status?: string;
}

interface FileVersion {
  id: string;
  name: string;
  version: number;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
  status?: string;
  parent_file_id?: string | null;
}

interface Breadcrumb {
  id: string;
  name: string;
}

interface Message {
  id: string;
  sender_id: string | null;
  sender_name: string;
  sender_email: string;
  message: string;
  is_guest: boolean;
  created_at: string;
}

interface ActivityItem {
  id: string;
  user_name: string;
  user_email: string;
  action: string;
  details: Record<string, unknown> | null;
  is_guest: boolean;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  is_owner?: boolean;
  email?: string | null;
  user: {
    full_name: string;
    job_role: string | null;
  };
}

interface Guest {
  id: string;
  email: string;
  guest_name: string | null;
  nda_signed_at: string | null;
  access_id: string | null;
}

const GuestDataRoom = () => {
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState<"verify" | "browse" | "resign">("verify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ndaUpdateMessage, setNdaUpdateMessage] = useState<string | null>(null);
  
  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Data room state
  const [dataRoom, setDataRoom] = useState<DataRoomInfo | null>(null);
  const [guestName, setGuestName] = useState<string>("");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [editFile, setEditFile] = useState<FileItem | null>(null);
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Activity state
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  
  // Team state
  const [members, setMembers] = useState<Member[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  
  // NDA re-sign state
  const [ndaContent, setNdaContent] = useState<string | null>(null);
  const [resignName, setResignName] = useState("");
  const [resignAgreed, setResignAgreed] = useState(false);
  const [signingNda, setSigningNda] = useState(false);
  
  // Tab state for controlled component to prevent reset on re-render
  const [activeTab, setActiveTab] = useState("team");
  
  // Unread messages tracking for guests
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(null);

  // File permissions state
  const [permissionsFile, setPermissionsFile] = useState<FileItem | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [filePermissions, setFilePermissions] = useState<Array<{
    id: string;
    permissionLevel: string;
    referenceId: string;
    type: "team" | "guest";
    name: string;
    email?: string | null;
  }>>([]);
  const [availableTeamMembers, setAvailableTeamMembers] = useState<Array<{
    id: string;
    name: string;
    type: "team";
  }>>([]);
  const [availableGuests, setAvailableGuests] = useState<Array<{
    id: string;
    name: string;
    email: string;
    type: "guest";
  }>>([]);
  const [isFileRestricted, setIsFileRestricted] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Array<{
    referenceId: string;
    permission: "view" | "edit";
    type: "team" | "guest";
  }>>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Folder creation state
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Delete state
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Version history state
  const [versionHistoryFile, setVersionHistoryFile] = useState<{ id: string; name: string } | null>(null);
  const [fileVersions, setFileVersions] = useState<FileVersion[]>([]);
  const [versionProfileMap, setVersionProfileMap] = useState<Record<string, string>>({});
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Profile map for uploaders and assignees
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [allFolders, setAllFolders] = useState<FolderItem[]>([]);

  const token = searchParams.get("token");
  const accessIdParam = searchParams.get("accessId");

  useEffect(() => {
    if (accessIdParam) {
      setPassword(accessIdParam.toUpperCase());
    }
  }, [accessIdParam]);

  const extractFunctionErrorDetails = async (fnError: any): Promise<{ error: string; code?: string; ndaContent?: string }> => {
    if (!fnError) return { error: "Unknown error" };
    const ctx = fnError?.context;
    try {
      if (ctx instanceof Response) {
        const text = await ctx.text();
        try {
          const json = JSON.parse(text);
          if (json?.error) return { error: String(json.error), code: json.code, ndaContent: json.ndaContent };
        } catch { /* ignore */ }
        if (text) return { error: text };
      }
      if (ctx?.body) {
        const bodyText = typeof ctx.body === "string" ? ctx.body : JSON.stringify(ctx.body);
        try {
          const json = JSON.parse(bodyText);
          if (json?.error) return { error: String(json.error), code: json.code, ndaContent: json.ndaContent };
        } catch { /* ignore */ }
        if (bodyText) return { error: bodyText };
      }
    } catch { /* ignore */ }
    return { error: fnError?.message || "Request failed" };
  };

  // Helper for simpler error extraction (backward compatible)
  const extractFunctionErrorMessage = async (fnError: any): Promise<string> => {
    const details = await extractFunctionErrorDetails(fnError);
    return details.error;
  };

  const fetchContent = async (folderId: string | null = null) => {
    if (!password || !email) return;

    setLoading(true);
    setError(null);
    setNdaUpdateMessage(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-data-room-content",
        {
          body: { password: token || password, email: email.toLowerCase(), folderId },
        }
      );

      if (fnError) {
        const errorDetails = await extractFunctionErrorDetails(fnError);
        if (errorDetails.code === "NDA_UPDATED") {
          // Fetch NDA details to get the current content
          await fetchNdaForResign();
          setNdaUpdateMessage("The NDA for this data room has been updated. Please re-sign to continue access.");
          setStep("resign");
          return;
        }
        throw new Error(errorDetails.error);
      }
      
      if (data?.error) {
        if (data.code === "NDA_UPDATED") {
          await fetchNdaForResign();
          setNdaUpdateMessage(data.message || "The NDA has been updated. Please re-sign to continue.");
          setStep("resign");
          return;
        }
        throw new Error(data.error);
      }

      setDataRoom(data.dataRoom);
      setGuestName(data.guestName || "Guest");
      setResignName(data.guestName || "");
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setBreadcrumbs(data.breadcrumbs || []);
      setCurrentFolderId(data.currentFolderId);
      setProfileMap(data.profileMap || {});
      setAllFolders(data.allFolders || []);
      setStep("browse");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load content";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNdaForResign = async () => {
    try {
      console.log("[fetchNdaForResign] Fetching NDA details for token:", token || password);
      const { data, error } = await supabase.functions.invoke("get-nda-details", {
        body: { token: token || password, email: email.toLowerCase() },
      });
      
      console.log("[fetchNdaForResign] Response:", { data, error });
      
      if (error) {
        console.error("[fetchNdaForResign] Error fetching NDA:", error);
        return;
      }
      
      if (data?.data_room?.nda_content) {
        setNdaContent(data.data_room.nda_content);
        setResignName(data.guest_name || resignName || "");
        setDataRoom({
          id: data.data_room.id,
          name: data.data_room.name,
          description: data.data_room.description,
          organizationName: data.data_room.organization?.name || "",
          organizationId: "",
        });
      } else {
        console.warn("[fetchNdaForResign] No NDA content in response");
      }
    } catch (err) {
      console.error("[fetchNdaForResign] Failed to fetch NDA details:", err);
    }
  };

  const handleResignNda = async () => {
    if (!resignName.trim() || !resignAgreed) {
      setError("Please enter your name and agree to the terms");
      return;
    }

    if (!ndaContent) {
      setError("Loading the latest NDA. Please wait a moment and try again.");
      return;
    }

    setSigningNda(true);
    setError(null);

    try {
      const { error: signError } = await supabase.functions.invoke("sign-nda", {
        body: {
          token: token || password,
          signerName: resignName.trim(),
          signerEmail: email.toLowerCase(),
        },
      });

      if (signError) {
        const details = await extractFunctionErrorDetails(signError);
        throw new Error(details.error);
      }

      toast.success("NDA signed successfully!");
      setResignAgreed(false);
      setStep("verify");
      // Retry fetching content after re-signing
      await fetchContent(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to sign NDA";
      setError(message);
      toast.error(message);
    } finally {
      setSigningNda(false);
    }
  };
  const handleVerify = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    await fetchContent(null);
  };

  const handleFolderClick = async (folderId: string) => {
    await fetchContent(folderId);
  };

  const handleBreadcrumbClick = async (folderId: string | null) => {
    await fetchContent(folderId);
  };

  const handleDownload = async (file: FileItem, format?: 'original' | 'pdf') => {
    // For PDF format, check for edited document content first
    if (format === 'pdf') {
      // Try to get document content from edge function or handle via print
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-file-download",
        {
          body: { token: token || password, email: email.toLowerCase(), fileId: file.id, mode: "preview" },
        }
      );

      if (!fnError && data?.downloadUrl) {
        // For PDF export, open in new window for printing
        const printWindow = window.open(data.downloadUrl, '_blank');
        if (printWindow) {
          toast.success("Opening file for PDF export. Use browser's Print > Save as PDF option.");
        } else {
          toast.error("Could not open print window. Please allow popups.");
        }
      } else {
        toast.error("Failed to prepare PDF export");
      }
      return;
    }

    // Original format download
    setDownloading(file.id);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-file-download",
        {
          body: { token: token || password, email: email.toLowerCase(), fileId: file.id },
        }
      );

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      window.open(data.downloadUrl, "_blank");
      toast.success(`Downloading ${file.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download file");
    } finally {
      setDownloading(null);
    }
  };

  // File preview handler
  const handleFilePreview = async (file: FileItem) => {
    // Determine file type first
    const mimeType = file.mime_type || "";
    let fileType: "image" | "pdf" | "video" | "document" | "other" = "other";
    
    if (mimeType.startsWith("image/")) {
      fileType = "image";
    } else if (mimeType === "application/pdf") {
      fileType = "pdf";
    } else if (mimeType.startsWith("video/")) {
      fileType = "video";
    } else if (
      mimeType.includes("word") ||
      mimeType.includes("document") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") ||
      mimeType.includes("presentation") ||
      mimeType.includes("powerpoint")
    ) {
      fileType = "document";
    }

    // Check if file is an editable document (can be viewed from document content)
    const isEditable = isEditableDocumentUtil(mimeType, file.name);

    // For editable documents, we can open preview without storage URL
    // The preview dialog will fetch document content from database
    if (isEditable) {
      setPreviewFile({
        id: file.id,
        name: file.name,
        url: "", // Will be populated if storage URL succeeds, but not required
        type: fileType,
        mimeType: file.mime_type || undefined,
        permissionLevel: file.permission_level,
      });

      // Try to get storage URL in background for download functionality
      supabase.functions.invoke("get-guest-file-download", {
        body: { token: token || password, email: email.toLowerCase(), fileId: file.id, mode: "preview" },
      }).then(({ data }) => {
        if (data?.downloadUrl) {
          setPreviewFile(prev => prev ? { ...prev, url: data.downloadUrl } : null);
        }
      }).catch(() => {
        // Silent fail - document content will be shown instead
      });
      return;
    }

    // For non-editable files (images, PDFs, videos), we need the storage URL
    setDownloading(file.id);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-file-download",
        {
          body: { token: token || password, email: email.toLowerCase(), fileId: file.id, mode: "preview" },
        }
      );

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      setPreviewFile({
        id: file.id,
        name: file.name,
        url: data.downloadUrl,
        type: fileType,
        mimeType: file.mime_type || undefined,
        permissionLevel: file.permission_level,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load file preview");
    } finally {
      setDownloading(null);
    }
  };

  // Upload handlers
  const handleFileUpload = async (filesToUpload: File[]) => {
    if (!dataRoom || filesToUpload.length === 0) return;
    
    setUploading(true);
    let successCount = 0;
    
    for (const file of filesToUpload) {
      try {
        const formData = new FormData();
        formData.append("token", token || password);
        formData.append("email", email.toLowerCase());
        formData.append("file", file);
        if (currentFolderId) {
          formData.append("folderId", currentFolderId);
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guest-file-upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Upload failed");
        
        successCount++;
      } catch (err) {
        toast.error(`Failed to upload ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    setUploading(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`);
      await fetchContent(currentFolderId);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileUpload(Array.from(selectedFiles));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  }, [currentFolderId, dataRoom, email, password, token]);

  // Chat handlers
  const fetchMessages = async () => {
    if (!dataRoom) return;
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-chat-messages",
        { body: { token: token || password, email: email.toLowerCase() } }
      );
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;
    
    setSendingMessage(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "guest-send-message",
        { body: { token: token || password, email: email.toLowerCase(), message: newMessage.trim() } }
      );
      
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);
      
      setNewMessage("");
      await fetchMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Activity handlers
  const fetchActivity = async () => {
    if (!dataRoom) return;
    setLoadingActivities(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-activity",
        { body: { token: token || password, email: email.toLowerCase() } }
      );
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      setActivities(data.activities || []);
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoadingActivities(false);
    }
  };

  // Team handlers
  const fetchTeam = async () => {
    if (!dataRoom) return;
    setLoadingTeam(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-team-members",
        { body: { token: token || password, email: email.toLowerCase() } }
      );
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      setMembers(data.members || []);
      setGuests(data.guests || []);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // File permissions handlers
  const openFilePermissions = async (file: FileItem) => {
    setPermissionsFile(file);
    setPermissionsLoading(true);
    setFilePermissions([]);
    setAvailableGuests([]);
    setAvailableTeamMembers([]);
    setSelectedPermissions([]);
    setIsFileRestricted(false);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "guest-manage-file-permissions",
        { 
          body: { 
            action: "get",
            token: token || password, 
            email: email.toLowerCase(),
            fileId: file.id,
          } 
        }
      );
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      
      setFilePermissions(data.permissions || []);
      setAvailableGuests(data.availableMembers?.guests || []);
      setAvailableTeamMembers(data.availableMembers?.team || []);
      setIsFileRestricted(data.file?.is_restricted || false);
      
      // Initialize selected permissions from existing
      setSelectedPermissions(
        (data.permissions || []).map((p: any) => ({
          referenceId: p.referenceId,
          permission: p.permissionLevel as "view" | "edit",
          type: p.type as "team" | "guest",
        }))
      );
    } catch (err: any) {
      console.error("Failed to fetch file permissions:", err);
      toast.error(err.message || "Failed to load permissions");
    } finally {
      setPermissionsLoading(false);
    }
  };

  const saveFilePermissions = async () => {
    if (!permissionsFile) return;
    
    setSavingPermissions(true);
    try {
      const { error: fnError } = await supabase.functions.invoke(
        "guest-manage-file-permissions",
        { 
          body: { 
            action: "set",
            token: token || password, 
            email: email.toLowerCase(),
            fileId: permissionsFile.id,
            isRestricted: isFileRestricted,
            permissions: selectedPermissions.map(p => ({
              referenceId: p.referenceId,
              permissionLevel: p.permission,
              type: p.type,
            })),
          } 
        }
      );
      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      
      toast.success(isFileRestricted 
        ? `Access restricted to ${selectedPermissions.length} member${selectedPermissions.length !== 1 ? "s" : ""}`
        : "All members can now access this file"
      );
      setPermissionsFile(null);
      // Refresh content
      await fetchContent(currentFolderId);
    } catch (err: any) {
      console.error("Failed to save permissions:", err);
      toast.error(err.message || "Failed to save permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const toggleMemberPermission = (referenceId: string, type: "team" | "guest") => {
    setSelectedPermissions((prev) => {
      const existing = prev.find((u) => u.referenceId === referenceId);
      if (existing) {
        return prev.filter((u) => u.referenceId !== referenceId);
      }
      return [...prev, { referenceId, permission: "view" as const, type }];
    });
  };

  const updateMemberPermission = (referenceId: string, permission: "view" | "edit") => {
    setSelectedPermissions((prev) =>
      prev.map((u) => (u.referenceId === referenceId ? { ...u, permission } : u))
    );
  };

  // Folder creation handler
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !dataRoom) return;

    setCreatingFolder(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "guest-create-folder",
        {
          body: {
            token: token || password,
            email: email.toLowerCase(),
            folderName: newFolderName.trim(),
            parentFolderId: currentFolderId,
          },
        }
      );

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      toast.success(`Folder "${newFolderName.trim()}" created`);
      setNewFolderName("");
      setShowNewFolderDialog(false);
      await fetchContent(currentFolderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  // Delete file handler
  const handleDeleteFile = async (file: FileItem) => {
    if (!file.is_own_upload) {
      toast.error("You can only delete files you uploaded");
      return;
    }

    setDeletingFileId(file.id);
    try {
      const { error: fnError } = await supabase.functions.invoke("guest-delete-file", {
        body: {
          token: token || password,
          email: email.toLowerCase(),
          fileId: file.id,
        },
      });

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      toast.success("File moved to recycling bin");
      await fetchContent(currentFolderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  };

  // Delete folder handler (simplified - guests can only delete empty folders they created)
  const handleDeleteFolder = async (folderId: string) => {
    setDeletingFolderId(folderId);
    try {
      const { error: fnError } = await supabase.functions.invoke("guest-delete-folder", {
        body: {
          token: token || password,
          email: email.toLowerCase(),
          folderId,
        },
      });

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      toast.success("Folder moved to recycling bin");
      await fetchContent(currentFolderId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete folder");
    } finally {
      setDeletingFolderId(null);
    }
  };

  // Version history handlers
  const fetchFileVersions = async (file: { id: string; name: string }) => {
    setVersionHistoryFile(file);
    setLoadingVersions(true);
    setFileVersions([]);
    setVersionProfileMap({});

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "guest-get-file-versions",
        {
          body: { token: token || password, email: email.toLowerCase(), fileId: file.id },
        }
      );

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      setFileVersions(data.versions || []);
      setVersionProfileMap(data.profileMap || {});
    } catch (err) {
      console.error("Failed to fetch versions:", err);
      toast.error(err instanceof Error ? err.message : "Failed to load version history");
      setVersionHistoryFile(null);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleViewVersion = async (version: FileVersion) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-file-download",
        {
          body: { token: token || password, email: email.toLowerCase(), fileId: version.id, mode: "preview" },
        }
      );

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      const mimeType = version.mime_type || "";
      let fileType: "image" | "pdf" | "video" | "document" | "other" = "other";
      
      if (mimeType.startsWith("image/")) {
        fileType = "image";
      } else if (mimeType === "application/pdf") {
        fileType = "pdf";
      } else if (mimeType.startsWith("video/")) {
        fileType = "video";
      } else if (
        mimeType.includes("word") ||
        mimeType.includes("document") ||
        mimeType.includes("spreadsheet") ||
        mimeType.includes("excel") ||
        mimeType.includes("presentation") ||
        mimeType.includes("powerpoint")
      ) {
        fileType = "document";
      }

      setPreviewFile({
        id: version.id,
        name: version.name,
        url: data.downloadUrl,
        type: fileType,
        mimeType: version.mime_type || undefined,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to preview version");
    }
  };

  const handleDownloadVersion = async (version: FileVersion) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-guest-file-download",
        {
          body: { token: token || password, email: email.toLowerCase(), fileId: version.id },
        }
      );

      if (fnError) throw new Error(await extractFunctionErrorMessage(fnError));
      if (data?.error) throw new Error(data.error);

      window.open(data.downloadUrl, "_blank");
      toast.success(`Downloading ${version.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download version");
    }
  };

  useEffect(() => {
    if (step === "browse" && dataRoom) {
      fetchMessages();
      fetchActivity();
      fetchTeam();
      
      // Initialize last read timestamp from localStorage
      const storageKey = `guest-dataroom-chat-read-${dataRoom.id}-${email.toLowerCase()}`;
      const storedTimestamp = localStorage.getItem(storageKey);
      if (storedTimestamp) {
        setLastReadTimestamp(storedTimestamp);
      }
    }
  }, [step, dataRoom]);

  // Mark messages as read when Discussion tab is active
  useEffect(() => {
    if (activeTab === "discussion" && dataRoom && email) {
      const storageKey = `guest-dataroom-chat-read-${dataRoom.id}-${email.toLowerCase()}`;
      const now = new Date().toISOString();
      localStorage.setItem(storageKey, now);
      setLastReadTimestamp(now);
    }
  }, [activeTab, dataRoom?.id, email]);

  // Calculate unread message count for guests
  const unreadMessageCount = messages.filter((msg) => {
    // Don't count own messages as unread
    if (msg.sender_email.toLowerCase() === email.toLowerCase()) return false;
    // Count messages newer than last read
    if (!lastReadTimestamp) return true;
    return new Date(msg.created_at) > new Date(lastReadTimestamp);
  }).length;

  // Realtime subscription for files and folders
  useEffect(() => {
    if (!dataRoom?.id) return;

    const channel = supabase
      .channel(`guest-data-room-${dataRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_room_files',
          filter: `data_room_id=eq.${dataRoom.id}`,
        },
        () => {
          // Refresh content when files change
          fetchContent(currentFolderId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_room_folders',
          filter: `data_room_id=eq.${dataRoom.id}`,
        },
        () => {
          // Refresh content when folders change
          fetchContent(currentFolderId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataRoom?.id, currentFolderId, password, email, token]);

  // Realtime subscription for chat messages
  useEffect(() => {
    if (!dataRoom?.id) return;

    const channel = supabase
      .channel(`guest-chat-${dataRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'data_room_messages',
          filter: `data_room_id=eq.${dataRoom.id}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataRoom?.id]);

  // Auto scroll chat to bottom
  useEffect(() => {
    const timer = setTimeout(() => {
      if (chatScrollRef.current) {
        const scrollableElement = chatScrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollableElement) {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="w-4 h-4 text-muted-foreground" />;
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    if (mimeType.includes("pdf")) return <FileText className="w-4 h-4 text-red-500" />;
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className="w-4 h-4 text-green-500" />;
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return <Presentation className="w-4 h-4 text-orange-500" />;
    if (mimeType.includes("word") || mimeType.includes("document")) return <FileText className="w-4 h-4 text-blue-600" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "file_upload": return <FileUp className="w-4 h-4 text-emerald-500" />;
      case "invite_sent":
      case "member_added": return <UserPlus className="w-4 h-4 text-blue-500" />;
      case "comment_added":
      case "message_sent": return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case "file_viewed": return <Eye className="w-4 h-4 text-amber-500" />;
      case "file_edited":
      case "version_created": return <FileSignature className="w-4 h-4 text-blue-500" />;
      case "file_moved": return <FolderPlus className="w-4 h-4 text-amber-500" />;
      case "nda_signed": return <FileSignature className="w-4 h-4 text-emerald-500" />;
      case "file_deleted":
      case "invite_revoked": return <Trash2 className="w-4 h-4 text-destructive" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string, details: Record<string, unknown> | null) => {
    switch (action) {
      case "file_upload": return `uploaded ${(details?.file_name as string) || "a file"}`;
      case "invite_sent": return `invited ${(details?.email as string) || "a user"}`;
      case "member_added": return `added ${(details?.member_name as string) || "a team member"}`;
      case "comment_added": return `commented on ${(details?.file_name as string) || "a file"}`;
      case "message_sent": return "sent a message";
      case "file_viewed": return `viewed ${(details?.file_name as string) || "a file"}`;
      case "file_edited": return `edited ${(details?.file_name as string) || "a file"}`;
      case "version_created": return `saved version of ${(details?.file_name as string) || "a file"}`;
      case "file_moved": {
        const folderName = (details?.folder_name as string) || "root";
        return `moved ${(details?.file_name as string) || "a file"} to ${folderName}`;
      }
      case "nda_signed": return "signed the NDA";
      case "file_deleted": return `deleted ${(details?.file_name as string) || "a file"}`;
      case "invite_revoked": return `revoked invite for ${(details?.email as string) || "a user"}`;
      case "room_created": return "created this data room";
      case "settings_updated": return "updated room settings";
      default: return action.replace(/_/g, " ");
    }
  };

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8">
          <div className="text-center mb-8">
            <img src={bosplanLogo} alt="Bosplan" className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Data Room Access</h1>
            <p className="text-muted-foreground mt-1">Enter your credentials to view documents</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="text"
                placeholder="e.g. A1B2C3D4"
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase())}
                className="mt-1 font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can find your password in the confirmation email
              </p>
            </div>
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Access Data Room
                </>
              )}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "resign") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8">
          <div className="text-center mb-6">
            <img src={bosplanLogo} alt="Bosplan" className="h-10 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">NDA Has Been Updated</h1>
            <p className="text-muted-foreground mt-1">
              Please review and re-sign to continue access
            </p>
          </div>

          {ndaUpdateMessage && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-start gap-3">
              <RefreshCw className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{ndaUpdateMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
              {error}
            </div>
          )}

          {dataRoom && (
            <div className="bg-muted p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-1">{dataRoom.name}</h3>
              <p className="text-sm text-muted-foreground">{dataRoom.organizationName}</p>
            </div>
          )}

          <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto mb-4">
            {ndaContent ? (
              <Textarea
                value={ndaContent}
                readOnly
                className="min-h-[150px] resize-none border-0 p-0 bg-transparent"
              />
            ) : (
              <div className="text-sm text-muted-foreground">Loading latest NDA…</div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <Label>Your Full Name</Label>
              <Input
                type="text"
                placeholder="Enter your full legal name"
                value={resignName}
                onChange={(e) => setResignName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-nda-resign"
                checked={resignAgreed}
                onCheckedChange={(checked) => setResignAgreed(checked as boolean)}
              />
              <Label htmlFor="agree-nda-resign" className="text-sm leading-relaxed">
                I have read and agree to the updated Non-Disclosure Agreement terms
              </Label>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={handleResignNda}
              disabled={signingNda || !ndaContent || !resignName.trim() || !resignAgreed}
            >
              {signingNda ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <FileSignature className="w-4 h-4 mr-2" />
                  Re-Sign NDA & Continue
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setStep("verify");
                setError(null);
                setNdaUpdateMessage(null);
              }}
            >
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const totalTeamMembers = members.length + guests.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={bosplanLogo} alt="Bosplan" className="h-8 w-auto" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">{dataRoom?.name}</h1>
                <p className="text-sm text-muted-foreground">{dataRoom?.organizationName}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              <span className="text-muted-foreground mr-1">Viewing as:</span>
              <span className="font-medium text-foreground">{guestName}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1 space-y-4">
            {/* Room Info */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Lock className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{dataRoom?.name}</h3>
                  {dataRoom?.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{dataRoom.description}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />
                NDA Signed
              </Badge>
            </div>

            {/* Guest Info */}
            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Guest Access</span>
              </div>
              <p className="text-xs text-muted-foreground">
                You have full access to upload files, participate in discussions, and view activity.
              </p>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3 space-y-4">
            {/* Files Section */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <h2 className="font-semibold">Files</h2>
                  {currentFolderId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchContent(null)}
                      className="h-6 px-2 text-xs text-muted-foreground"
                    >
                      <ArrowLeft className="w-3 h-3 mr-1" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Upload
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>

              {/* Breadcrumbs */}
              <div className="px-4 py-2 border-b bg-muted/10">
                <div className="flex items-center gap-2 text-sm">
                  {currentFolderId ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Navigate to parent folder or root
                          if (breadcrumbs.length > 1) {
                            handleBreadcrumbClick(breadcrumbs[breadcrumbs.length - 2].id);
                          } else {
                            fetchContent(null);
                          }
                        }}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="w-3 h-3 mr-1" />
                        Back
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : "Files"}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Home className="w-4 h-4" />
                      Files
                    </span>
                  )}
                </div>
              </div>

              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn("min-h-[300px] transition-all", isDragging && "bg-emerald-500/5")}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : folders.length === 0 && files.length === 0 ? (
                  <div className={cn(
                    "flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed m-4 rounded-xl transition-colors",
                    isDragging ? "border-emerald-500 bg-emerald-500/5" : "border-border/30"
                  )}>
                    <CloudUpload className="w-12 h-12 mb-3 opacity-30" />
                    <p className="font-medium">Drop files here or click upload</p>
                    <p className="text-xs mt-1 text-muted-foreground/70">Supported: PDF, DOCX, Images</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {/* Folders */}
                    {folders.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {folders.map(folder => (
                          <div
                            key={folder.id}
                            className="p-3 rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-all"
                            onClick={() => handleFolderClick(folder.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Folder className="w-4 h-4 text-amber-500" />
                              <span className="text-sm font-medium truncate">{folder.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Files - Card based layout matching team view */}
                    {files.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {files.map(file => {
                          const folder = allFolders.find(f => f.id === file.folder_id);
                          const uploaderName = file.uploaded_by ? (profileMap[file.uploaded_by] || "Unknown") : "Unknown";
                          // Check for internal member assignment first, then external guest
                          const assigneeName = file.assigned_to 
                            ? (profileMap[file.assigned_to] || undefined) 
                            : ((file as any).assigned_guest_id ? profileMap[(file as any).assigned_guest_id] : undefined);

                          return (
                            <GuestDataRoomFileCard
                              key={file.id}
                              file={{
                                ...file,
                                status: file.status || "not_opened",
                              }}
                              folder={folder ? { id: folder.id, name: folder.name } : null}
                              uploaderName={uploaderName}
                              assigneeName={assigneeName}
                              version={file.version || 1}
                              isDownloading={downloading === file.id}
                              isDeleting={deletingFileId === file.id}
                              onView={() => handleFilePreview(file)}
                              onDownload={(format) => handleDownload(file, format)}
                              onViewVersions={() => fetchFileVersions({ id: file.id, name: file.name })}
                              onEditDocument={file.permission_level === "edit" ? () => setEditFile(file) : undefined}
                              onDelete={file.is_own_upload ? () => handleDeleteFile(file) : undefined}
                              onManagePermissions={file.is_own_upload ? () => openFilePermissions(file) : undefined}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Tabbed Content */}
            <Card className="overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-4 pt-3 border-b bg-muted/20">
                  <TabsList className="h-9 p-1 bg-transparent gap-1">
                    <TabsTrigger value="team" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-3">
                      <Users className="w-3.5 h-3.5 mr-1.5" />
                      Active Team
                    </TabsTrigger>
                    <TabsTrigger value="discussion" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 relative">
                      <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                      Discussion
                      {unreadMessageCount > 0 && activeTab !== "discussion" && (
                        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-destructive text-destructive-foreground">
                          {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-3">
                      <Activity className="w-3.5 h-3.5 mr-1.5" />
                      Activity
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Team Tab */}
                <TabsContent value="team" className="m-0 p-4">
                  {loadingTeam ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : totalTeamMembers === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No active team members yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium">
                          {totalTeamMembers} Active {totalTeamMembers === 1 ? "Member" : "Members"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Internal Members */}
                        {members.map(member => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className={cn(
                                "text-sm font-medium",
                                member.is_owner 
                                  ? "bg-brand-orange/10 text-brand-orange" 
                                  : "bg-emerald-500/10 text-emerald-600"
                              )}>
                                {member.user?.full_name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{member.user?.full_name}</p>
                                <Badge variant="secondary" className={cn(
                                  "text-[10px] px-1.5 py-0 h-4 shrink-0",
                                  member.is_owner 
                                    ? "bg-brand-orange/10 text-brand-orange border-brand-orange/20" 
                                    : "bg-emerald-500/10 text-emerald-600"
                                )}>
                                  {member.is_owner ? "☆ Owner" : "Team"}
                                </Badge>
                              </div>
                              {member.email && (
                                <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                              )}
                              {member.user?.job_role && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.user.job_role}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Guests */}
                        {guests.map(guest => (
                          <div
                            key={guest.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                          >
                            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {guest.guest_name || guest.email.split("@")[0]}
                                </p>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 shrink-0">
                                  <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                  NDA Signed
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
                              {guest.nda_signed_at && (
                                <p className="text-[10px] text-muted-foreground">
                                  Signed {format(new Date(guest.nda_signed_at), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Discussion Tab */}
                <TabsContent value="discussion" className="m-0">
                  <div className="flex flex-col h-[350px]">
                    <div className="p-3 border-b bg-muted/30">
                      <p className="text-xs text-muted-foreground">All room members can see these messages</p>
                    </div>

                    <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                          No messages yet. Start the conversation!
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map(msg => {
                            const isOwn = msg.sender_email === email.toLowerCase();
                            return (
                              <div key={msg.id} className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}>
                                {!isOwn && (
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="text-xs bg-muted">
                                      {msg.sender_name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                                  <div className={`mb-1 px-1 ${isOwn ? "text-right" : ""}`}>
                                    <p className="text-xs font-medium">
                                      {msg.sender_name}
                                      {msg.is_guest && " (Guest)"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {msg.sender_email}
                                    </p>
                                  </div>
                                  <div className={`rounded-lg px-3 py-2 ${
                                    isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                                  }`}>
                                    <p className="text-sm">{msg.message}</p>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-1 px-1">
                                    {format(new Date(msg.created_at), "HH:mm")}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>

                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          disabled={sendingMessage}
                        />
                        <Button size="icon" onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                          {sendingMessage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="m-0 p-4 max-h-[350px] overflow-y-auto">
                  {loadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No activity recorded yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activities.map(activity => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="mt-0.5">{getActionIcon(activity.action)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{activity.user_name}</span>
                              {activity.is_guest && (
                                <Badge variant="secondary" className="ml-1 text-[10px] py-0">
                                  Guest
                                </Badge>
                              )}
                              <span className="text-muted-foreground">
                                {" "}{getActionLabel(activity.action, activity.details)}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), "MMM d, yyyy 'at' HH:mm")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </main>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-card py-3">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-muted-foreground">
          Powered by Bosplan.com • Secure Data Room
        </div>
      </div>

      {/* File Preview Dialog */}
      <GuestFilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        token={token || password}
        email={email}
        guestName={guestName}
        onEditDocument={previewFile?.permissionLevel === "edit" ? () => {
          // Find the file object and open editor
          const fileToEdit = files.find(f => f.id === previewFile?.id);
          if (fileToEdit) {
            setEditFile(fileToEdit);
          }
        } : undefined}
      />

      {/* Document Editor Dialog */}
      <GuestDataRoomDocumentEditorDialog
        open={!!editFile}
        onOpenChange={(open) => !open && setEditFile(null)}
        file={editFile ? { id: editFile.id, name: editFile.name, file_path: editFile.file_path, mime_type: editFile.mime_type } : null}
        token={token || password}
        email={email}
        guestName={guestName}
        dataRoomId={dataRoom?.id || ""}
        organizationId={dataRoom?.organizationId || ""}
        onVersionSaved={() => fetchContent(currentFolderId)}
      />

      {/* File Permissions Dialog */}
      <Dialog open={!!permissionsFile} onOpenChange={(open) => !open && setPermissionsFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              File Permissions
            </DialogTitle>
          </DialogHeader>
          
          {permissionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* File name */}
              <div className="text-sm text-muted-foreground truncate">
                {permissionsFile?.name}
              </div>

              {/* Restriction toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <Label htmlFor="guest-restrict-access" className="cursor-pointer font-medium">
                    Restrict Access
                  </Label>
                </div>
                <Checkbox
                  id="guest-restrict-access"
                  checked={isFileRestricted}
                  onCheckedChange={(checked) => setIsFileRestricted(checked as boolean)}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {isFileRestricted
                  ? "Only you and selected members can access this file."
                  : "All data room members can view and edit this file."}
              </p>

              {/* Member selection - only show when restricted */}
              {isFileRestricted && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Grant Access To</Label>
                  </div>

                  {(availableTeamMembers.length === 0 && availableGuests.length === 0) ? (
                    <p className="text-xs text-muted-foreground py-2">
                      No other members in this data room.
                    </p>
                  ) : (
                    <ScrollArea className="h-[200px] pr-3">
                      <div className="space-y-2">
                        {/* Team Members */}
                        {availableTeamMembers.map((member) => {
                          const userPermission = selectedPermissions.find((u) => u.referenceId === member.id);
                          const isSelected = !!userPermission;

                          return (
                            <div
                              key={`team-${member.id}`}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleMemberPermission(member.id, "team")}
                                />
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-sm truncate">{member.name}</span>
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-0 flex-shrink-0">
                                    Team
                                  </Badge>
                                </div>
                              </label>

                              {isSelected && (
                                <Select
                                  value={userPermission?.permission || "view"}
                                  onValueChange={(value: "view" | "edit") =>
                                    updateMemberPermission(member.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-24 h-7 text-xs flex-shrink-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="view">
                                      <div className="flex items-center gap-1.5">
                                        <Eye className="w-3 h-3" />
                                        View
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="edit">
                                      <div className="flex items-center gap-1.5">
                                        <Edit className="w-3 h-3" />
                                        Edit
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          );
                        })}

                        {/* Guests */}
                        {availableGuests.map((guest) => {
                          const userPermission = selectedPermissions.find((u) => u.referenceId === guest.id);
                          const isSelected = !!userPermission;

                          return (
                            <div
                              key={`guest-${guest.id}`}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleMemberPermission(guest.id, "guest")}
                                />
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Mail className="w-3 h-3 text-primary flex-shrink-0" />
                                  <span className="text-sm truncate">{guest.name}</span>
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-0 flex-shrink-0">
                                    Guest
                                  </Badge>
                                </div>
                              </label>

                              {isSelected && (
                                <Select
                                  value={userPermission?.permission || "view"}
                                  onValueChange={(value: "view" | "edit") =>
                                    updateMemberPermission(guest.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-24 h-7 text-xs flex-shrink-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="view">
                                      <div className="flex items-center gap-1.5">
                                        <Eye className="w-3 h-3" />
                                        View
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="edit">
                                      <div className="flex items-center gap-1.5">
                                        <Edit className="w-3 h-3" />
                                        Edit
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Selected users badges */}
                  {selectedPermissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2">
                      {selectedPermissions.map((u) => {
                        const member = u.type === "team"
                          ? availableTeamMembers.find((m) => m.id === u.referenceId)
                          : availableGuests.find((g) => g.id === u.referenceId);
                        return (
                          <Badge key={u.referenceId} variant="secondary" className="text-xs gap-1">
                            {member?.name || "Unknown"}
                            <span className="text-muted-foreground">
                              ({u.permission === "edit" ? "Edit" : "View"})
                            </span>
                            <Trash2
                              className="w-3 h-3 cursor-pointer hover:text-destructive"
                              onClick={() => toggleMemberPermission(u.referenceId, u.type)}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPermissionsFile(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveFilePermissions}
              disabled={savingPermissions}
              className="bg-primary hover:bg-primary/90"
            >
              {savingPermissions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Permissions"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Version History Dialog */}
      <DataRoomVersionHistoryDialog
        open={!!versionHistoryFile}
        onOpenChange={(open) => !open && setVersionHistoryFile(null)}
        fileName={versionHistoryFile?.name || ""}
        originalFileName={versionHistoryFile?.name || ""}
        versions={fileVersions}
        isLoading={loadingVersions}
        profileMap={versionProfileMap}
        onView={handleViewVersion}
        onDownload={(version) => handleDownloadVersion(version)}
        onRestore={() => {
          toast.info("Restore functionality is not available for guests");
        }}
        onDelete={() => {
          toast.info("Delete functionality is not available for guests");
        }}
      />
    </div>
  );
};

export default GuestDataRoom;
