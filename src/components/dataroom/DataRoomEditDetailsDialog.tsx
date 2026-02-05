import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Folder,
  FolderPlus,
  Lock,
  Users,
  X,
  File,
  Globe,
  Eye,
  Edit2,
} from "lucide-react";

interface DataRoomFolder {
  id: string;
  name: string;
}

interface DataRoomMember {
  id: string;
  full_name: string;
  email?: string;
}

interface DataRoomGuest {
  id: string;
  guest_name: string | null;
  email: string;
}

interface FilePermission {
  user_id: string | null;
  guest_invite_id: string | null;
  permission_level: "view" | "edit";
}

interface DataRoomEditDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    name: string;
    folder_id: string | null;
    is_restricted?: boolean;
    assigned_to?: string | null;
    assigned_guest_id?: string | null;
  } | null;
  folders: DataRoomFolder[];
  members: DataRoomMember[];
  guests?: DataRoomGuest[];
  existingPermissions?: FilePermission[];
  currentUserId?: string;
  dataRoomCreatorId?: string;
  onSave: (data: {
    folder_id: string | null;
    is_restricted: boolean;
    assigned_to: string | null;
    assigned_guest_id: string | null;
    permissions: { referenceId: string; permission: "view" | "edit"; type: "team" | "guest" }[];
  }) => void;
  isSaving?: boolean;
}

export function DataRoomEditDetailsDialog({
  open,
  onOpenChange,
  file,
  folders,
  members,
  guests = [],
  existingPermissions = [],
  currentUserId,
  dataRoomCreatorId,
  onSave,
  isSaving = false,
}: DataRoomEditDetailsDialogProps) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [assignedGuests, setAssignedGuests] = useState<string[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<{ referenceId: string; permission: "view" | "edit"; type: "team" | "guest" }[]>([]);

  // Filter guests to only show those who have signed NDA (active invites with guest_name)
  const activeGuests = guests.filter(g => g.guest_name);

  // Build combined members list for permission selection (excluding current user)
  // Note: Only team members are supported for file restrictions in the current schema
  const allSelectableMembers = [
    ...members
      .filter(m => m.id !== currentUserId)
      .map(m => ({
        id: m.id,
        uniqueId: `team-${m.id}`,
        referenceId: m.id,
        name: m.full_name,
        type: "team" as const,
        isCreator: m.id === dataRoomCreatorId,
      })),
  ];

  // Reset form when file changes
  useEffect(() => {
    if (file && open) {
      setFolderId(file.folder_id);
      setIsRestricted(file.is_restricted || false);
      setAssignedUsers(file.assigned_to ? [file.assigned_to] : []);
      setAssignedGuests(file.assigned_guest_id ? [file.assigned_guest_id] : []);
      
      // Initialize permissions from existing
      if (existingPermissions && existingPermissions.length > 0) {
        setSelectedPermissions(
          existingPermissions.map(p => ({
            referenceId: p.user_id || p.guest_invite_id || '',
            permission: p.permission_level,
            type: p.user_id ? "team" as const : "guest" as const,
          }))
        );
      } else {
        setSelectedPermissions([]);
      }
    }
  }, [file, open, existingPermissions]);

  const handleSave = () => {
    onSave({
      folder_id: folderId,
      is_restricted: isRestricted,
      assigned_to: assignedUsers.length > 0 ? assignedUsers[0] : null,
      assigned_guest_id: assignedGuests.length > 0 ? assignedGuests[0] : null,
      permissions: isRestricted ? selectedPermissions : [],
    });
  };

  const toggleUser = (userId: string) => {
    setAssignedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleGuest = (guestId: string) => {
    setAssignedGuests((prev) =>
      prev.includes(guestId)
        ? prev.filter((id) => id !== guestId)
        : [...prev, guestId]
    );
  };

  const togglePermissionUser = (referenceId: string, type: "team" | "guest") => {
    setSelectedPermissions((prev) => {
      const existing = prev.find((u) => u.referenceId === referenceId);
      if (existing) {
        return prev.filter((u) => u.referenceId !== referenceId);
      }
      return [...prev, { referenceId, permission: "edit" as const, type }];
    });
  };

  const updatePermissionLevel = (referenceId: string, permission: "view" | "edit") => {
    setSelectedPermissions((prev) =>
      prev.map((u) => (u.referenceId === referenceId ? { ...u, permission } : u))
    );
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Details</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Selected File Display */}
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-lg bg-muted/30">
            <FileText className="w-10 h-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">1 file(s) selected</p>
            <Badge variant="secondary" className="mt-2 max-w-full">
              <span className="truncate">{file.name}</span>
            </Badge>
          </div>

          {/* Destination Folder */}
          <div>
            <Label className="font-medium">Destination Folder</Label>
            <div className="flex gap-2 mt-2">
              <Select
                value={folderId || "uncategorized"}
                onValueChange={(val) =>
                  setFolderId(val === "uncategorized" ? null : val)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">
                    <div className="flex items-center gap-2">
                      <File className="w-4 h-4" />
                      My Files (No folder)
                    </div>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4 text-orange-400" />
                        {folder.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" title="Create new folder" disabled>
                <FolderPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Restrict Access */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Restrict Access</Label>
              </div>
              <Switch
                checked={isRestricted}
                onCheckedChange={setIsRestricted}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {isRestricted
                ? "Only you and selected members can view this file."
                : "All Data Room members can view this file."}
            </p>

            {/* User selection when restricted */}
            {isRestricted && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Grant Access To</Label>
                </div>

                {allSelectableMembers.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No other members in this data room.
                  </p>
                ) : (
                  <ScrollArea className="h-[160px] pr-3">
                    <div className="space-y-2">
                      {allSelectableMembers.map((member) => {
                        const userPermission = selectedPermissions.find((u) => u.referenceId === member.referenceId);
                        const isSelected = !!userPermission;

                        return (
                          <div
                            key={member.uniqueId}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => togglePermissionUser(member.referenceId, member.type)}
                              />
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm truncate">{member.name}</span>
                                {member.isCreator && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-primary/10 text-primary border-0 flex-shrink-0">
                                    Owner
                                  </Badge>
                                )}
                              </div>
                            </label>

                            {isSelected && (
                              <Select
                                value={userPermission?.permission || "edit"}
                                onValueChange={(value: "view" | "edit") =>
                                  updatePermissionLevel(member.referenceId, value)
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

                {/* Selected count */}
                {selectedPermissions.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPermissions.length} member{selectedPermissions.length !== 1 ? "s" : ""} will have access
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Assign Users - Only show when NOT restricted */}
          {!isRestricted && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Assign To (for review)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Assign this document to Data Room members or guests for review.
              </p>
              
              {/* Internal Members Section */}
              {members.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Team Members</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {members.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={assignedUsers.includes(member.id)}
                          onCheckedChange={() => toggleUser(member.id)}
                        />
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{member.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* External Guests Section */}
              {activeGuests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">External Guests</p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {activeGuests.map((guest) => (
                      <label
                        key={guest.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded"
                      >
                        <Checkbox
                          checked={assignedGuests.includes(guest.id)}
                          onCheckedChange={() => toggleGuest(guest.id)}
                        />
                        <Globe className="w-3 h-3 text-primary" />
                        <span>{guest.guest_name || guest.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {members.length === 0 && activeGuests.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No team members or guests available
                </p>
              )}

              {/* Selected badges */}
              {(assignedUsers.length > 0 || assignedGuests.length > 0) && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {assignedUsers.map((userId) => {
                    const member = members.find((m) => m.id === userId);
                    return (
                      <Badge key={userId} variant="secondary" className="text-xs gap-1">
                        {member?.full_name}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => toggleUser(userId)}
                        />
                      </Badge>
                    );
                  })}
                  {assignedGuests.map((guestId) => {
                    const guest = activeGuests.find((g) => g.id === guestId);
                    return (
                      <Badge key={guestId} variant="outline" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                        <Globe className="w-3 h-3" />
                        {guest?.guest_name || guest?.email}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => toggleGuest(guestId)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            onClick={handleSave}
            disabled={isSaving}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DataRoomEditDetailsDialog;
