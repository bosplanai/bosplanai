import { useSearchParams } from "react-router-dom";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import SideNavigation from "@/components/SideNavigation";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { Upload, FileText, Eye, Settings, Trash2, Loader2, UserPlus, X, CloudUpload, Image, FileIcon, Plus, Folder, ChevronRight, Edit2, Shield, CheckCircle, Download, FileSignature, FolderPlus, ArrowLeft, FolderLock, Activity, MessageSquare, Users, Mail, Clock, AlertTriangle, Archive, Video, File, Lock, HardDrive, ShoppingCart, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState, useRef, useCallback, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";
import { cn } from "@/lib/utils";
import SharedDataRooms from "@/components/dataroom/SharedDataRooms";
import DataRoomActivity from "@/components/dataroom/DataRoomActivity";
import DataRoomChat from "@/components/dataroom/DataRoomChat";
import DataRoomMembers from "@/components/dataroom/DataRoomMembers";
import ActiveTeamPanel from "@/components/dataroom/ActiveTeamPanel";
import DataRoomFilePreviewDialog from "@/components/dataroom/DataRoomFilePreviewDialog";
import { DataRoomDocumentEditorDialog } from "@/components/dataroom/DataRoomDocumentEditorDialog";
import NdaUpdateModal from "@/components/dataroom/NdaUpdateModal";
import { FilePermissionsDialog } from "@/components/dataroom/FilePermissionsDialog";
import { FolderPermissionsDialog } from "@/components/dataroom/FolderPermissionsDialog";
import { AddToFolderDropdown } from "@/components/dataroom/AddToFolderDropdown";
import { useNdaResignCheck } from "@/hooks/useNdaResignCheck";
import { DataRoomRecyclingBin } from "@/components/dataroom/DataRoomRecyclingBin";
import { DataRoomBins } from "@/components/dataroom/DataRoomBins";
import { useDataroomStorage, DATAROOM_STORAGE_QUERY_KEY } from "@/hooks/useDataroomStorage";
const emailSchema = z.string().trim().email("Please enter a valid email address");
interface PreviewFile {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "video" | "document" | "other";
  mimeType?: string;
  file_path?: string;
}
interface DataRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  nda_content: string | null;
  nda_required: boolean;
  status?: string;
  creator?: {
    full_name: string;
  };
}
interface DataRoomFolder {
  id: string;
  name: string;
  data_room_id: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  is_restricted?: boolean;
}
const Dataroom = () => {
  const { navigate } = useOrgNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    total: 0,
    completed: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<DataRoom | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomDescription, setNewRoomDescription] = useState("");
  const [newRoomNdaContent, setNewRoomNdaContent] = useState(
    `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of the date of electronic signature.

1. CONFIDENTIAL INFORMATION
The Receiving Party agrees to hold in confidence all confidential information disclosed through this Data Room, including but not limited to: business plans, financial data, technical specifications, customer information, and any other proprietary materials.

2. PERMITTED USE
Confidential information may only be used for the purpose of evaluating a potential business relationship and may not be disclosed to any third party without prior written consent.

3. DURATION
This Agreement shall remain in effect for a period of two (2) years from the date of signature.

4. RETURN OF MATERIALS
Upon request, the Receiving Party shall return or destroy all confidential materials and certify such destruction in writing.

By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.`
  );
  const [ndaSettingsOpen, setNdaSettingsOpen] = useState(false);
  const [ndaContent, setNdaContent] = useState("");
  const [ndaRequired, setNdaRequired] = useState(false);
  const [signaturesOpen, setSignaturesOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsFile, setPermissionsFile] = useState<{ id: string; name: string; is_restricted: boolean; uploaded_by: string } | null>(null);
  const [folderPermissionsDialogOpen, setFolderPermissionsDialogOpen] = useState(false);
  const [permissionsFolder, setPermissionsFolder] = useState<{ id: string; name: string; is_restricted: boolean; created_by: string } | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [storagePurchaseDialogOpen, setStoragePurchaseDialogOpen] = useState(false);
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("team");
  const [lastReadTimestamp, setLastReadTimestamp] = useState<Record<string, string>>({});
  const [editFile, setEditFile] = useState<{ id: string; name: string; file_path?: string; mime_type?: string | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const {
    organization,
    profile
  } = useOrganization();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();

  // Use shared storage hook for real-time updates after purchases
  const { data: storageUsage = { used: 0, total: 100 * 1024 * 1024, additionalGb: 0, additionalMb: 0 }, invalidate: invalidateStorage } = useDataroomStorage(organization?.id);

  const storagePercentage = (storageUsage.used / storageUsage.total) * 100;

  // Track unread messages for the active data room
  const { data: unreadMessageCount = 0 } = useQuery({
    queryKey: ["unread-messages", selectedRoomId, user?.id, lastReadTimestamp[selectedRoomId || ""]],
    queryFn: async () => {
      if (!selectedRoomId || !user?.id) return 0;
      
      // Get last read timestamp from localStorage or use epoch
      const storageKey = `dataroom-chat-read-${selectedRoomId}-${user.id}`;
      const lastRead = localStorage.getItem(storageKey) || "1970-01-01T00:00:00Z";
      
      // Count messages newer than last read that are NOT from current user
      const { count, error } = await supabase
        .from("data_room_messages")
        .select("*", { count: "exact", head: true })
        .eq("data_room_id", selectedRoomId)
        .neq("sender_id", user.id)
        .gt("created_at", lastRead);
      
      if (error) {
        console.error("Failed to count unread messages:", error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!selectedRoomId && !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mark messages as read when Discussion tab is active
  useEffect(() => {
    if (activeTab === "discussion" && selectedRoomId && user?.id) {
      const storageKey = `dataroom-chat-read-${selectedRoomId}-${user.id}`;
      const now = new Date().toISOString();
      localStorage.setItem(storageKey, now);
      setLastReadTimestamp(prev => ({ ...prev, [selectedRoomId]: now }));
    }
  }, [activeTab, selectedRoomId, user?.id]);

  // Subscribe to realtime messages for unread count updates
  useEffect(() => {
    if (!selectedRoomId) return;

    const channel = supabase
      .channel(`unread-messages-${selectedRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "data_room_messages",
          filter: `data_room_id=eq.${selectedRoomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-messages", selectedRoomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedRoomId, queryClient]);

  // Handle buy more storage
  const handleBuyMoreStorage = () => {
    setStoragePurchaseDialogOpen(true);
  };

  // Handle storage tier purchase
  const handlePurchaseTier = async (tier: string) => {
    if (!organization?.id) {
      toast({ title: "Error", description: "Organization not loaded. Please try again.", variant: "destructive" });
      return;
    }
    try {
      setPurchasingTier(tier);
      toast({ title: "Preparing checkout...", description: "Please wait" });
      const { data, error } = await supabase.functions.invoke("create-dataroom-storage-checkout", {
        body: { tier, organizationId: organization.id, returnOrigin: window.location.origin }
      });
      
      if (error) throw error;
      if (data?.url) {
        setStoragePurchaseDialogOpen(false);
        // Open in the same tab - Stripe will redirect to /payment-success which handles verification
        window.location.assign(data.url);
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      toast({
        title: "Failed to start checkout",
        description: "Please try again.",
        variant: "destructive"
      });
      console.error("Storage checkout error:", error);
    } finally {
      setPurchasingTier(null);
    }
  };

  // Handle canceled storage purchase (success is handled by /payment-success trampoline)
  useEffect(() => {
    const purchaseStatus = searchParams.get("storage_purchase");
    if (purchaseStatus === "canceled") {
      toast({ title: "Purchase Canceled", description: "Storage purchase was canceled" });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast]);

  // Fetch data rooms (rooms created by the current user, excluding deleted ones)
  const {
    data: dataRooms = [],
    isLoading: roomsLoading
  } = useQuery({
    queryKey: ["data-rooms", organization?.id, user?.id],
    queryFn: async () => {
      if (!organization?.id || !user?.id) return [];
      const {
        data,
        error
      } = await supabase.from("data_rooms").select(`
          *,
          creator:created_by(full_name)
        `)
        .eq("organization_id", organization.id)
        .eq("created_by", user.id)
        .is("deleted_at", null)
        .neq("status", "archived")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DataRoom[];
    },
    enabled: !!organization?.id && !!user?.id
  });

  // Fetch shared room data if selected room is not in user's owned rooms
  const { data: sharedRoomData } = useQuery({
    queryKey: ["shared-room-data", selectedRoomId],
    queryFn: async () => {
      if (!selectedRoomId) return null;
      // First check if it's in user's owned rooms
      const isOwnedRoom = dataRooms.some(r => r.id === selectedRoomId);
      if (isOwnedRoom) return null;
      
      // Fetch the shared room data
      const { data, error } = await supabase
        .from("data_rooms")
        .select(`
          *,
          creator:created_by(full_name)
        `)
        .eq("id", selectedRoomId)
        .maybeSingle();
      
      if (error) throw error;
      return data as DataRoom | null;
    },
    enabled: !!selectedRoomId && !dataRooms.some(r => r.id === selectedRoomId),
  });

  // No auto-select - user must click to enter a room
  // Check owned rooms first, then fall back to shared room data
  const selectedRoom = dataRooms.find(r => r.id === selectedRoomId) || sharedRoomData || null;
  const activeRoomId = selectedRoomId;

  // Realtime subscription for files and folders - sync across all users
  useEffect(() => {
    if (!activeRoomId) return;

    const channel = supabase
      .channel(`data-room-${activeRoomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_room_files',
          filter: `data_room_id=eq.${activeRoomId}`,
        },
        () => {
          // Invalidate files query to refresh data
          queryClient.invalidateQueries({ queryKey: ["data-room-files"] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_room_folders',
          filter: `data_room_id=eq.${activeRoomId}`,
        },
        () => {
          // Invalidate folders query to refresh data
          queryClient.invalidateQueries({ queryKey: ["data-room-all-folders", activeRoomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, queryClient]);

  // Check if user needs to re-sign NDA due to updates
  const { data: ndaResignCheck } = useNdaResignCheck(activeRoomId, organization?.id || null);

  // Reset folder when room changes
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    setCurrentFolderId(null);
  };

  // Drag and drop handlers
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

  // Fetch ALL folders for current data room (needed for hierarchical permission logic)
  const {
    data: allFolders = [],
    isLoading: foldersLoading
  } = useQuery({
    queryKey: ["data-room-all-folders", activeRoomId],
    queryFn: async () => {
      if (!activeRoomId) return [];
      const { data, error } = await supabase
        .from("data_room_folders")
        .select("*")
        .eq("data_room_id", activeRoomId)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as DataRoomFolder[];
    },
    enabled: !!activeRoomId
  });

  // Check if current user is an internal team member of this data room
  const { data: isDataRoomMember = false } = useQuery({
    queryKey: ["is-data-room-member", activeRoomId, user?.id],
    queryFn: async () => {
      if (!activeRoomId || !user?.id) return false;
      const { data, error } = await supabase
        .from("data_room_members")
        .select("id")
        .eq("data_room_id", activeRoomId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) return false;
      return !!data;
    },
    enabled: !!activeRoomId && !!user?.id
  });

  // Fetch folder permissions for the current user
  const {
    data: folderPermissions = []
  } = useQuery({
    queryKey: ["data-room-folder-permissions", activeRoomId, user?.id],
    queryFn: async () => {
      if (!activeRoomId || !user?.id) return [];
      const { data, error } = await supabase
        .from("data_room_folder_permissions")
        .select("folder_id, user_id, permission_level")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeRoomId && !!user?.id
  });

  // Fetch file permissions for the current user
  const {
    data: filePermissions = []
  } = useQuery({
    queryKey: ["data-room-file-permissions", activeRoomId, user?.id],
    queryFn: async () => {
      if (!activeRoomId || !user?.id) return [];
      const { data, error } = await supabase
        .from("data_room_file_permissions")
        .select("file_id, user_id, permission_level")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeRoomId && !!user?.id
  });

  // Helper function to check if user can access a folder (browse into it - view permission)
  const canAccessFolder = (folder: DataRoomFolder): boolean => {
    // If folder is not restricted, anyone can access
    if (!folder.is_restricted) return true;
    // If user is the room owner/creator, they can access all folders
    if (selectedRoom?.created_by === user?.id) return true;
    // Check if user has explicit permission from the data room creator
    return folderPermissions.some(p => p.folder_id === folder.id);
  };

  // Helper function to check if user can edit a folder (upload/remove files, move files to it)
  const canEditFolder = (folderId: string | null): boolean => {
    // Room owner/creator can always edit
    if (selectedRoom?.created_by === user?.id) return true;
    
    // At root level (no folder), allow internal team members to upload/create folders
    if (!folderId) {
      return isDataRoomMember;
    }
    
    // Find the folder
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) return false;
    
    // If folder is not restricted, all users with data room access can edit
    if (!folder.is_restricted) return isDataRoomMember;
    
    // If folder is restricted, check for explicit permission
    const permission = folderPermissions.find(p => p.folder_id === folderId);
    return !!permission; // Any permission (view or edit) allows access to restricted folder
  };

  // Helper function to check if user can view a file
  const canViewFile = (file: any): boolean => {
    // If file is not restricted, anyone in the data room can view
    if (!file.is_restricted) return true;
    // If user is the room owner/creator, they can view all files
    if (selectedRoom?.created_by === user?.id) return true;
    // If user uploaded the file, they can always view it
    if (file.uploaded_by === user?.id) return true;
    // Check if user has explicit permission for this file
    return filePermissions.some(p => p.file_id === file.id);
  };

  // Helper function to check if user can edit a file
  const canEditFile = (file: any): boolean => {
    // If file is not restricted, anyone in the data room can edit
    if (!file.is_restricted) return true;
    // If user is the room owner/creator, they can edit all files
    if (selectedRoom?.created_by === user?.id) return true;
    // If user uploaded the file, they can always edit it
    if (file.uploaded_by === user?.id) return true;
    // Check if user has explicit edit permission for this file
    return filePermissions.some(p => p.file_id === file.id && p.permission_level === 'edit');
  };

  // Check if current user can edit in the current folder context
  const canEditCurrentFolder = canEditFolder(currentFolderId);

  // Filter folders in current directory - only show accessible folders
  const folders = allFolders.filter(folder => {
    // Check if folder is in current directory
    if (currentFolderId) {
      if (folder.parent_id !== currentFolderId) return false;
    } else {
      if (folder.parent_id !== null) return false;
    }
    // Only show folders user can access (non-restricted OR has permission OR is owner)
    return canAccessFolder(folder);
  });

  // Handler for folder click that checks permissions
  const handleFolderClick = (folder: DataRoomFolder) => {
    if (!canAccessFolder(folder)) {
      toast({
        title: "Access restricted",
        description: "You don't have permission to access this folder.",
        variant: "destructive",
      });
      return;
    }
    setCurrentFolderId(folder.id);
  };

  // Fetch folder breadcrumb path
  const {
    data: folderPath = []
  } = useQuery({
    queryKey: ["folder-path", currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return [];
      const path: DataRoomFolder[] = [];
      let folderId: string | null = currentFolderId;
      while (folderId) {
        const {
          data,
          error
        } = await supabase.from("data_room_folders").select("*").eq("id", folderId).maybeSingle();
        if (error || !data) break;
        path.unshift(data as DataRoomFolder);
        folderId = data.parent_id;
      }
      return path;
    },
    enabled: !!currentFolderId
  });

  // Fetch files from database (filtered by room and folder)
  // Also fetch surfaced files from hidden folders at root level
  const {
    data: filesData = { currentFiles: [], surfacedFiles: [] },
    isLoading: filesLoading
  } = useQuery({
    queryKey: ["data-room-files", organization?.id, activeRoomId, currentFolderId, filePermissions, allFolders, folderPermissions, user?.id, selectedRoom?.created_by],
    queryFn: async () => {
      if (!organization?.id || !activeRoomId) return { currentFiles: [], surfacedFiles: [] };
      
      // Fetch files in current folder (excluding deleted)
      // Also include folder info for files that have been moved to folders
      let query = supabase.from("data_room_files").select(`
          *,
          uploader:uploaded_by(full_name),
          folder:folder_id(id, name, is_restricted)
        `).eq("organization_id", organization.id).eq("data_room_id", activeRoomId).is("deleted_at", null);
      if (currentFolderId) {
        query = query.eq("folder_id", currentFolderId);
      } else {
        query = query.is("folder_id", null);
      }
      const { data: currentFiles, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      let surfacedFiles: any[] = [];
      
      // At root level, surface files from hidden folders that user has explicit file permission for
      if (!currentFolderId && filePermissions.length > 0) {
        // Find hidden folders (restricted + no folder permission + not owner/creator)
        const hiddenFolderIds = allFolders
          .filter(folder => {
            if (!folder.is_restricted) return false;
            if (selectedRoom?.created_by === user?.id) return false;
            if (folder.created_by === user?.id) return false;
            if (folderPermissions.some(p => p.folder_id === folder.id)) return false;
            return true;
          })
          .map(f => f.id);

        if (hiddenFolderIds.length > 0) {
          const permittedFileIds = filePermissions.map(p => p.file_id);
          
          // Get files from hidden folders that user has explicit permission for (excluding deleted)
          const { data: filesInHiddenFolders, error: hiddenError } = await supabase
            .from("data_room_files")
            .select(`
              *,
              uploader:uploaded_by(full_name)
            `)
            .eq("data_room_id", activeRoomId)
            .is("deleted_at", null)
            .in("id", permittedFileIds)
            .in("folder_id", hiddenFolderIds)
            .order("created_at", { ascending: false });

          if (!hiddenError && filesInHiddenFolders && filesInHiddenFolders.length > 0) {
            // Add folder name for display context
            surfacedFiles = filesInHiddenFolders.map(file => {
              const folder = allFolders.find(f => f.id === file.folder_id);
              return {
                ...file,
                folder_name: folder?.name || null,
                is_surfaced: true,
              };
            });
          }
        }
      }

      return { currentFiles: currentFiles || [], surfacedFiles };
    },
    enabled: !!organization?.id && !!activeRoomId
  });

  // Combine current folder files and surfaced files, then filter to only show accessible files
  const allFilesUnfiltered = [...filesData.currentFiles, ...filesData.surfacedFiles];
  const files = allFilesUnfiltered.filter(file => canViewFile(file));

  // Fetch invites from database (filtered by room)
  const {
    data: invites = [],
    isLoading: invitesLoading
  } = useQuery({
    queryKey: ["data-room-invites", organization?.id, activeRoomId],
    queryFn: async () => {
      if (!organization?.id || !activeRoomId) return [];
      const {
        data,
        error
      } = await supabase.from("data_room_invites").select(`
          *,
          inviter:invited_by(full_name)
        `).eq("organization_id", organization.id).eq("data_room_id", activeRoomId).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id && !!activeRoomId
  });

  // Fetch NDA signatures for the room
  const {
    data: ndaSignatures = [],
    isLoading: signaturesLoading
  } = useQuery({
    queryKey: ["nda-signatures", activeRoomId],
    queryFn: async () => {
      if (!activeRoomId) return [];
      const {
        data,
        error
      } = await supabase.from("data_room_nda_signatures").select("*").eq("data_room_id", activeRoomId).order("signed_at", {
        ascending: false
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeRoomId
  });

  // Export signatures to CSV
  const exportSignaturesToCsv = () => {
    if (ndaSignatures.length === 0) return;
    const headers = ["Signer Name", "Email", "Signed At", "IP Address"];
    const rows = ndaSignatures.map((sig: any) => [sig.signer_name, sig.signer_email, format(new Date(sig.signed_at), "yyyy-MM-dd HH:mm:ss"), sig.ip_address || "N/A"]);
    const csvContent = [`NDA Signature Log - ${selectedRoom?.name}`, `Exported: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`, "", headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `nda-signatures-${selectedRoom?.name?.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const defaultNdaContent = `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of the date of electronic signature.

1. CONFIDENTIAL INFORMATION
The Receiving Party agrees to hold in confidence all confidential information disclosed through this Data Room, including but not limited to: business plans, financial data, technical specifications, customer information, and any other proprietary materials.

2. PERMITTED USE
Confidential information may only be used for the purpose of evaluating a potential business relationship and may not be disclosed to any third party without prior written consent.

3. DURATION
This Agreement shall remain in effect for a period of two (2) years from the date of signature.

4. RETURN OF MATERIALS
Upon request, the Receiving Party shall return or destroy all confidential materials and certify such destruction in writing.

By signing below, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement.`;

  const createRoomMutation = useMutation({
    mutationFn: async ({
      name,
      description,
      ndaContent
    }: {
      name: string;
      description: string;
      ndaContent: string;
    }) => {
      if (!organization?.id || !user?.id) {
        throw new Error("Not authenticated");
      }
      const {
        data,
        error
      } = await supabase.from("data_rooms").insert({
        organization_id: organization.id,
        name,
        description: description || null,
        created_by: user.id,
        nda_required: true,
        nda_content: ndaContent
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["data-rooms"]
      });
      setSelectedRoomId(data.id);
      setCreateRoomOpen(false);
      setNewRoomName("");
      setNewRoomDescription("");
      setNewRoomNdaContent(defaultNdaContent);
      toast({
        title: "Data Room created",
        description: "Your new data room is ready with NDA protection."
      });
    },
    onError: error => {
      toast({
        title: "Failed to create Data Room",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create folder mutation with optimistic update
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.id || !activeRoomId || !selectedRoom) {
        throw new Error("Not authenticated or no room selected");
      }
      // Use the data room's organization_id for cross-org support
      const roomOrgId = selectedRoom.organization_id;
      const {
        data,
        error
      } = await supabase.from("data_room_folders").insert({
        organization_id: roomOrgId,
        data_room_id: activeRoomId,
        name,
        parent_id: currentFolderId,
        created_by: user.id
      }).select().single();
      if (error) throw error;

      // Log activity for folder creation
      await supabase.from("data_room_activity").insert({
        data_room_id: activeRoomId,
        organization_id: roomOrgId,
        user_id: user.id,
        user_name: profile?.full_name || user?.user_metadata?.full_name || user?.email || "Unknown",
        user_email: user?.email || "",
        action: "folder_created",
        details: { folder_name: name, parent_id: currentFolderId },
        is_guest: false
      });

      return data;
    },
    onMutate: async (name: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["data-room-all-folders", activeRoomId] });
      
      // Snapshot the previous value
      const previousFolders = queryClient.getQueryData<DataRoomFolder[]>(["data-room-all-folders", activeRoomId]);
      
      // Optimistically update to the new value
      if (previousFolders && user?.id && activeRoomId && selectedRoom) {
        const optimisticFolder: DataRoomFolder = {
          id: `temp-${Date.now()}`,
          name,
          data_room_id: activeRoomId,
          parent_id: currentFolderId,
          created_by: user.id,
          created_at: new Date().toISOString(),
          is_restricted: false
        };
        queryClient.setQueryData<DataRoomFolder[]>(
          ["data-room-all-folders", activeRoomId],
          [...previousFolders, optimisticFolder]
        );
      }
      
      return { previousFolders };
    },
    onSuccess: (data) => {
      // Replace optimistic data with real data
      queryClient.invalidateQueries({
        queryKey: ["data-room-all-folders", activeRoomId]
      });
      setCreateFolderOpen(false);
      setNewFolderName("");
      toast({
        title: "Folder created",
        description: "Your new folder is ready."
      });
    },
    onError: (error, _name, context) => {
      // Rollback to the previous value on error
      if (context?.previousFolders) {
        queryClient.setQueryData(["data-room-all-folders", activeRoomId], context.previousFolders);
      }
      toast({
        title: "Failed to create folder",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete folder mutation (soft delete)
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const {
        error
      } = await supabase.from("data_room_folders").update({ deleted_at: new Date().toISOString() }).eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-room-all-folders"]
      });
      queryClient.invalidateQueries({
        queryKey: ["data-room-files"]
      });
      toast({
        title: "Folder moved to recycling bin",
        description: "The folder will be permanently deleted after 12 months."
      });
    },
    onError: error => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Soft delete data room mutation (moves to recycling bin)
  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from("data_rooms")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-rooms"]
      });
      setSelectedRoomId(null);
      toast({
        title: "Data Room moved to recycling bin",
        description: "The data room will be permanently deleted after 12 months."
      });
    },
    onError: error => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Archive data room mutation
  const archiveRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const { error } = await supabase
        .from("data_rooms")
        .update({ status: "archived", archived_at: new Date().toISOString() } as any)
        .eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-rooms"]
      });
      setSelectedRoomId(null);
      toast({
        title: "Data Room archived",
        description: "The data room has been moved to the archive."
      });
    },
    onError: error => {
      toast({
        title: "Archive failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Rename data room mutation
  const renameRoomMutation = useMutation({
    mutationFn: async ({
      roomId,
      name,
      description
    }: {
      roomId: string;
      name: string;
      description: string | null;
    }) => {
      const {
        error
      } = await supabase.from("data_rooms").update({
        name,
        description
      }).eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-rooms"]
      });
      setEditRoomOpen(false);
      setEditingRoom(null);
      toast({
        title: "Data Room updated",
        description: "The data room has been renamed."
      });
    },
    onError: error => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update NDA settings mutation
  const updateNdaMutation = useMutation({
    mutationFn: async ({
      roomId,
      ndaContent,
      ndaRequired
    }: {
      roomId: string;
      ndaContent: string;
      ndaRequired: boolean;
    }) => {
      const {
        error
      } = await supabase.from("data_rooms").update({
        nda_content: ndaContent || null,
        nda_required: ndaRequired
      }).eq("id", roomId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-rooms"]
      });
      setNdaSettingsOpen(false);
      toast({
        title: "NDA settings updated",
        description: "The NDA configuration has been saved."
      });
    },
    onError: error => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id || !activeRoomId || !selectedRoom) {
        throw new Error("Not authenticated or no room selected");
      }
      // Use the data room's organization_id, not the user's current organization
      const roomOrgId = selectedRoom.organization_id;
      const filePath = `${roomOrgId}/${activeRoomId}/${Date.now()}-${file.name}`;
      const {
        error: uploadError
      } = await supabase.storage.from("data-room-files").upload(filePath, file);
      if (uploadError) throw uploadError;
      const {
        error: dbError
      } = await supabase.from("data_room_files").insert({
        organization_id: roomOrgId,
        data_room_id: activeRoomId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        folder_id: currentFolderId
      });
      if (dbError) throw dbError;

      // Log activity for file upload
      await supabase.from("data_room_activity").insert({
        data_room_id: activeRoomId,
        organization_id: roomOrgId,
        user_id: user.id,
        user_name: profile?.full_name || user?.user_metadata?.full_name || user?.email || "Unknown",
        user_email: user?.email || "",
        action: "file_uploaded",
        details: { file_name: file.name, file_size: file.size, mime_type: file.type, folder_id: currentFolderId },
        is_guest: false
      });

      return file.name;
    },
    onError: error => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Upload multiple files
  const uploadMultipleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (!activeRoomId) {
      toast({
        title: "No Data Room selected",
        description: "Please create or select a data room first.",
        variant: "destructive"
      });
      return;
    }
    setUploading(true);
    setUploadProgress({
      total: files.length,
      completed: 0
    });
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadMutation.mutateAsync(files[i]);
        successCount++;
      } catch {
        failCount++;
      }
      setUploadProgress({
        total: files.length,
        completed: i + 1
      });
    }
    setUploading(false);
    setUploadProgress({
      total: 0,
      completed: 0
    });
    queryClient.invalidateQueries({
      queryKey: ["data-room-files"]
    });
    if (successCount > 0 && failCount === 0) {
      toast({
        title: `${successCount} file${successCount > 1 ? "s" : ""} uploaded`,
        description: "All files have been uploaded successfully."
      });
    } else if (successCount > 0 && failCount > 0) {
      toast({
        title: "Upload completed with errors",
        description: `${successCount} uploaded, ${failCount} failed.`,
        variant: "destructive"
      });
    }
  };

  // Handle drop
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadMultipleFiles(files);
  }, [activeRoomId, toast, uploadMutation, queryClient]);
  // Soft delete mutation (moves to recycling bin instead of permanent delete)
  const deleteMutation = useMutation({
    mutationFn: async (file: {
      id: string;
      file_path: string;
      name?: string;
    }) => {
      if (!activeRoomId || !selectedRoom || !user?.id) {
        throw new Error("Not authenticated or no room selected");
      }
      // Soft delete - just set deleted_at timestamp
      const {
        error: dbError
      } = await supabase.from("data_room_files").update({ deleted_at: new Date().toISOString() }).eq("id", file.id);
      if (dbError) throw dbError;

      // Log activity for file deletion
      await supabase.from("data_room_activity").insert({
        data_room_id: activeRoomId,
        organization_id: selectedRoom.organization_id,
        user_id: user.id,
        user_name: profile?.full_name || user?.user_metadata?.full_name || user?.email || "Unknown",
        user_email: user?.email || "",
        action: "file_deleted",
        details: { file_name: file.name || "Unknown file", file_id: file.id },
        is_guest: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-room-files"]
      });
      toast({
        title: "File moved to recycling bin",
        description: "The file will be permanently deleted after 12 months."
      });
    },
    onError: error => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!selectedRoom?.organization_id || !profile?.full_name || !activeRoomId) {
        throw new Error("Data room is still loading. Please wait a moment and try again.");
      }

      const { data, error } = await supabase.functions.invoke("send-data-room-invite", {
        body: {
          email,
          organizationId: selectedRoom.organization_id,
          dataRoomId: activeRoomId
        }
      });

      if (error) {
        const err: any = error;
        const status = err?.context?.status;

        // Supabase-js may not always surface the body in the same place.
        // Try multiple fallbacks to extract the backend-provided error.
        let body: any = err?.context?.body;
        if (!body && err?.context?.response?.text) {
          try {
            body = await err.context.response.text();
          } catch {
            // ignore
          }
        }

        let bodyMsg: string | undefined;
        if (typeof body === "string") {
          try {
            const parsed = JSON.parse(body);
            bodyMsg = parsed?.error;
          } catch {
            bodyMsg = body;
          }
        } else if (body && typeof body === "object") {
          bodyMsg = body.error;
        }

        throw new Error(bodyMsg || (status ? `Request failed (${status})` : error.message));
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-room-invites"]
      });
      setInviteEmail("");
      setInviteError("");
      toast({
        title: "Invitation sent",
        description: "The collaborator will receive an email invitation."
      });
    },
    onError: error => {
      toast({
        title: "Failed to send invitation",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete invite mutation
  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const {
        error
      } = await supabase.from("data_room_invites").delete().eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-room-invites"]
      });
      toast({
        title: "Invitation revoked",
        description: "The invitation has been removed."
      });
    },
    onError: error => {
      toast({
        title: "Failed to revoke invitation",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadMultipleFiles(Array.from(files));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const getFileType = (mimeType: string | null, fileName?: string): "image" | "pdf" | "video" | "document" | "other" => {
    if (!mimeType) {
      // Try to detect from file extension if mime type is missing
      if (fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return "pdf";
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return "image";
        if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext || '')) return "video";
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'].includes(ext || '')) return "document";
      }
      return "other";
    }
    
    // Image types
    if (mimeType.startsWith("image/")) return "image";
    
    // PDF
    if (mimeType === "application/pdf") return "pdf";
    
    // Video types
    if (mimeType.startsWith("video/")) return "video";
    
    // Document types (Word, Excel, PowerPoint, OpenDocument)
    const documentMimeTypes = [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation"
    ];
    if (documentMimeTypes.includes(mimeType)) return "document";
    
    return "other";
  };
  const handleViewFile = async (fileId: string, filePath: string, fileName: string, mimeType: string | null) => {
    const fileType = getFileType(mimeType, fileName);
    setPreviewLoading(true);
    const {
      data
    } = await supabase.storage.from("data-room-files").createSignedUrl(filePath, 60 * 60);
    setPreviewLoading(false);
    if (data?.signedUrl) {
      // Always open in preview dialog for all file types
      setPreviewFile({
        id: fileId,
        name: fileName,
        url: data.signedUrl,
        type: fileType,
        mimeType: mimeType || undefined,
        file_path: filePath
      });
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    const {
      data
    } = await supabase.storage.from("data-room-files").createSignedUrl(filePath, 60 * 60);
    if (data?.signedUrl) {
      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  const handleSendInvite = async () => {
    setInviteError("");
    const validation = emailSchema.safeParse(inviteEmail);
    if (!validation.success) {
      setInviteError(validation.error.errors[0].message);
      return;
    }
    await inviteMutation.mutateAsync(inviteEmail);
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Helper to check if file is editable
  const isEditableDocument = (mimeType: string | null) => {
    if (!mimeType) return false;
    return (
      mimeType.includes("wordprocessingml") ||
      mimeType.includes("msword") ||
      mimeType.includes("spreadsheetml") ||
      mimeType.includes("ms-excel") ||
      mimeType === "application/pdf" ||
      mimeType.startsWith("text/")
    );
  };

  // Build collaborators list from owner + invites
  const collaborators = [{
    id: "owner",
    name: profile?.full_name || "You",
    email: user?.email || "",
    role: "owner" as const,
    status: "active"
  }, ...invites.map((invite: any) => ({
    id: invite.id,
    name: invite.email.split("@")[0],
    email: invite.email,
    role: "invited" as const,
    status: invite.status
  }))];

  // Build activity from files and invites
  const activities = [...files.slice(0, 3).map((file: any) => ({
    id: `file-${file.id}`,
    description: `${file.name} uploaded`,
    timestamp: format(new Date(file.created_at), "dd/MM/yyyy HH:mm")
  })), ...invites.slice(0, 3).map((invite: any) => ({
    id: `invite-${invite.id}`,
    description: `Invitation sent to ${invite.email}`,
    timestamp: format(new Date(invite.created_at), "dd/MM/yyyy HH:mm")
  }))].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5);
  return <div className="min-h-screen bg-background flex pb-20 md:pb-0">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-4 sm:py-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-500/70 flex items-center justify-center shadow-sm">
                  <FolderLock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground">Data Room</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Securely share and manage confidential documents</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <OrganizationSwitcher />
              <Button size="sm" onClick={() => setCreateRoomOpen(true)} className="gap-2 rounded-full bg-emerald-500 hover:bg-emerald-600 hover:shadow-md transition-all duration-300">
                <Plus className="w-4 h-4" />
                New Room
              </Button>
              {/* Storage Indicator */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground bg-secondary/50 rounded-full px-3 py-1.5">
                <HardDrive className="w-4 h-4" />
                <span>{formatFileSize(storageUsage.used)}</span>
                <span className="hidden sm:inline">/ {formatFileSize(storageUsage.total)}</span>
                <div className="w-16 sm:w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      storagePercentage > 90 ? "bg-destructive" : storagePercentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                    )} 
                    style={{ width: `${Math.min(storagePercentage, 100)}%` }} 
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs hover:bg-emerald-500/10 hover:text-emerald-600"
                  onClick={handleBuyMoreStorage}
                >
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Buy More</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto bg-card/50">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent rounded-2xl p-4 sm:p-6 border border-emerald-500/20 mb-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/20 shrink-0">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Secure Collaboration Space</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-2xl">
                    Create secure data rooms to share confidential files with internal team members and external guests. Control access with NDA requirements and track all activity.
                  </p>
                </div>
              </div>
            </div>

            {activeRoomId && selectedRoom ? <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar - Compact Navigation */}
                <aside className="lg:col-span-1 space-y-3">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedRoomId(null)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    All Rooms
                  </Button>

                  {/* Room Info */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10">
                        <Shield className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{selectedRoom?.name}</h3>
                        {selectedRoom?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedRoom.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {selectedRoom && format(new Date(selectedRoom.created_at), "MMM d, yyyy")}
                    </div>
                  </div>


                  {/* Quick Actions */}
                  {selectedRoom?.created_by === user?.id && (
                    <div className="space-y-1.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-8 text-xs justify-start gap-2"
                        onClick={() => {
                          setNdaContent(selectedRoom?.nda_content || "");
                          setNdaRequired(selectedRoom?.nda_required ?? true);
                          setNdaSettingsOpen(true);
                        }}
                      >
                        <FileSignature className="w-3.5 h-3.5 text-amber-500" />
                        NDA Settings
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-8 text-xs justify-start gap-2"
                        onClick={() => setSignaturesOpen(true)}
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        Signatures ({ndaSignatures.length})
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-8 text-xs justify-start gap-2 text-destructive hover:text-destructive"
                        onClick={() => deleteRoomMutation.mutate(activeRoomId)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Room
                      </Button>
                      <DataRoomRecyclingBin 
                        dataRoomId={activeRoomId} 
                        organizationId={selectedRoom?.organization_id || organization?.id || ""}
                        roomCreatorId={selectedRoom?.created_by}
                        onRestore={() => {
                          queryClient.invalidateQueries({ queryKey: ["data-room-files"] });
                          queryClient.invalidateQueries({ queryKey: ["data-room-all-folders"] });
                        }}
                      />
                    </div>
                  )}
                </aside>

                {/* Main Content Area */}
                <main className="lg:col-span-3 space-y-4">
                  {/* Files Section - Full Width */}
                  <Card className="overflow-hidden">
                    <div className="p-4 border-b flex items-center justify-between bg-muted/20">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <h2 className="font-semibold">Files</h2>
                        {currentFolderId && (
                          <Button variant="ghost" size="sm" onClick={() => setCurrentFolderId(null)} className="h-6 px-2 text-xs text-muted-foreground">
                            <ArrowLeft className="w-3 h-3 mr-1" />
                            Back
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {canEditCurrentFolder && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)} className="h-8 text-xs">
                              <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                              Folder
                            </Button>
                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
                              <Upload className="w-3.5 h-3.5 mr-1.5" />
                              Upload
                            </Button>
                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Drop Zone */}
                    <div ref={dropZoneRef} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={cn("min-h-[300px] transition-all", isDragging && "bg-emerald-500/5")}>
                      {foldersLoading || filesLoading ? (
                        <div className="flex items-center justify-center h-[300px]">
                          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : folders.length === 0 && files.length === 0 ? (
                        <div className={cn("flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed m-4 rounded-xl transition-colors", isDragging ? "border-emerald-500 bg-emerald-500/5" : "border-border/30")}>
                          <CloudUpload className="w-12 h-12 mb-3 opacity-30" />
                          <p className="font-medium">Drop files here or click upload</p>
                          <p className="text-xs mt-1 text-muted-foreground/70">Supported: PDF, DOCX, Images</p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-3">
                          {/* Folders */}
                          {folders.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {folders.map(folder => {
                                const hasAccess = canAccessFolder(folder);
                                return (
                                <div 
                                  key={folder.id} 
                                  className={cn(
                                    "p-3 rounded-lg transition-all group relative",
                                    hasAccess 
                                      ? "bg-muted/30 hover:bg-muted/50" 
                                      : "bg-muted/20 opacity-70"
                                  )}
                                >
                                  <div 
                                    className={cn(
                                      "flex items-center gap-2",
                                      hasAccess ? "cursor-pointer" : "cursor-not-allowed"
                                    )}
                                    onClick={() => handleFolderClick(folder)}
                                  >
                                    {hasAccess ? (
                                      <Folder className="w-4 h-4 text-amber-500" />
                                    ) : (
                                      <FolderLock className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <span className={cn(
                                      "text-sm font-medium truncate flex-1",
                                      !hasAccess && "text-muted-foreground"
                                    )}>{folder.name}</span>
                                    {folder.is_restricted && (
                                      <span title={hasAccess ? "Restricted access" : "No access"}>
                                        <Lock className={cn(
                                          "w-3 h-3 flex-shrink-0",
                                          hasAccess ? "text-amber-500" : "text-muted-foreground"
                                        )} />
                                      </span>
                                    )}
                                  </div>
                                  {/* Folder action buttons - show on hover */}
                                  <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-md px-0.5">
                                    {/* Only show folder management for data room creator */}
                                    {selectedRoom?.created_by === user?.id && (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPermissionsFolder({
                                              id: folder.id,
                                              name: folder.name,
                                              is_restricted: folder.is_restricted || false,
                                              created_by: folder.created_by
                                            });
                                            setFolderPermissionsDialogOpen(true);
                                          }}
                                          title="Manage folder access"
                                        >
                                          <Lock className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFolderToDelete({ id: folder.id, name: folder.name });
                                            setDeleteFolderDialogOpen(true);
                                          }}
                                          title="Delete folder"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Files - Clean List */}
                          {files.length > 0 && (
                            <div className="space-y-1">
                              {files.map(file => (
                                <div key={file.id} className="p-3 rounded-lg hover:bg-muted/30 transition-all group flex items-center justify-between">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {file.mime_type?.startsWith("image/") ? (
                                      <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    ) : file.mime_type === "application/pdf" ? (
                                      <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                    ) : (file.mime_type?.includes("word") || file.name?.endsWith('.docx')) ? (
                                      <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    ) : (
                                      <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium truncate">{file.name}</p>
                                        {file.is_restricted && (
                                          <span title="Restricted access">
                                            <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                          </span>
                                        )}
                                        {/* Show folder indicator for files that have been moved to a folder */}
                                        {/* This shows to all users so they can see where the file is saved */}
                                        {(file as any).folder?.name && (
                                          <span 
                                            className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded" 
                                            title={`Saved in folder: ${(file as any).folder.name}${(file as any).folder.is_restricted ? ' (restricted)' : ''}`}
                                          >
                                            {(file as any).folder.is_restricted ? (
                                              <FolderLock className="w-3 h-3" />
                                            ) : (
                                              <Folder className="w-3 h-3" />
                                            )}
                                            <span className="truncate max-w-[100px]">{(file as any).folder.name}</span>
                                          </span>
                                        )}
                                        {/* Fallback for surfaced files (with folder_name but no joined folder) */}
                                        {!(file as any).folder?.name && (file as any).is_surfaced && (file as any).folder_name && (
                                          <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded" title={`From folder: ${(file as any).folder_name} (restricted)`}>
                                            <FolderLock className="w-3 h-3" />
                                            <span className="truncate max-w-[100px]">{(file as any).folder_name}</span>
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{(file.file_size / 1024).toFixed(1)} KB • {format(new Date(file.created_at), "MMM d")}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {/* Add to folder dropdown - always visible */}
                                    <AddToFolderDropdown
                                      fileId={file.id}
                                      fileName={file.name}
                                      currentFolderId={file.folder_id || null}
                                      dataRoomId={activeRoomId || ""}
                                      organizationId={selectedRoom?.organization_id || organization?.id || ""}
                                      userId={user?.id || ""}
                                      dataRoomCreatorId={selectedRoom?.created_by}
                                    />
                                    {/* Action buttons - show on hover */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 w-7 p-0" 
                                        onClick={() => {
                                          setPermissionsFile({
                                            id: file.id,
                                            name: file.name,
                                            is_restricted: file.is_restricted || false,
                                            uploaded_by: file.uploaded_by
                                          });
                                          setPermissionsDialogOpen(true);
                                        }}
                                        title="Manage permissions"
                                      >
                                        <Lock className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleViewFile(file.id, file.file_path, file.name, file.mime_type)} title="Preview">
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>
                                      {/* Edit button - for editable documents, requires edit permission */}
                                      {isEditableDocument(file.mime_type) && canEditFile(file) && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 w-7 p-0" 
                                          onClick={() => setEditFile({
                                            id: file.id,
                                            name: file.name,
                                            file_path: file.file_path,
                                            mime_type: file.mime_type
                                          })}
                                          title="Edit"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownloadFile(file.file_path, file.name)} title="Download">
                                        <Download className="w-3.5 h-3.5" />
                                      </Button>
                                      {/* Delete button - requires folder edit permission */}
                                      {canEditFolder(file.folder_id) && (
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate({ id: file.id, file_path: file.file_path })} title="Delete">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Tabbed Activity & Discussion */}
                  <Card className="overflow-hidden">
                    <Tabs defaultValue="team" value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <div className="px-4 pt-3 border-b bg-muted/20">
                        <TabsList className="h-9 p-1 bg-transparent gap-1">
                          <TabsTrigger value="team" className="text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm px-3">
                            <Users className="w-3.5 h-3.5 mr-1.5" />
                            Team
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
                      
                      <TabsContent value="team" className="m-0">
                        <ActiveTeamPanel 
                          dataRoomId={activeRoomId} 
                          organizationId={selectedRoom?.organization_id || organization?.id || ""} 
                          currentUserId={user?.id || ""} 
                          isOwner={selectedRoom?.created_by === user?.id}
                          createdBy={selectedRoom?.created_by}
                          inviteEmail={inviteEmail}
                          setInviteEmail={setInviteEmail}
                          inviteError={inviteError}
                          setInviteError={setInviteError}
                          onSendInvite={handleSendInvite}
                          isInviting={inviteMutation.isPending}
                        />
                      </TabsContent>
                      
                      <TabsContent value="discussion" className="m-0">
                        <DataRoomChat dataRoomId={activeRoomId} organizationId={selectedRoom?.organization_id || organization?.id || ""} userId={user?.id || ""} userName={profile?.full_name || user?.user_metadata?.full_name || user?.email || "Unknown"} userEmail={user?.email || ""} />
                      </TabsContent>
                      
                      <TabsContent value="activity" className="m-0 p-4 max-h-[350px] overflow-y-auto">
                        <DataRoomActivity dataRoomId={activeRoomId} />
                      </TabsContent>
                      
                    </Tabs>
                  </Card>
                </main>
              </div> : <div className="space-y-6">
                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10">
                      <Folder className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Data Rooms Dashboard</h2>
                      <p className="text-sm text-muted-foreground">Manage and access your secure data rooms</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DataRoomBins
                      organizationId={organization?.id || ""}
                      userId={user?.id || ""}
                      onRestore={() => queryClient.invalidateQueries({ queryKey: ["data-rooms"] })}
                    />
                    <Badge variant="secondary" className="text-xs">
                      {dataRooms.length} Room{dataRooms.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Tabs for Your Rooms / Shared */}
                <Tabs defaultValue="your-rooms" className="w-full">
                  <TabsList className="w-full max-w-xs grid grid-cols-2 h-10 p-1 bg-muted/50">
                    <TabsTrigger value="your-rooms" className="text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-md transition-all">
                      Your Rooms
                    </TabsTrigger>
                    <TabsTrigger value="shared" className="text-xs sm:text-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white rounded-md transition-all">
                      Shared With You
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="your-rooms" className="mt-6">
                    {roomsLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" />
                        <p className="text-sm">Loading your data rooms...</p>
                      </div>
                    ) : dataRooms.length === 0 ? (
                      <Card className="p-8 bg-card/80 backdrop-blur-sm border-border/50">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="p-5 rounded-full bg-emerald-500/10 mb-5">
                            <FolderLock className="w-10 h-10 text-emerald-500" />
                          </div>
                          <h3 className="font-semibold text-lg text-foreground mb-2">No data rooms yet</h3>
                          <p className="text-sm text-muted-foreground mb-5 max-w-md">
                            Create your first secure data room to share confidential files with internal team members and external guests.
                          </p>
                          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setCreateRoomOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Data Room
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {dataRooms.map(room => (
                          <Card 
                            key={room.id} 
                            className="group cursor-pointer transition-all duration-200 border-border/50 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 bg-card/80 backdrop-blur-sm overflow-hidden relative"
                            onClick={() => handleRoomSelect(room.id)}
                          >
                            {/* Action buttons - show on hover */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 bg-background/80 hover:bg-amber-500/10 hover:text-amber-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveRoomMutation.mutate(room.id);
                                }}
                                title="Archive data room"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 bg-background/80 hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRoomMutation.mutate(room.id);
                                }}
                                title="Move to recycling bin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <div className="p-4 space-y-4">
                              {/* Room Header */}
                              <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors shrink-0">
                                  <FolderLock className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                    {room.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Created {format(new Date(room.created_at), "MMM d, yyyy")}
                                  </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors shrink-0 mt-1" />
                              </div>

                              {/* Room Description */}
                              {room.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {room.description}
                                </p>
                              )}

                              {/* Room Meta */}
                              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                <Badge 
                                  variant={room.nda_required ? "default" : "secondary"} 
                                  className={cn(
                                    "text-[10px] h-5",
                                    room.nda_required && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                  )}
                                >
                                  {room.nda_required ? (
                                    <>
                                      <Shield className="w-3 h-3 mr-1" />
                                      NDA Required
                                    </>
                                  ) : (
                                    "No NDA"
                                  )}
                                </Badge>
                              </div>
                            </div>

                            {/* Hover Overlay */}
                            <div className="px-4 py-2.5 bg-emerald-500/5 border-t border-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                                Click to open
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                              </p>
                            </div>
                          </Card>
                        ))}

                        {/* Create New Room Card */}
                        <Card 
                          className="group cursor-pointer transition-all duration-200 border-dashed border-2 border-border/50 hover:border-emerald-500/50 bg-transparent hover:bg-emerald-500/5 flex items-center justify-center min-h-[180px]"
                          onClick={() => setCreateRoomOpen(true)}
                        >
                          <div className="text-center p-4">
                            <div className="p-3 rounded-full bg-muted/50 group-hover:bg-emerald-500/10 transition-colors inline-flex mb-3">
                              <Plus className="w-6 h-6 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              Create New Room
                            </p>
                          </div>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="shared" className="mt-6">
                    <Card className="p-4 bg-card/80 backdrop-blur-sm border-border/50">
                      <SharedDataRooms 
                        userId={user?.id || ""} 
                        organizationId={organization?.id || ""} 
                        onSelectRoom={handleRoomSelect} 
                        selectedRoomId={activeRoomId} 
                      />
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>}
          </div>
        </main>
      </div>
      <SideNavigation />

      {/* File Preview Modal with Comments */}
      <DataRoomFilePreviewDialog
        file={previewFile}
        onClose={() => setPreviewFile(null)}
        dataRoomId={activeRoomId || ""}
        organizationId={selectedRoom?.organization_id || organization?.id || ""}
        userId={user?.id || ""}
        userName={profile?.full_name || user?.user_metadata?.full_name || user?.email || "Unknown"}
        userEmail={user?.email || ""}
      />

      {/* NDA Update Re-sign Modal */}
      {ndaResignCheck?.needsResign && ndaResignCheck.dataRoomId && (
        <NdaUpdateModal
          open={true}
          onClose={() => {}}
          onSigned={() => {
            queryClient.invalidateQueries({ queryKey: ["nda-resign-check"] });
          }}
          dataRoomId={ndaResignCheck.dataRoomId}
          dataRoomName={ndaResignCheck.dataRoomName || "Data Room"}
          ndaContent={ndaResignCheck.ndaContent}
          userId={user?.id || ""}
          userEmail={user?.email || ""}
          userName={profile?.full_name || user?.user_metadata?.full_name || ""}
        />
      )}

      {/* Create Data Room Modal */}
      <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Create New Data Room
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              All data rooms require an NDA that guests must sign before accessing files.
            </p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room Name *</label>
              <Input 
                placeholder="e.g., Series A Due Diligence" 
                value={newRoomName} 
                onChange={e => setNewRoomName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input 
                placeholder="Brief description of this data room" 
                value={newRoomDescription} 
                onChange={e => setNewRoomDescription(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" />
                  Non-Disclosure Agreement *
                </label>
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Required for all guests
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Guests must sign this NDA before accessing any files. You can edit this after creation.
              </p>
              <Textarea 
                placeholder="Enter your NDA terms..." 
                value={newRoomNdaContent} 
                onChange={e => setNewRoomNdaContent(e.target.value)}
                className="min-h-[200px] text-sm font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRoomOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600" 
              onClick={() => createRoomMutation.mutate({
                name: newRoomName,
                description: newRoomDescription,
                ndaContent: newRoomNdaContent
              })} 
              disabled={!newRoomName.trim() || !newRoomNdaContent.trim() || createRoomMutation.isPending}
            >
              {createRoomMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Create Protected Room
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Modal */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Folder Name</label>
              <Input placeholder="e.g., Contracts" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => createFolderMutation.mutate(newFolderName)} disabled={!newFolderName.trim() || createFolderMutation.isPending}>
              {createFolderMutation.isPending ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </> : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Data Room Modal */}
      <Dialog open={editRoomOpen} onOpenChange={open => {
      setEditRoomOpen(open);
      if (!open) setEditingRoom(null);
    }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input placeholder="e.g., Series A Due Diligence" value={editingRoom?.name || ""} onChange={e => setEditingRoom(prev => prev ? {
              ...prev,
              name: e.target.value
            } : null)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Input placeholder="Brief description of this data room" value={editingRoom?.description || ""} onChange={e => setEditingRoom(prev => prev ? {
              ...prev,
              description: e.target.value
            } : null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
            setEditRoomOpen(false);
            setEditingRoom(null);
          }}>
              Cancel
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
            if (editingRoom) {
              renameRoomMutation.mutate({
                roomId: editingRoom.id,
                name: editingRoom.name,
                description: editingRoom.description
              });
            }
          }} disabled={!editingRoom?.name.trim() || renameRoomMutation.isPending}>
              {renameRoomMutation.isPending ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NDA Settings Modal */}
      <Dialog open={ndaSettingsOpen} onOpenChange={setNdaSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              NDA Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Require NDA Signature</p>
                <p className="text-sm text-muted-foreground">
                  Collaborators must sign the NDA before accessing files
                </p>
              </div>
              <Switch checked={ndaRequired} onCheckedChange={setNdaRequired} />
            </div>

            {ndaRequired && <div className="space-y-2">
                <label className="text-sm font-medium">NDA Content</label>
                <Textarea placeholder="Enter the full text of your Non-Disclosure Agreement..." value={ndaContent} onChange={e => setNdaContent(e.target.value)} className="min-h-[300px] font-mono text-sm" />
                <p className="text-xs text-muted-foreground">
                  This agreement will be displayed to collaborators before they can access the data room.
                </p>
              </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNdaSettingsOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => {
            if (activeRoomId) {
              updateNdaMutation.mutate({
                roomId: activeRoomId,
                ndaContent: ndaContent,
                ndaRequired: ndaRequired
              });
            }
          }} disabled={updateNdaMutation.isPending || ndaRequired && !ndaContent.trim()}>
              {updateNdaMutation.isPending ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </> : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NDA Signatures Modal */}
      <Dialog open={signaturesOpen} onOpenChange={setSignaturesOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-emerald-500" />
              NDA Signatures - {selectedRoom?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {signaturesLoading ? <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading signatures...
              </div> : ndaSignatures.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                <FileSignature className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No signatures yet</p>
                <p className="text-sm mt-1">Collaborators will appear here after signing the NDA</p>
              </div> : <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {ndaSignatures.map((sig: any) => <Card key={sig.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{sig.signer_name}</p>
                          <p className="text-sm text-muted-foreground">{sig.signer_email}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-foreground">{format(new Date(sig.signed_at), "MMM d, yyyy")}</p>
                        <p className="text-muted-foreground">{format(new Date(sig.signed_at), "h:mm a")}</p>
                        {sig.ip_address && <p className="text-xs text-muted-foreground mt-1">IP: {sig.ip_address}</p>}
                      </div>
                    </div>
                  </Card>)}
              </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignaturesOpen(false)}>
              Close
            </Button>
            {ndaSignatures.length > 0 && <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={exportSignaturesToCsv}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Permissions Dialog - manages per-file access control */}
      <FilePermissionsDialog
        open={permissionsDialogOpen}
        onOpenChange={setPermissionsDialogOpen}
        file={permissionsFile}
        dataRoomId={activeRoomId || ""}
        organizationId={selectedRoom?.organization_id || organization?.id || ""}
        currentUserId={user?.id || ""}
        dataRoomCreatorId={selectedRoom?.created_by || ""}
        currentUserName={profile?.full_name || user?.user_metadata?.full_name || user?.email || "Unknown"}
        currentUserEmail={user?.email || ""}
      />

      {/* Folder Permissions Dialog */}
      <FolderPermissionsDialog
        open={folderPermissionsDialogOpen}
        onOpenChange={setFolderPermissionsDialogOpen}
        folder={permissionsFolder}
        dataRoomId={activeRoomId || ""}
        organizationId={selectedRoom?.organization_id || organization?.id || ""}
        currentUserId={user?.id || ""}
        currentUserName={profile?.full_name || user?.user_metadata?.full_name || user?.email || "Unknown"}
        currentUserEmail={user?.email || ""}
      />

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Folder to Recycling Bin</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete "{folderToDelete?.name}"? The folder will be moved to the recycling bin and permanently deleted after 12 months.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteFolderDialogOpen(false);
              setFolderToDelete(null);
            }}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (folderToDelete) {
                  deleteFolderMutation.mutate(folderToDelete.id);
                  setDeleteFolderDialogOpen(false);
                  setFolderToDelete(null);
                }
              }} 
              disabled={deleteFolderMutation.isPending}
            >
              {deleteFolderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Storage Purchase Dialog */}
      <Dialog open={storagePurchaseDialogOpen} onOpenChange={setStoragePurchaseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-500" />
              Buy More Data Room Storage
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Current usage</p>
              <p className="text-lg font-semibold">
                {formatFileSize(storageUsage.used)} / {formatFileSize(storageUsage.total)}
              </p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    storagePercentage > 90 ? "bg-destructive" : storagePercentage > 70 ? "bg-amber-500" : "bg-emerald-500"
                  )} 
                  style={{ width: `${Math.min(storagePercentage, 100)}%` }} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-center mb-3">Select a storage tier</p>
              
              <button
                onClick={() => handlePurchaseTier("100mb")}
                disabled={purchasingTier !== null}
                className="w-full p-4 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-between group"
              >
                <div className="text-left">
                  <p className="font-medium">100 MB</p>
                  <p className="text-xs text-muted-foreground">Good for small documents</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-600">$9.99<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                  {purchasingTier === "100mb" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </button>

              <button
                onClick={() => handlePurchaseTier("500mb")}
                disabled={purchasingTier !== null}
                className="w-full p-4 rounded-lg border-2 border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all flex items-center justify-between group relative"
              >
                <Badge className="absolute -top-2 left-4 bg-emerald-500 text-white text-[10px]">Popular</Badge>
                <div className="text-left">
                  <p className="font-medium">500 MB</p>
                  <p className="text-xs text-muted-foreground">Best value for teams</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-600">$14.99<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                  {purchasingTier === "500mb" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </button>

              <button
                onClick={() => handlePurchaseTier("1gb")}
                disabled={purchasingTier !== null}
                className="w-full p-4 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-between group"
              >
                <div className="text-left">
                  <p className="font-medium">1 GB</p>
                  <p className="text-xs text-muted-foreground">Maximum capacity</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-emerald-600">$24.99<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                  {purchasingTier === "1gb" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Storage is added to your organization's total capacity
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Editor Dialog */}
      <DataRoomDocumentEditorDialog
        open={!!editFile}
        onOpenChange={(open) => {
          if (!open) setEditFile(null);
        }}
        file={editFile}
        dataRoomId={activeRoomId || ""}
        organizationId={selectedRoom?.organization_id || organization?.id || ""}
      />
    </div>;
};
export default Dataroom;