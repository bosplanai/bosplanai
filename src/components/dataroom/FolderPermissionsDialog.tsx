// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Users, Eye, Edit2, Loader2, X, Mail, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DataRoomMember {
  id: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
  };
}

interface NdaSignedGuest {
  id: string;
  email: string;
  guest_name: string | null;
}

interface FolderPermission {
  id: string;
  folder_id: string;
  user_id: string | null;
  guest_invite_id: string | null;
  permission_level: "view" | "edit";
  user?: {
    id: string;
    full_name: string;
  } | null;
}

interface FolderPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: {
    id: string;
    name: string;
    is_restricted: boolean;
    created_by: string;
  } | null;
  dataRoomId: string;
  organizationId: string;
  currentUserId: string;
}

export function FolderPermissionsDialog({
  open,
  onOpenChange,
  folder,
  dataRoomId,
  organizationId,
  currentUserId,
}: FolderPermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRestricted, setIsRestricted] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{ referenceId: string; permission: "view" | "edit"; type: "team" | "guest" }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data room members
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["data-room-members-for-folder-permissions", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_members")
        .select(`
          id,
          user_id,
          user:profiles!data_room_members_user_id_fkey(id, full_name)
        `)
        .eq("data_room_id", dataRoomId);
      
      if (error) throw error;
      return (data || []).filter((m: DataRoomMember) => m.user_id !== currentUserId) as DataRoomMember[];
    },
    enabled: open && !!dataRoomId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Fetch NDA-signed guests
  const { data: ndaGuests = [], isLoading: guestsLoading } = useQuery({
    queryKey: ["data-room-nda-guests-for-folder-permissions", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_invites")
        .select("id, email, guest_name")
        .eq("data_room_id", dataRoomId)
        .not("nda_signed_at", "is", null);
      
      if (error) throw error;
      return (data || []) as NdaSignedGuest[];
    },
    enabled: open && !!dataRoomId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Combine team members and guests for display
  const allMembers = [
    ...teamMembers.map(m => ({
      id: m.id,
      uniqueId: `team-${m.user_id}`,
      referenceId: m.user_id,
      name: m.user?.full_name || "Unknown",
      type: "team" as const,
    })),
    ...ndaGuests.map(g => ({
      id: g.id,
      uniqueId: `guest-${g.id}`,
      referenceId: g.id,
      name: g.guest_name || g.email,
      type: "guest" as const,
    })),
  ];

  // Fetch existing folder permissions
  const { data: existingPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["folder-permissions", folder?.id],
    queryFn: async () => {
      if (!folder?.id) return [];
      const { data, error } = await supabase
        .from("data_room_folder_permissions")
        .select(`
          id,
          folder_id,
          user_id,
          guest_invite_id,
          permission_level
        `)
        .eq("folder_id", folder.id);
      
      if (error) throw error;
      return (data || []) as FolderPermission[];
    },
    enabled: open && !!folder?.id,
  });

  // Initialize state when folder changes or dialog opens
  const folderId = folder?.id;
  const folderIsRestricted = folder?.is_restricted ?? false;
  const permissionsKey = existingPermissions?.map(p => `${p.user_id || p.guest_invite_id}:${p.permission_level}`).join(',') ?? '';
  
  useEffect(() => {
    if (!open) return;
    if (folderId) {
      setIsRestricted(folderIsRestricted);
    }
  }, [folderId, folderIsRestricted, open]);

  useEffect(() => {
    if (!open || !folderId) return;
    
    if (existingPermissions && existingPermissions.length > 0) {
      setSelectedUsers(
        existingPermissions.map((p) => ({
          referenceId: p.user_id || p.guest_invite_id || '',
          permission: p.permission_level as "view" | "edit",
          type: p.user_id ? "team" as const : "guest" as const,
        }))
      );
    } else {
      setSelectedUsers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId, open, permissionsKey]);

  // Update folder restriction toggle
  const updateFolderMutation = useMutation({
    mutationFn: async ({ folderId, isRestricted }: { folderId: string; isRestricted: boolean }) => {
      const { error } = await supabase
        .from("data_room_folders")
        .update({ is_restricted: isRestricted })
        .eq("id", folderId);
      
      if (error) throw error;
    },
  });

  // Save permissions
  const savePermissions = async () => {
    if (!folder) return;
    
    setIsSaving(true);
    try {
      // Update is_restricted flag
      await updateFolderMutation.mutateAsync({ folderId: folder.id, isRestricted });

      // If not restricted, remove all permissions
      if (!isRestricted) {
        const { error: deleteError } = await supabase
          .from("data_room_folder_permissions")
          .delete()
          .eq("folder_id", folder.id);
        
        if (deleteError) throw deleteError;
      } else {
        // Delete existing permissions
        const { error: deleteError } = await supabase
          .from("data_room_folder_permissions")
          .delete()
          .eq("folder_id", folder.id);
        
        if (deleteError) throw deleteError;

        // Insert new permissions
        if (selectedUsers.length > 0) {
          const teamPermissions = selectedUsers
            .filter(u => u.type === "team")
            .map(u => ({
              folder_id: folder.id,
              user_id: u.referenceId,
              guest_invite_id: null,
              permission_level: u.permission,
            }));
          
          const guestPermissions = selectedUsers
            .filter(u => u.type === "guest")
            .map(u => ({
              folder_id: folder.id,
              user_id: null,
              guest_invite_id: u.referenceId,
              permission_level: u.permission,
            }));
          
          const allPermissions = [...teamPermissions, ...guestPermissions];
          
          if (allPermissions.length > 0) {
            const { error: insertError } = await supabase
              .from("data_room_folder_permissions")
              .insert(allPermissions);
            
            if (insertError) throw insertError;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["data-room-all-folders", dataRoomId] });
      await queryClient.invalidateQueries({ queryKey: ["data-room-folder-permissions"] });
      await queryClient.invalidateQueries({ queryKey: ["folder-permissions", folder.id] });
      
      toast({
        title: "Permissions updated",
        description: isRestricted 
          ? `Folder access restricted to ${selectedUsers.length} member${selectedUsers.length !== 1 ? "s" : ""}`
          : "All members can now access this folder",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save permissions:", error);
      toast({
        title: "Failed to save permissions",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserPermission = (referenceId: string, type: "team" | "guest") => {
    setSelectedUsers((prev) => {
      const existing = prev.find((u) => u.referenceId === referenceId);
      if (existing) {
        return prev.filter((u) => u.referenceId !== referenceId);
      }
      return [...prev, { referenceId, permission: "view" as const, type }];
    });
  };

  const updateUserPermission = (referenceId: string, permission: "view" | "edit") => {
    setSelectedUsers((prev) =>
      prev.map((u) => (u.referenceId === referenceId ? { ...u, permission } : u))
    );
  };

  const isLoading = membersLoading || permissionsLoading || guestsLoading;
  const isOwner = folder?.created_by === currentUserId;

  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500" />
            Folder Permissions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder name */}
          <div className="text-sm text-muted-foreground truncate">
            {folder.name}
          </div>

          {/* Restriction toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="restrict-folder-access" className="cursor-pointer font-medium">
                Restrict Access
              </Label>
            </div>
            <Switch
              id="restrict-folder-access"
              checked={isRestricted}
              onCheckedChange={setIsRestricted}
              disabled={!isOwner}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {isRestricted
              ? "Only you and selected members can enter this folder and view its contents."
              : "All data room members can access this folder."}
          </p>

          {/* Member selection - only show when restricted */}
          {isRestricted && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Grant Access To</Label>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : allMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No other members in this data room.
                </p>
              ) : (
                <ScrollArea className="h-[200px] pr-3">
                  <div className="space-y-2">
                    {allMembers.map((member) => {
                      const userPermission = selectedUsers.find((u) => u.referenceId === member.referenceId);
                      const isSelected = !!userPermission;

                      return (
                        <div
                          key={member.uniqueId}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleUserPermission(member.referenceId, member.type)}
                            />
                            <div className="flex items-center gap-1.5 min-w-0">
                              {member.type === "guest" && (
                                <Mail className="w-3 h-3 text-primary flex-shrink-0" />
                              )}
                              <span className="text-sm truncate">{member.name}</span>
                              {member.type === "guest" && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-0 flex-shrink-0">
                                  Guest
                                </Badge>
                              )}
                            </div>
                          </label>

                          {isSelected && (
                            <Select
                              value={userPermission?.permission || "view"}
                              onValueChange={(value: "view" | "edit") =>
                                updateUserPermission(member.referenceId, value)
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
                                    <Edit2 className="w-3 h-3" />
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
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {selectedUsers.map((u) => {
                    const member = allMembers.find((m) => m.referenceId === u.referenceId);
                    return (
                      <Badge key={u.referenceId} variant="secondary" className="text-xs gap-1">
                        {member?.name || "Unknown"}
                        <span className="text-muted-foreground">
                          ({u.permission === "edit" ? "Edit" : "View"})
                        </span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => toggleUserPermission(u.referenceId, u.type)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!isOwner && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              Only the folder creator can modify permissions.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={savePermissions}
            disabled={isSaving || !isOwner}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
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
  );
}
