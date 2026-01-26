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
}

interface GuestAddToFolderDropdownProps {
  fileId: string;
  fileName: string;
  currentFolderId: string | null;
  dataRoomId: string;
  token: string;
  email: string;
  onMoveComplete?: () => void;
}

export function GuestAddToFolderDropdown({
  fileId,
  fileName,
  currentFolderId,
  dataRoomId,
  token,
  email,
  onMoveComplete,
}: GuestAddToFolderDropdownProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Fetch accessible folders via edge function
  const { data: allFolders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["guest-accessible-folders", dataRoomId, token, email],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("guest-get-folders", {
        body: { token, email: email.toLowerCase() },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.folders || []) as DataRoomFolder[];
    },
    enabled: !!dataRoomId && !!token && !!email,
  });

  // Move file mutation
  const moveFileMutation = useMutation({
    mutationFn: async (folderId: string | null) => {
      const { data, error } = await supabase.functions.invoke("guest-move-file-to-folder", {
        body: { token, email: email.toLowerCase(), fileId, folderId },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, folderId) => {
      queryClient.invalidateQueries({ queryKey: ["guest-data-room-content"] });
      const folderName = folderId 
        ? allFolders.find(f => f.id === folderId)?.name || "folder"
        : "main files";
      toast({
        title: "File moved",
        description: folderId 
          ? `Moved "${fileName}" to "${folderName}"`
          : `Moved "${fileName}" to main files`,
      });
      onMoveComplete?.();
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
      const { data, error } = await supabase.functions.invoke("guest-create-folder", {
        body: {
          token,
          email: email.toLowerCase(),
          folderName: name,
          parentFolderId: null, // Create at root
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: async (newFolder) => {
      // Move file to the new folder if we have an ID
      if (newFolder?.folderId) {
        await moveFileMutation.mutateAsync(newFolder.folderId);
      }
      queryClient.invalidateQueries({ queryKey: ["guest-accessible-folders"] });
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
    ? allFolders.find(f => f.id === currentFolderId)
    : null;

  const isPending = moveFileMutation.isPending || createFolderMutation.isPending;

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

              {/* Existing folders */}
              {allFolders.length > 0 ? (
                allFolders
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
                  No folders available
                </div>
              )}

              <DropdownMenuSeparator />
              
              {/* Create new folder option */}
              <DropdownMenuItem 
                onClick={() => setCreateFolderOpen(true)}
                className="cursor-pointer text-primary"
              >
                <FolderPlus className="w-4 h-4 mr-2" />
                <span>Create new folder</span>
              </DropdownMenuItem>
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
