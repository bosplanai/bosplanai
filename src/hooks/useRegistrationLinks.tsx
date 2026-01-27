import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SpecialistPlan } from "@/hooks/useSpecialistPlans";

export interface RegistrationLink {
  id: string;
  plan_id: string;
  referral_code: string;
  name: string;
  description: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  plan?: SpecialistPlan;
}

export interface CreateRegistrationLinkData {
  plan_id: string;
  name: string;
  description?: string;
  max_uses?: number | null;
  expires_at?: string | null;
}

export const useRegistrationLinks = () => {
  const [links, setLinks] = useState<RegistrationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateReferralCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'REF-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("registration_links")
        .select(`
          *,
          plan:specialist_plans(*)
        `)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setLinks(data || []);
    } catch (err: any) {
      console.error("Error fetching registration links:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLink = async (data: CreateRegistrationLinkData): Promise<RegistrationLink | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Check if user has a profile (created_by references profiles.id)
      let createdBy: string | null = null;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        
        if (profile?.id) {
          createdBy = profile.id;
        }
      }
      
      const newLink = {
        plan_id: data.plan_id,
        referral_code: generateReferralCode(),
        name: data.name.trim(),
        description: data.description?.trim() || null,
        max_uses: data.max_uses ?? null,
        expires_at: data.expires_at || null,
        is_active: true,
        created_by: createdBy,
      };

      const { data: createdLink, error: createError } = await supabase
        .from("registration_links")
        .insert(newLink)
        .select(`
          *,
          plan:specialist_plans(*)
        `)
        .single();

      if (createError) throw createError;

      toast({
        title: "Link created",
        description: `Registration link "${data.name}" has been created successfully.`,
      });

      await fetchLinks();
      return createdLink;
    } catch (err: any) {
      console.error("Error creating registration link:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create registration link",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateLink = async (
    linkId: string,
    updates: Partial<Omit<RegistrationLink, "id" | "created_at" | "referral_code">>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("registration_links")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", linkId);

      if (updateError) throw updateError;

      toast({
        title: "Link updated",
        description: "Registration link has been updated successfully.",
      });

      await fetchLinks();
      return true;
    } catch (err: any) {
      console.error("Error updating registration link:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update registration link",
        variant: "destructive",
      });
      return false;
    }
  };

  const toggleLinkStatus = async (linkId: string, isActive: boolean): Promise<boolean> => {
    return updateLink(linkId, { is_active: isActive });
  };

  const deleteLink = async (linkId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("registration_links")
        .delete()
        .eq("id", linkId);

      if (deleteError) throw deleteError;

      toast({
        title: "Link deleted",
        description: "Registration link has been deleted successfully.",
      });

      await fetchLinks();
      return true;
    } catch (err: any) {
      console.error("Error deleting registration link:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete registration link",
        variant: "destructive",
      });
      return false;
    }
  };

  const getSignupUrl = (referralCode: string): string => {
    return `${window.location.origin}/register/${referralCode}`;
  };

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  return {
    links,
    loading,
    error,
    refetch: fetchLinks,
    createLink,
    updateLink,
    toggleLinkStatus,
    deleteLink,
    getSignupUrl,
  };
};
