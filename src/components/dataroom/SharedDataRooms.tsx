import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Folder, Loader2, Shield, ArrowRight, Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import NdaSigningModal from "./NdaSigningModal";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

interface SharedDataRoomsProps {
  userId: string;
  organizationId: string;
  onSelectRoom: (roomId: string) => void;
  selectedRoomId: string | null;
}

interface SharedRoom {
  id: string;
  data_room_id: string;
  role: string;
  created_at: string;
  data_room: {
    id: string;
    name: string;
    description: string | null;
    nda_required: boolean;
    nda_content: string | null;
    nda_content_hash: string | null;
    created_at: string;
    creator: {
      full_name: string;
    };
  };
}

const SharedDataRooms = ({
  userId,
  organizationId,
  onSelectRoom,
  selectedRoomId,
}: SharedDataRoomsProps) => {
  const { user } = useAuth();
  const { profile } = useOrganization();
  const [ndaModalOpen, setNdaModalOpen] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<SharedRoom | null>(null);

  // Fetch rooms shared with user (where user is member but not owner)
  // Exclude deleted and archived data rooms
  const { data: sharedRooms = [], isLoading } = useQuery({
    queryKey: ["shared-data-rooms", userId, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_members")
        .select(`
          id,
          data_room_id,
          role,
          created_at,
          data_room:data_room_id(
            id,
            name,
            description,
            nda_required,
            nda_content,
            nda_content_hash,
            created_at,
            deleted_at,
            archived_at,
            creator:created_by(full_name)
          )
        `)
        .eq("user_id", userId)
        .eq("organization_id", organizationId);

      if (error) throw error;

      // Filter to rooms where:
      // - user is member (not owner)
      // - room exists
      // - room is NOT deleted (deleted_at is null)
      // - room is NOT archived (archived_at is null)
      return (data as any[]).filter(
        (r) => 
          r.role !== "owner" && 
          r.data_room && 
          !r.data_room.deleted_at && 
          !r.data_room.archived_at
      ) as SharedRoom[];
    },
    enabled: !!userId && !!organizationId,
  });

  // Fetch user's NDA signatures for these rooms - include hash for verification
  const { data: userSignatures = [], refetch: refetchSignatures } = useQuery({
    queryKey: ["user-nda-signatures", userId, sharedRooms.map(r => r.data_room_id)],
    queryFn: async () => {
      if (sharedRooms.length === 0) return [];
      
      const roomIds = sharedRooms.map(r => r.data_room_id);
      const { data, error } = await supabase
        .from("data_room_nda_signatures")
        .select("data_room_id, signed_at, nda_content_hash")
        .eq("user_id", userId)
        .in("data_room_id", roomIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && sharedRooms.length > 0,
  });

  // Check if user has signed the NDA for this specific room with matching hash
  const hasSignedNda = (room: SharedRoom) => {
    const signature = userSignatures.find(sig => sig.data_room_id === room.data_room.id);
    if (!signature) return false;
    
    // If the data room has a hash, verify the signature hash matches
    // This ensures users must re-sign if NDA content was updated
    if (room.data_room.nda_content_hash) {
      return signature.nda_content_hash === room.data_room.nda_content_hash;
    }
    
    // Legacy rooms without hash - signature exists is enough
    return true;
  };

  const handleRoomClick = (room: SharedRoom) => {
    // If NDA is required and user hasn't signed, show signing modal
    if (room.data_room.nda_required && !hasSignedNda(room)) {
      setPendingRoom(room);
      setNdaModalOpen(true);
      return;
    }

    // Otherwise, allow access
    onSelectRoom(room.data_room.id);
  };

  const handleNdaSigned = () => {
    setNdaModalOpen(false);
    refetchSignatures();
    if (pendingRoom) {
      onSelectRoom(pendingRoom.data_room.id);
      setPendingRoom(null);
    }
  };

  const handleNdaClose = () => {
    setNdaModalOpen(false);
    setPendingRoom(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sharedRooms.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-semibold text-foreground mb-2">
          No shared data rooms
        </h3>
        <p className="text-sm text-muted-foreground">
          When you're invited to a data room, it will appear here.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sharedRooms.map((room) => {
          const signed = hasSignedNda(room);
          const requiresNda = room.data_room.nda_required;
          const isLocked = requiresNda && !signed;

          return (
            <Card
              key={room.id}
              className={cn(
                "p-4 transition-all",
                isLocked 
                  ? "cursor-pointer border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                  : "cursor-pointer hover:border-emerald-500/50",
                selectedRoomId === room.data_room.id && !isLocked && "border-emerald-500 bg-emerald-500/5"
              )}
              onClick={() => handleRoomClick(room)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {isLocked ? (
                    <Lock className="w-5 h-5 flex-shrink-0 text-amber-500" />
                  ) : (
                    <Folder
                      className={cn(
                        "w-5 h-5 flex-shrink-0",
                        selectedRoomId === room.data_room.id
                          ? "text-emerald-500"
                          : "text-muted-foreground"
                      )}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={cn(
                        "font-medium truncate",
                        isLocked ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {room.data_room.name}
                      </p>
                      {requiresNda && (
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] py-0",
                            signed 
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          )}
                        >
                          {signed ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              NDA Signed
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              NDA Required
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Shared by {room.data_room.creator?.full_name || "Unknown"} •{" "}
                      {format(new Date(room.created_at), "MMM d, yyyy")}
                    </p>
                    {room.data_room.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {room.data_room.description}
                      </p>
                    )}
                    {isLocked && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Click to sign NDA and unlock access
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {room.role}
                  </Badge>
                  {isLocked ? (
                    <Lock className="w-4 h-4 text-amber-500" />
                  ) : selectedRoomId === room.data_room.id ? (
                    <ArrowRight className="w-4 h-4 text-emerald-500" />
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* NDA Signing Modal */}
      {pendingRoom && (
        <NdaSigningModal
          open={ndaModalOpen}
          onClose={handleNdaClose}
          onSigned={handleNdaSigned}
          dataRoom={{
            id: pendingRoom.data_room.id,
            name: pendingRoom.data_room.name,
            nda_content: pendingRoom.data_room.nda_content,
          }}
          userId={userId}
          userEmail={user?.email || ""}
          userName={profile?.full_name || user?.user_metadata?.full_name || ""}
        />
      )}
    </>
  );
};

export default SharedDataRooms;
