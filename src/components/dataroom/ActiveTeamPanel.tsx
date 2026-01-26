import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Users, CheckCircle, X, UserPlus, ChevronDown, Clock, UserPlus2, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Dispatch, SetStateAction, useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActiveTeamPanelProps {
  dataRoomId: string;
  organizationId: string;
  currentUserId: string;
  isOwner: boolean;
  createdBy?: string;
  inviteEmail?: string;
  setInviteEmail?: Dispatch<SetStateAction<string>>;
  inviteError?: string;
  setInviteError?: Dispatch<SetStateAction<string>>;
  onSendInvite?: () => void;
  isInviting?: boolean;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  user: {
    full_name: string;
    job_role: string | null;
  };
}

interface NdaSignedGuest {
  id: string;
  email: string;
  guest_name: string | null;
  nda_signed_at: string | null;
  access_id: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  created_at: string;
  status: string;
}

const ActiveTeamPanel = ({
  dataRoomId,
  organizationId,
  currentUserId,
  isOwner,
  createdBy,
  inviteEmail = "",
  setInviteEmail,
  inviteError = "",
  setInviteError,
  onSendInvite,
  isInviting = false,
}: ActiveTeamPanelProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const [invitingGuestId, setInvitingGuestId] = useState<string | null>(null);

  // Fetch internal members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["data-room-members", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_members")
        .select("id, user_id, role, created_at")
        .eq("data_room_id", dataRoomId);

      if (error) throw error;

      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, job_role")
        .in("id", userIds);

      // Fetch emails using edge function
      let emailMap: Record<string, string> = {};
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token && userIds.length > 0) {
          const { data: emailData, error: emailError } = await supabase.functions.invoke("get-member-emails", {
            body: { userIds, organizationId },
          });
          if (!emailError && emailData?.emails) {
            emailMap = emailData.emails;
          }
        }
      } catch (e) {
        console.warn("Could not fetch member emails:", e);
      }

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      return data.map((m) => ({
        ...m,
        email: emailMap[m.user_id] || undefined,
        user: profileMap.get(m.user_id) || { full_name: "Unknown", job_role: null },
      })) as Member[];
    },
    enabled: !!dataRoomId,
  });

  // Fetch NDA-signed guests (accepted invites with NDA signed)
  const { data: ndaSignedGuests = [], isLoading: guestsLoading } = useQuery({
    queryKey: ["data-room-nda-guests", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_invites")
        .select("id, email, guest_name, nda_signed_at, access_id")
        .eq("data_room_id", dataRoomId)
        .not("nda_signed_at", "is", null)
        .order("nda_signed_at", { ascending: false });

      if (error) throw error;
      return data as NdaSignedGuest[];
    },
    enabled: !!dataRoomId,
  });

  // Fetch pending invites (not yet signed NDA) - only for owner
  const { data: pendingInvites = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["data-room-pending-invites", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_invites")
        .select("id, email, created_at, status")
        .eq("data_room_id", dataRoomId)
        .is("nda_signed_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingInvite[];
    },
    enabled: !!dataRoomId && isOwner,
  });

  // Fetch creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ["data-room-creator", createdBy],
    queryFn: async () => {
      if (!createdBy) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, job_role")
        .eq("id", createdBy)
        .maybeSingle();

      if (error) throw error;
      return data as { id: string; full_name: string; job_role: string | null } | null;
    },
    enabled: !!createdBy,
  });

  // Fetch team members for add dropdown
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-for-dataroom", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, job_role")
        .eq("organization_id", organizationId)
        .neq("id", currentUserId);

      if (error) throw error;
      return data as { id: string; full_name: string; job_role: string | null }[];
    },
    enabled: !!organizationId,
  });

  const availableMembers = teamMembers.filter(
    (m) => !members.some((existing) => existing.user_id === m.id)
  );

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("data_room_members").insert({
        data_room_id: dataRoomId,
        user_id: userId,
        organization_id: organizationId,
        role: "member",
        added_by: currentUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-room-members"] });
      toast({ title: "Member added", description: "Team member added to the data room." });
    },
    onError: (error) => {
      toast({ title: "Failed to add member", description: error.message, variant: "destructive" });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("data_room_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-room-members"] });
      toast({ title: "Member removed", description: "The member has been removed from the data room." });
    },
    onError: (error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  // Revoke invite mutation (works for both pending and NDA-signed guests)
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.from("data_room_invites").delete().eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-room-pending-invites"] });
      queryClient.invalidateQueries({ queryKey: ["data-room-nda-guests"] });
      toast({ title: "Access revoked", description: "The guest's access has been revoked from this data room." });
    },
    onError: (error) => {
      toast({ title: "Failed to revoke access", description: error.message, variant: "destructive" });
    },
  });

  // Invite guest to team mutation
  const inviteToTeamMutation = useMutation({
    mutationFn: async (guest: NdaSignedGuest) => {
      if (!organization) throw new Error("Organization not found");
      
      const { data, error } = await supabase.functions.invoke("send-invite", {
        body: {
          email: guest.email,
          role: "viewer",
          organizationId: organizationId,
          organizationName: organization.name,
          fullName: guest.guest_name || "Team Member",
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, guest) => {
      setInvitingGuestId(null);
      toast({ 
        title: "Invitation sent", 
        description: `${guest.guest_name || guest.email} has been invited to join your organization.` 
      });
    },
    onError: (error) => {
      setInvitingGuestId(null);
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const handleInviteToTeam = (guest: NdaSignedGuest) => {
    setInvitingGuestId(guest.id);
    inviteToTeamMutation.mutate(guest);
  };

  const isLoading = membersLoading || guestsLoading || (isOwner && pendingLoading);
  
  // Check if creator is already in the members list
  const isCreatorInMembers = createdBy && members.some(m => m.user_id === createdBy);
  const totalActive = members.length + ndaSignedGuests.length + (creatorProfile && !isCreatorInMembers ? 1 : 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {/* Action Sections for Owner */}
      {isOwner && (onSendInvite || availableMembers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Invite Guest Section */}
          {onSendInvite && setInviteEmail && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold">Invite External Guest</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Invite guests to view documents. They'll need to sign the NDA.
              </p>
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="guest@example.com" 
                  value={inviteEmail} 
                  className="h-10 text-sm bg-background/60 border-border/50 focus:border-emerald-500/50" 
                  onChange={e => {
                    setInviteEmail(e.target.value);
                    setInviteError?.("");
                  }} 
                />
                <Button 
                  size="sm" 
                  className="bg-emerald-500 hover:bg-emerald-600 h-10 px-4 shrink-0 shadow-sm" 
                  onClick={onSendInvite} 
                  disabled={isInviting}
                >
                  {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                </Button>
              </div>
              {inviteError && <p className="text-xs text-destructive mt-2">{inviteError}</p>}
            </div>
          )}

          {/* Add Team Member Section */}
          {availableMembers.length > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Add Team Member</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Add colleagues from your organization to collaborate.
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full h-10 text-sm justify-between bg-background/60 border-border/50 hover:border-primary/50">
                    <span className="text-muted-foreground">Select team member...</span>
                    <ChevronDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[calc(100%-2rem)] min-w-[280px] bg-popover z-50">
                  {availableMembers.map((member) => (
                    <DropdownMenuItem
                      key={member.id}
                      onClick={() => addMemberMutation.mutate(member.id)}
                      className="cursor-pointer py-2.5 px-3"
                    >
                      <Avatar className="w-9 h-9 mr-3">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                          {member.full_name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.full_name}</p>
                        {member.job_role && (
                          <p className="text-xs text-muted-foreground truncate">{member.job_role}</p>
                        )}
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      )}

      {/* Active Members Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold">
            {totalActive} Active {totalActive === 1 ? "Member" : "Members"}
          </h3>
        </div>

        {totalActive === 0 ? (
          <div className="text-center py-12 rounded-xl bg-muted/30 border border-dashed border-border">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No active team members yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add team members or invite guests to collaborate</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Creator - shown first if not already in members list */}
            {creatorProfile && !isCreatorInMembers && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-primary/30 hover:border-primary/50 transition-colors">
                <Avatar className="w-11 h-11 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {creatorProfile.full_name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{creatorProfile.full_name}</p>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0 shrink-0 gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      Owner
                    </Badge>
                  </div>
                  {creatorProfile.job_role && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                      {creatorProfile.job_role}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Internal Team Members */}
            {members.length > 0 && (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border transition-colors group"
                  >
                    <Avatar className="w-11 h-11 ring-2 ring-emerald-500/20">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 text-sm font-semibold">
                        {member.user?.full_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{member.user?.full_name}</p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-0 shrink-0">
                          Team
                        </Badge>
                      </div>
                      {member.email && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
                      )}
                      {member.user?.job_role && (
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                          {member.user.job_role}
                        </p>
                      )}
                    </div>
                    {isOwner && member.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* NDA-Signed Guests */}
            {ndaSignedGuests.length > 0 && (
              <div className="space-y-2">
                {members.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2 px-1">External Guests</p>
                )}
                {ndaSignedGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-border transition-colors group"
                  >
                    <div className="w-11 h-11 rounded-full bg-blue-500/10 ring-2 ring-blue-500/20 flex items-center justify-center">
                      <Mail className="w-4.5 h-4.5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {guest.guest_name || guest.email}
                        </p>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-500/10 text-blue-600 border-0 shrink-0">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                          NDA Signed
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{guest.email}</p>
                      {guest.nda_signed_at && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          Signed {format(new Date(guest.nda_signed_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-1 shrink-0">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleInviteToTeam(guest)}
                                disabled={invitingGuestId === guest.id}
                              >
                                {invitingGuestId === guest.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <UserPlus2 className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Invite to Team</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => revokeInviteMutation.mutate(guest.id)}
                                disabled={revokeInviteMutation.isPending}
                              >
                                {revokeInviteMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Revoke Access</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Invites Section - Only visible to owner */}
      {isOwner && pendingInvites.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h3 className="text-sm font-semibold text-muted-foreground">
              {pendingInvites.length} Pending {pendingInvites.length === 1 ? "Invite" : "Invites"}
            </h3>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/30 transition-colors group"
              >
                <div className="w-11 h-11 rounded-full bg-amber-500/10 ring-2 ring-amber-500/20 flex items-center justify-center">
                  <Mail className="w-4.5 h-4.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{invite.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-500/10 text-amber-600 border-0">
                      <Clock className="w-2.5 h-2.5 mr-0.5" />
                      Awaiting NDA
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Invited {format(new Date(invite.created_at), "MMM d")}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => revokeInviteMutation.mutate(invite.id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveTeamPanel;