import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, X, Loader2, Mail, Clock, CheckCircle, XCircle, ChevronDown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface DataRoomMembersProps {
  dataRoomId: string;
  organizationId: string;
  currentUserId: string;
  isOwner: boolean;
}
interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user: {
    full_name: string;
    job_role: string | null;
  };
}
interface Invite {
  id: string;
  email: string;
  status: string;
  nda_signed_at: string | null;
  access_id: string | null;
  created_at: string;
}
const DataRoomMembers = ({
  dataRoomId,
  organizationId,
  currentUserId,
  isOwner
}: DataRoomMembersProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch internal members
  const {
    data: members = [],
    isLoading: membersLoading
  } = useQuery({
    queryKey: ["data-room-members", dataRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("data_room_members").select("id, user_id, role, created_at").eq("data_room_id", dataRoomId);
      if (error) throw error;

      // Fetch user profiles separately
      const userIds = data.map(m => m.user_id);
      const {
        data: profiles
      } = await supabase.from("profiles").select("id, full_name, job_role").in("id", userIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return data.map(m => ({
        ...m,
        user: profileMap.get(m.user_id) || {
          full_name: "Unknown",
          job_role: null
        }
      })) as Member[];
    },
    enabled: !!dataRoomId
  });

  // Fetch team members from organization for dropdown via user_roles (supports multi-org users)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members-for-dataroom", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles:user_id (
            id,
            full_name,
            job_role
          )
        `)
        .eq("organization_id", organizationId)
        .neq("user_id", currentUserId);

      if (error) throw error;
      
      // Extract unique profiles from user_roles
      return (data || [])
        .filter((r: any) => r.profiles)
        .map((r: any) => ({
          id: r.profiles.id,
          full_name: r.profiles.full_name,
          job_role: r.profiles.job_role,
        })) as { id: string; full_name: string; job_role: string | null }[];
    },
    enabled: !!organizationId,
  });

  // Filter out already added members
  const availableMembers = teamMembers.filter(
    (m) => !members.some((existing) => existing.user_id === m.id)
  );

  // Fetch external invites
  const {
    data: invites = [],
    isLoading: invitesLoading
  } = useQuery({
    queryKey: ["data-room-invites", dataRoomId],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("data_room_invites").select("id, email, status, nda_signed_at, access_id, created_at").eq("data_room_id", dataRoomId).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data as Invite[];
    },
    enabled: !!dataRoomId
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const {
        error
      } = await supabase.from("data_room_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["data-room-members"]
      });
      toast({
        title: "Member removed",
        description: "The member has been removed from the data room."
      });
    },
    onError: error => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("data_room_members")
        .insert({
          data_room_id: dataRoomId,
          user_id: userId,
          role: "member",
         created_by: currentUserId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-room-members"] });
      toast({
        title: "Member added",
        description: "Team member added to the data room.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Revoke invite mutation
  const revokeInviteMutation = useMutation({
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
        title: "Invite revoked",
        description: "The invitation has been revoked."
      });
    },
    onError: error => {
      toast({
        title: "Failed to revoke invite",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  const getStatusBadge = (invite: Invite) => {
    if (invite.status === "accepted") {
      return <Badge variant="default" className="bg-emerald-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </Badge>;
    }
    if (invite.nda_signed_at) {
      return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          NDA Signed
        </Badge>;
    }
    if (invite.status === "pending") {
      return <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>;
    }
    return <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        {invite.status}
      </Badge>;
  };
  const isLoading = membersLoading || invitesLoading;
  return <>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={availableMembers.length === 0}>
                <UserPlus className="w-4 h-4 mr-1" />
                Add
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {availableMembers.length === 0 ? (
                  <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    No more team members to add
                  </div>
                ) : (
                  availableMembers.map((member) => (
                    <DropdownMenuItem
                      key={member.id}
                      onClick={() => addMemberMutation.mutate(member.id)}
                      className="cursor-pointer"
                    >
                      <Avatar className="w-6 h-6 mr-2">
                        <AvatarFallback className="text-xs">
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
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>

        {isLoading ? <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div> : <div className="space-y-4">
            {/* Internal Members */}
            {members.length > 0 && <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Team Members
                </p>
                <div className="space-y-2">
                  {members.map(member => <div key={member.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {member.user?.full_name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.user?.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user?.job_role || member.role}
                          </p>
                        </div>
                      </div>
                      {member.user_id !== currentUserId && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeMemberMutation.mutate(member.id)}>
                          <X className="w-4 h-4" />
                        </Button>}
                    </div>)}
                </div>
              </div>}

            {/* External Invites */}
            {invites.length > 0 && <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  External Guests
                </p>
                <div className="space-y-2">
                  {invites.map(invite => <div key={invite.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">
                            {invite.email}
                          </p>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(invite)}
                            {invite.access_id && <span className="text-[10px] text-muted-foreground font-mono">
                                ID: {invite.access_id}
                              </span>}
                          </div>
                        </div>
                      </div>
                      {invite.status === "pending" && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => revokeInviteMutation.mutate(invite.id)}>
                          <X className="w-4 h-4" />
                        </Button>}
                    </div>)}
                </div>
              </div>}

            {members.length === 0 && invites.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">
                No internal team members yet
              </p>}
          </div>}
      </Card>
    </>;
};
export default DataRoomMembers;