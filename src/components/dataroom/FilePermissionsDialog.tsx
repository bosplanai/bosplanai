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
import { Lock, Users, Eye, Edit2, Loader2, X, Mail } from "lucide-react";
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

interface FilePermission {
  id: string;
  file_id: string;
  user_id: string | null;
  guest_invite_id: string | null;
  permission_level: "view" | "edit";
  user?: {
    id: string;
    full_name: string;
  } | null;
}

interface FilePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    name: string;
    is_restricted: boolean;
    uploaded_by: string;
  } | null;
  dataRoomId: string;
  organizationId: string;
  currentUserId: string;
  dataRoomCreatorId: string;
}

export function FilePermissionsDialog({
  open,
  onOpenChange,
  file,
  dataRoomId,
  organizationId,
  currentUserId,
  dataRoomCreatorId,
}: FilePermissionsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRestricted, setIsRestricted] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{ referenceId: string; permission: "view" | "edit"; type: "team" | "guest" }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data room members - refetch when dialog opens to get latest members
  // Include all members (including data room creator) except the current user
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["data-room-members-for-permissions", dataRoomId],
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
      // Show all members except the current user (they always have access to their own files)
      return (data || []).filter((m: DataRoomMember) => m.user_id !== currentUserId) as DataRoomMember[];
    },
    enabled: open && !!dataRoomId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Fetch data room creator's profile if they're not already in team members
  const { data: creatorProfile } = useQuery({
    queryKey: ["data-room-creator-profile", dataRoomCreatorId],
    queryFn: async () => {
      if (!dataRoomCreatorId || dataRoomCreatorId === currentUserId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", dataRoomCreatorId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: open && !!dataRoomCreatorId && dataRoomCreatorId !== currentUserId,
  });

  // Fetch NDA-signed guests
  const { data: ndaGuests = [], isLoading: guestsLoading } = useQuery({
    queryKey: ["data-room-nda-guests-for-permissions", dataRoomId],
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

  // Combine team members, data room creator, and guests for display
  const allMembers = (() => {
    const members: Array<{
      id: string;
      uniqueId: string;
      referenceId: string;
      name: string;
      type: "team" | "guest";
      isCreator?: boolean;
    }> = [];

    // Add data room creator first if not the current user and not already in team members
    const creatorInTeam = teamMembers.some(m => m.user_id === dataRoomCreatorId);
    if (creatorProfile && !creatorInTeam && dataRoomCreatorId !== currentUserId) {
      members.push({
        id: `creator-${dataRoomCreatorId}`,
        uniqueId: `team-${dataRoomCreatorId}`,
        referenceId: dataRoomCreatorId,
        name: creatorProfile.full_name || "Data Room Owner",
        type: "team" as const,
        isCreator: true,
      });
    }

    // Add team members
    members.push(...teamMembers.map(m => ({
      id: m.id,
      uniqueId: `team-${m.user_id}`,
      referenceId: m.user_id,
      name: m.user?.full_name || "Unknown",
      type: "team" as const,
      isCreator: m.user_id === dataRoomCreatorId,
    })));

    // Add NDA-signed guests
    members.push(...ndaGuests.map(g => ({
      id: g.id,
      uniqueId: `guest-${g.id}`,
      referenceId: g.id,
      name: g.guest_name || g.email,
      type: "guest" as const,
    })));

    return members;
  })();

  // Fetch existing file permissions (including guest_invite_id now)
  const { data: existingPermissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ["file-permissions", file?.id],
    queryFn: async () => {
      if (!file?.id) return [];
      const { data, error } = await supabase
        .from("data_room_file_permissions")
        .select(`
          id,
          file_id,
          user_id,
          guest_invite_id,
          permission_level,
          user:profiles!data_room_file_permissions_user_id_fkey(id, full_name)
        `)
        .eq("file_id", file.id);
      
      if (error) throw error;
      return (data || []) as FilePermission[];
    },
    enabled: open && !!file?.id,
  });

  // Initialize state when file changes or dialog opens
  const fileId = file?.id;
  const fileIsRestricted = file?.is_restricted ?? false;
  
  // Track previous values to prevent unnecessary updates
  const permissionsKey = existingPermissions?.map(p => `${p.user_id || p.guest_invite_id}:${p.permission_level}`).join(',') ?? '';
  
  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      return;
    }
    
    if (fileId) {
      setIsRestricted(fileIsRestricted);
    }
  }, [fileId, fileIsRestricted, open]);

  useEffect(() => {
    if (!open || !fileId) {
      return;
    }
    
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
  }, [fileId, open, permissionsKey]);

  // Update file restriction toggle
  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, isRestricted }: { fileId: string; isRestricted: boolean }) => {
      const { error } = await supabase
        .from("data_room_files")
        .update({ is_restricted: isRestricted })
        .eq("id", fileId);
      
      if (error) throw error;
    },
  });

  // Save permissions
  const savePermissions = async () => {
    if (!file) return;
    
    setIsSaving(true);
    try {
      // Update is_restricted flag
      await updateFileMutation.mutateAsync({ fileId: file.id, isRestricted });

      // If not restricted, remove all permissions
      if (!isRestricted) {
        const { error: deleteError } = await supabase
          .from("data_room_file_permissions")
          .delete()
          .eq("file_id", file.id);
        
        if (deleteError) throw deleteError;
      } else {
        // Delete existing permissions
        const { error: deleteError } = await supabase
          .from("data_room_file_permissions")
          .delete()
          .eq("file_id", file.id);
        
        if (deleteError) throw deleteError;

        // Insert new permissions - separate team members and guests
        if (selectedUsers.length > 0) {
          const teamPermissions = selectedUsers
            .filter(u => u.type === "team")
            .map(u => ({
              file_id: file.id,
              user_id: u.referenceId,
              guest_invite_id: null,
              permission_level: u.permission,
            }));
          
          const guestPermissions = selectedUsers
            .filter(u => u.type === "guest")
            .map(u => ({
              file_id: file.id,
              user_id: null,
              guest_invite_id: u.referenceId,
              permission_level: u.permission,
            }));
          
          const allPermissions = [...teamPermissions, ...guestPermissions];
          
          if (allPermissions.length > 0) {
            const { error: insertError } = await supabase
              .from("data_room_file_permissions")
              .insert(allPermissions);
            
            if (insertError) throw insertError;
          }
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["data-room-files"] });
      await queryClient.invalidateQueries({ queryKey: ["file-permissions", file.id] });
      
      toast({
        title: "Permissions updated",
        description: isRestricted 
          ? `Access restricted to ${selectedUsers.length} member${selectedUsers.length !== 1 ? "s" : ""}`
          : "All members can now access this file",
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
  // User can manage permissions if they uploaded the file OR if they're the data room creator
  const isFileOwner = file?.uploaded_by === currentUserId;
  const isDataRoomOwner = currentUserId === dataRoomCreatorId;
  const canManagePermissions = isFileOwner || isDataRoomOwner;

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            File Permissions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File name */}
          <div className="text-sm text-muted-foreground truncate">
            {file.name}
          </div>

          {/* Restriction toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="restrict-access" className="cursor-pointer font-medium">
                Restrict Access
              </Label>
            </div>
            <Switch
              id="restrict-access"
              checked={isRestricted}
              onCheckedChange={setIsRestricted}
              disabled={!canManagePermissions}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {isRestricted
              ? "Only you and selected members can access this file."
              : "All data room members can view and edit this file."}
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
                              {member.isCreator && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-emerald-500/10 text-emerald-600 border-0 flex-shrink-0">
                                  Owner
                                </Badge>
                              )}
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

          {!canManagePermissions && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              Only the file uploader or data room owner can modify permissions.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={savePermissions}
            disabled={isSaving || !canManagePermissions}
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