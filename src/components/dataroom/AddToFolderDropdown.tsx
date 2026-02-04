import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Folder, FolderPlus, ChevronDown, Loader2, FolderOpen, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DataRoomFolder {
  id: string;
  name: string;
  data_room_id: string;
  parent_id: string | null;
  is_restricted: boolean;
  created_by: string;
}

interface AddToFolderDropdownProps {
  fileId: string;
  fileName: string;
  currentFolderId: string | null;
  dataRoomId: string;
  organizationId: string;
  userId: string;
  dataRoomCreatorId?: string; // The creator of the data room (who can manage all folder permissions)
}

export function AddToFolderDropdown({
  fileId,
  fileName,
  currentFolderId,
  dataRoomId,
  organizationId,
  userId,
  dataRoomCreatorId,
}: AddToFolderDropdownProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Fetch all active (non-deleted) folders in the data room
  // Use the same query key as Dataroom.tsx for cache consistency
  const { data: allFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["data-room-all-folders", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_folders")
        .select("id, name, data_room_id, parent_id, is_restricted, created_by")
        .eq("data_room_id", dataRoomId)
        .is("deleted_at", null) // Only show non-deleted folders
        .order("name", { ascending: true });
      
      if (error) throw error;
      return (data || []) as DataRoomFolder[];
    },
    enabled: !!dataRoomId,
  });

  // Fetch ALL folder permissions for this user in this data room
  const { data: userFolderPermissions = [] } = useQuery({
    queryKey: ["user-folder-permissions", dataRoomId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_folder_permissions")
        .select("folder_id, user_id, permission_level")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Create a set of folder IDs the user has access to
  const permittedFolderIds = new Set(userFolderPermissions.map(p => p.folder_id));

  // Filter folders: 
  // - Show all non-restricted folders
  // - For restricted folders: only show if user is data room creator OR has explicit permission
  const accessibleFolders = allFolders.filter(folder => {
    if (!folder.is_restricted) return true;
    if (dataRoomCreatorId && userId === dataRoomCreatorId) return true;
    return permittedFolderIds.has(folder.id);
  });

  // Move file to folder mutation
  const moveFileMutation = useMutation({
    mutationFn: async (folderId: string | null) => {
      const { error } = await supabase
        .from("data_room_files")
        .update({ folder_id: folderId })
        .eq("id", fileId);
      
      if (error) throw error;
    },
    onSuccess: (_, folderId) => {
      // Invalidate the actual query keys used in Dataroom.tsx
      queryClient.invalidateQueries({ queryKey: ["data-room-files"] });
      queryClient.invalidateQueries({ queryKey: ["data-room-all-folders", dataRoomId] });
      const folderName = folderId 
        ? allFolders.find(f => f.id === folderId)?.name || "folder"
        : "main files";
      toast({
        title: "File moved",
        description: folderId 
          ? `Moved "${fileName}" to "${folderName}"`
          : `Moved "${fileName}" to main files`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to move file",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("data_room_folders")
        .insert({
          organization_id: organizationId,
          data_room_id: dataRoomId,
          name,
          parent_id: null, // Create at root
          created_by: userId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (newFolder) => {
      // Move file to the new folder
      await moveFileMutation.mutateAsync(newFolder.id);
      // Invalidate the folders query to show the new folder
      queryClient.invalidateQueries({ queryKey: ["data-room-all-folders", dataRoomId] });
      setCreateFolderOpen(false);
      setNewFolderName("");
    },
    onError: (error) => {
      toast({
        title: "Failed to create folder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleMoveToFolder = (folderId: string | null) => {
    if (folderId === currentFolderId) return;
    moveFileMutation.mutate(folderId);
  };

  const handleCreateAndMove = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName.trim());
  };

  const currentFolder = currentFolderId 
    ? accessibleFolders.find(f => f.id === currentFolderId)
    : null;

  // Check if user can access the current folder
  // User can access if: folder is not restricted, OR user is the data room creator, OR user has explicit permission
  const canAccessCurrentFolder = currentFolder 
    ? !currentFolder.is_restricted || 
      (dataRoomCreatorId && userId === dataRoomCreatorId) || 
      permittedFolderIds.has(currentFolderId!)
    : true;

  const isPending = moveFileMutation.isPending || createFolderMutation.isPending;

  // If file is in a folder the user cannot access, show read-only indicator
  if (currentFolderId && !canAccessCurrentFolder) {
    // Find the folder name from allFolders (not accessibleFolders)
    const restrictedFolder = allFolders.find(f => f.id === currentFolderId);
    return (
      <div className="h-6 px-2 text-xs text-muted-foreground flex items-center gap-1">
        <Folder className="w-3 h-3 text-warning" />
        <span className="max-w-[80px] truncate">{restrictedFolder?.name || "Restricted"}</span>
        <Lock className="w-3 h-3 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : currentFolder ? (
              <>
                <Folder className="w-3 h-3 text-warning" />
                <span className="max-w-[80px] truncate">{currentFolder.name}</span>
              </>
            ) : (
              <>
                <FolderPlus className="w-3 h-3" />
                <span>Add to folder</span>
              </>
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {foldersLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Move to root option */}
              {currentFolderId && (
                <>
                  <DropdownMenuItem 
                    onClick={() => handleMoveToFolder(null)}
                    className="cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Remove from folder</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Existing folders - use accessibleFolders to respect permissions */}
              {accessibleFolders.length > 0 ? (
                accessibleFolders
                  .filter(f => f.id !== currentFolderId)
                  .map(folder => (
                    <DropdownMenuItem 
                      key={folder.id}
                      onClick={() => handleMoveToFolder(folder.id)}
                      className="cursor-pointer"
                    >
                      <Folder className="w-4 h-4 mr-2 text-warning" />
                      <span className="truncate">{folder.name}</span>
                      {folder.is_restricted && (
                        <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0 h-3 border-0">
                          <Lock className="w-2 h-2" />
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No folders yet
                </div>
              )}

              <DropdownMenuSeparator />
              
              {/* Create new folder option - only for data room creator */}
              {dataRoomCreatorId && userId === dataRoomCreatorId && (
                <DropdownMenuItem 
                  onClick={() => setCreateFolderOpen(true)}
                  className="cursor-pointer text-primary"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  <span>Create new folder</span>
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create folder dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-primary" />
              Create Folder & Move File
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Create a new folder and move "<span className="font-medium">{fileName}</span>" to it.
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Folder Name</label>
              <Input 
                placeholder="e.g., Contracts" 
                value={newFolderName} 
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateAndMove()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAndMove}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create & Move"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
