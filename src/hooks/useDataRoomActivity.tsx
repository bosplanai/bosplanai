import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface LogActivityParams {
  dataRoomId: string;
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details?: Json;
  isGuest?: boolean;
}

export const useDataRoomActivity = () => {
  const logActivity = async ({
    dataRoomId,
    organizationId,
    userId,
    userName,
    userEmail,
    action,
    details,
    isGuest = false,
  }: LogActivityParams) => {
    try {
      await supabase.from("data_room_activity").insert([{
        data_room_id: dataRoomId,
        organization_id: organizationId,
        user_id: isGuest ? null : userId,
        user_name: userName,
        user_email: userEmail,
        action,
        details: details ?? null,
        is_guest: isGuest,
      }]);
    } catch (err) {
      console.error("Error logging activity:", err);
    }
  };

  return { logActivity };
};
