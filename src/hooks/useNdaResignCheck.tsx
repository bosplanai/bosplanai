import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface NdaResignCheck {
  needsResign: boolean;
  dataRoomId: string | null;
  dataRoomName: string | null;
  ndaContent: string | null;
}

export const useNdaResignCheck = (dataRoomId: string | null, organizationId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["nda-resign-check", dataRoomId, user?.id],
    queryFn: async (): Promise<NdaResignCheck> => {
      if (!dataRoomId || !user?.id) {
        return { needsResign: false, dataRoomId: null, dataRoomName: null, ndaContent: null };
      }

      // Get data room info including current NDA hash
      const { data: dataRoom, error: roomError } = await supabase
        .from("data_rooms")
        .select("id, name, nda_required, nda_content, nda_content_hash, created_by")
        .eq("id", dataRoomId)
        .maybeSingle();

      if (roomError || !dataRoom) {
        return { needsResign: false, dataRoomId: null, dataRoomName: null, ndaContent: null };
      }

      // Owner doesn't need to sign NDA
      if (dataRoom.created_by === user.id) {
        return { needsResign: false, dataRoomId: null, dataRoomName: null, ndaContent: null };
      }

      // If NDA not required, no need to resign
      if (!dataRoom.nda_required) {
        return { needsResign: false, dataRoomId: null, dataRoomName: null, ndaContent: null };
      }

      // Get user's most recent signature for this room
      const { data: signature, error: sigError } = await supabase
        .from("data_room_nda_signatures")
        .select("nda_content_hash, signed_at")
        .eq("data_room_id", dataRoomId)
        .eq("user_id", user.id)
        .order("signed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sigError) {
        console.error("Error checking NDA signature:", sigError);
        return { needsResign: false, dataRoomId: null, dataRoomName: null, ndaContent: null };
      }

      // If no signature exists, they need to sign (handled by NdaSigningModal elsewhere)
      if (!signature) {
        return { needsResign: false, dataRoomId: null, dataRoomName: null, ndaContent: null };
      }

      // If data room has no hash yet (legacy), no need to resign
      if (!dataRoom.nda_content_hash) {
        return { needsResign: false, dataRoomId: null, dataRoomName: null, ndaContent: null };
      }

      // Compare hashes - if different, NDA was updated and needs re-signing
      const needsResign = signature.nda_content_hash !== dataRoom.nda_content_hash;

      return {
        needsResign,
        dataRoomId: needsResign ? dataRoom.id : null,
        dataRoomName: needsResign ? dataRoom.name : null,
        ndaContent: needsResign ? dataRoom.nda_content : null,
      };
    },
    enabled: !!dataRoomId && !!user?.id && !!organizationId,
    staleTime: 30000, // Cache for 30 seconds
  });
};
