import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SpecialistPlan {
  id: string;
  name: string;
  description: string | null;
  duration_months: number;
  max_users: number | null;
  registration_code: string;
  terms_and_conditions: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSpecialistPlanData {
  name: string;
  description?: string;
  duration_months: 6 | 12 | 18;
  max_users?: number | null;
  terms_and_conditions?: string;
}

export const useSpecialistPlans = () => {
  const [plans, setPlans] = useState<SpecialistPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateRegistrationCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SP-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("specialist_plans")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setPlans(data || []);
    } catch (err: any) {
      console.error("Error fetching specialist plans:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPlan = async (data: CreateSpecialistPlanData): Promise<SpecialistPlan | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // created_by references profiles.id – only set it if a matching profile exists
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

      const newPlan = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        duration_months: data.duration_months,
        max_users: data.max_users ?? null, // null = unlimited
        registration_code: generateRegistrationCode(),
        terms_and_conditions: data.terms_and_conditions?.trim() || null,
        is_active: true,
        created_by: createdBy,
      };

      const { data: createdPlan, error: createError } = await supabase
        .from("specialist_plans")
        .insert(newPlan)
        .select()
        .single();

      if (createError) throw createError;

      toast({
        title: "Plan created",
        description: `Specialist plan "${data.name}" has been created successfully.`,
      });

      await fetchPlans();
      return createdPlan;
    } catch (err: any) {
      console.error("Error creating specialist plan:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to create specialist plan",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePlan = async (
    planId: string,
    updates: Partial<Omit<SpecialistPlan, "id" | "created_at" | "registration_code">>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("specialist_plans")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", planId);

      if (updateError) throw updateError;

      toast({
        title: "Plan updated",
        description: "Specialist plan has been updated successfully.",
      });

      await fetchPlans();
      return true;
    } catch (err: any) {
      console.error("Error updating specialist plan:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update specialist plan",
        variant: "destructive",
      });
      return false;
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean): Promise<boolean> => {
    return updatePlan(planId, { is_active: isActive });
  };

  const deletePlan = async (planId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("specialist_plans")
        .delete()
        .eq("id", planId);

      if (deleteError) throw deleteError;

      toast({
        title: "Plan deleted",
        description: "Specialist plan has been deleted successfully.",
      });

      await fetchPlans();
      return true;
    } catch (err: any) {
      console.error("Error deleting specialist plan:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to delete specialist plan",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
    createPlan,
    updatePlan,
    togglePlanStatus,
    deletePlan,
  };
};
