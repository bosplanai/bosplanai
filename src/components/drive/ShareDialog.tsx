import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, Link, UserPlus, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  full_name: string;
}

interface FileShare {
  id: string;
  shared_with: string | null;
  permission: string;
  is_link_share: boolean;
  share_token: string;
  shared_with_profile?: { full_name: string } | null;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
  organizationId: string;
  userId: string;
  teamMembers: TeamMember[];
}

const PERMISSION_OPTIONS = [
  { value: "view", label: "Can View" },
  { value: "edit", label: "Can Edit" },
  { value: "manage", label: "Can Manage" },
];

export function ShareDialog({
  open,
  onOpenChange,
  fileId,
  fileName,
  organizationId,
  userId,
  teamMembers,
}: ShareDialogProps) {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [permission, setPermission] = useState<string>("view");
  const [linkShareEnabled, setLinkShareEnabled] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch existing shares for this file
  const { data: shares = [] } = useQuery({
    queryKey: ["file-shares", fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drive_file_shares")
        .select(`
          id,
          shared_with,
          permission,
          is_link_share,
          share_token
        `)
        .eq("file_id", fileId);

      if (error) throw error;

      // Get profile names for shared_with users
      const sharesWithProfiles = await Promise.all(
        (data || []).map(async (share) => {
          if (share.shared_with) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", share.shared_with)
              .single();
            return { ...share, shared_with_profile: profile };
          }
          return { ...share, shared_with_profile: null };
        })
      );

      return sharesWithProfiles as FileShare[];
    },
    enabled: open && !!fileId,
  });

  // Get link share if exists
  const linkShare = shares.find((s) => s.is_link_share);

  // Add share mutation
  const addShareMutation = useMutation({
    mutationFn: async ({ memberId, perm }: { memberId: string; perm: string }) => {
      const { error } = await supabase.from("drive_file_shares").insert({
        file_id: fileId,
        organization_id: organizationId,
        shared_by: userId,
        shared_with: memberId,
        permission: perm,
        is_link_share: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file-shares", fileId] });
      queryClient.invalidateQueries({ queryKey: ["all-file-shares"] });
      setSelectedMember("");
      toast.success("File shared successfully");
    },
    onError: () => toast.error("Failed to share file"),
  });

  // Create link share mutation
  const createLinkShareMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("drive_file_shares").insert({
        file_id: fileId,
        organization_id: organizationId,
        shared_by: userId,
        permission: "view",
        is_link_share: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file-shares", fileId] });
      queryClient.invalidateQueries({ queryKey: ["all-file-shares"] });
      setLinkShareEnabled(true);
      toast.success("Share link created");
    },
    onError: () => toast.error("Failed to create share link"),
  });

  // Remove share mutation
  const removeShareMutation = useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await supabase
        .from("drive_file_shares")
        .delete()
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file-shares", fileId] });
      queryClient.invalidateQueries({ queryKey: ["all-file-shares"] });
      toast.success("Share removed");
    },
    onError: () => toast.error("Failed to remove share"),
  });

  // Update share permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ shareId, perm }: { shareId: string; perm: string }) => {
      const { error } = await supabase
        .from("drive_file_shares")
        .update({ permission: perm })
        .eq("id", shareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["file-shares", fileId] });
      queryClient.invalidateQueries({ queryKey: ["all-file-shares"] });
    },
  });

  const handleAddMember = () => {
    if (selectedMember) {
      addShareMutation.mutate({ memberId: selectedMember, perm: permission });
    }
  };

  const handleToggleLinkShare = () => {
    if (!linkShare && !linkShareEnabled) {
      createLinkShareMutation.mutate();
    } else if (linkShare) {
      removeShareMutation.mutate(linkShare.id);
      setLinkShareEnabled(false);
    }
  };

  const copyShareLink = () => {
    if (linkShare) {
      const link = `${window.location.origin}/shared/${linkShare.share_token}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success("Link copied to clipboard");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sharedMemberIds = shares
    .filter((s) => !s.is_link_share && s.shared_with)
    .map((s) => s.shared_with);

  const availableMembers = teamMembers.filter(
    (m) => m.id !== userId && !sharedMemberIds.includes(m.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Share "{fileName}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Link sharing section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-muted-foreground" />
                <Label>Share via link</Label>
              </div>
              <Switch
                checked={!!linkShare || linkShareEnabled}
                onCheckedChange={handleToggleLinkShare}
              />
            </div>

            {(linkShare || linkShareEnabled) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={
                      linkShare
                        ? `${window.location.origin}/shared/${linkShare.share_token}`
                        : "Generating..."
                    }
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyShareLink}
                    disabled={!linkShare}
                  >
                    {linkCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only members of your organization can access this link.
                </p>
              </div>
            )}
          </div>

          {/* Share with team members section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-muted-foreground" />
              <Label>Share with team members</Label>
            </div>

            {/* Add new member */}
            {availableMembers.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMISSION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  onClick={handleAddMember}
                  disabled={!selectedMember || addShareMutation.isPending}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Shared members list */}
            {shares.filter((s) => !s.is_link_share && s.shared_with).length > 0 && (
              <div className="space-y-2">
                {shares
                  .filter((s) => !s.is_link_share && s.shared_with)
                  .map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(share.shared_with_profile?.full_name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {share.shared_with_profile?.full_name || "Unknown"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={share.permission}
                          onValueChange={(perm) =>
                            updatePermissionMutation.mutate({ shareId: share.id, perm })
                          }
                        >
                          <SelectTrigger className="w-[110px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeShareMutation.mutate(share.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {availableMembers.length === 0 && shares.filter((s) => !s.is_link_share).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No team members available to share with.
              </p>
            )}
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
