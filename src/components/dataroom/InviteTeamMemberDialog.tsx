import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataRoomId: string;
  organizationId: string;
  currentUserId: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  job_role: string | null;
}

const InviteTeamMemberDialog = ({
  open,
  onOpenChange,
  dataRoomId,
  organizationId,
  currentUserId,
}: InviteTeamMemberDialogProps) => {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch team members from organization via user_roles (supports multi-org users)
  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
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
      const members: TeamMember[] = (data || [])
        .filter((r: any) => r.profiles)
        .map((r: any) => ({
          id: r.profiles.id,
          full_name: r.profiles.full_name,
          job_role: r.profiles.job_role,
        }));
      
      return members;
    },
    enabled: open && !!organizationId,
  });

  // Fetch existing members
  const { data: existingMembers = [] } = useQuery({
    queryKey: ["data-room-members", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_members")
        .select("user_id")
        .eq("data_room_id", dataRoomId);

      if (error) throw error;
      return data.map((m) => m.user_id);
    },
    enabled: open && !!dataRoomId,
  });

  // Filter out already added members
  const availableMembers = teamMembers.filter(
    (m) => !existingMembers.includes(m.id)
  );

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const inserts = memberIds.map((userId) => ({
        data_room_id: dataRoomId,
        user_id: userId,
        role: "member",
        created_by: currentUserId,
      }));

      const { error } = await supabase
        .from("data_room_members")
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-room-members"] });
      toast({
        title: "Members added",
        description: `${selectedMembers.length} team member${selectedMembers.length > 1 ? "s" : ""} added to the data room.`,
      });
      setSelectedMembers([]);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to add members",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleAdd = () => {
    if (selectedMembers.length === 0) return;
    addMembersMutation.mutate(selectedMembers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Add Team Members
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Label className="text-sm text-muted-foreground">
            Select team members to add to this data room
          </Label>

          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : availableMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No more team members to add</p>
            </div>
          ) : (
            <ScrollArea className="h-[250px] mt-4">
              <div className="space-y-2">
                {availableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => toggleMember(member.id)}
                  >
                    <Checkbox
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => toggleMember(member.id)}
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {member.full_name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.full_name}
                      </p>
                      {member.job_role && (
                        <p className="text-xs text-muted-foreground truncate">
                          {member.job_role}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selectedMembers.length === 0 || addMembersMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {addMembersMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              `Add ${selectedMembers.length > 0 ? selectedMembers.length : ""} Member${selectedMembers.length !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteTeamMemberDialog;
