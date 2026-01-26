import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user?.id) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "super_admin")
          .maybeSingle();

        if (error) throw error;
        setIsSuperAdmin(!!data);
      } catch (error) {
        console.error("Error checking super admin status:", error);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
  }, [user?.id]);

  return { isSuperAdmin, loading };
};
