import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrganizationWithDetails {
  id: string;
  name: string;
  slug: string;
  employee_size: string;
  created_at: string;
  is_suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  users: {
    id: string;
    full_name: string;
    job_role: string;
    email?: string;
    role?: string;
  }[];
  subscription: {
    status: string;
    plan_type: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;
  specialistPlan: {
    plan_name: string;
    expires_at: string;
    referral_code: string | null;
    agreed_to_terms: boolean;
    created_at: string;
  } | null;
  usage: {
    projects_count: number;
    tasks_count: number;
    files_count: number;
    invoices_count: number;
  };
}

export const useSuperAdminData = () => {
  const [organizations, setOrganizations] = useState<OrganizationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgsError) throw orgsError;

      // For each organization, fetch related data
      const orgsWithDetails = await Promise.all(
        (orgs || []).map(async (org) => {
          // Fetch profiles (users) for this org
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, job_role")
            .eq("organization_id", org.id);

          // Fetch user roles for these profiles
          const profileIds = (profiles || []).map((p) => p.id);

          let userRoles: { user_id: string; role: string }[] = [];
          if (profileIds.length > 0) {
            const { data: userRolesData, error: userRolesError } = await supabase
              .from("user_roles")
              .select("user_id, role")
              .in("user_id", profileIds);

            if (userRolesError) throw userRolesError;
            userRoles = userRolesData || [];
          }

          // Get emails from auth (via backend function would be ideal, but we'll use what we have)
          const usersWithRoles = (profiles || []).map((profile) => {
            const roleData = userRoles.find((r) => r.user_id === profile.id);
            return {
              ...profile,
              role: roleData?.role || "member",
            };
          });

          // Fetch subscription
          const { data: subscription } = await supabase
            .from("subscriptions")
            .select("status, plan_type, trial_ends_at, current_period_end")
            .eq("organization_id", org.id)
            .maybeSingle();

          // Fetch specialist plan with plan name
          const { data: orgSpecialistPlan } = await supabase
            .from("organization_specialist_plans")
            .select(`
              expires_at,
              referral_code,
              agreed_to_terms,
              created_at,
              specialist_plans!inner(name)
            `)
            .eq("organization_id", org.id)
            .maybeSingle();

          const specialistPlan = orgSpecialistPlan ? {
            plan_name: (orgSpecialistPlan.specialist_plans as any)?.name || "Specialist Plan",
            expires_at: orgSpecialistPlan.expires_at,
            referral_code: orgSpecialistPlan.referral_code,
            agreed_to_terms: orgSpecialistPlan.agreed_to_terms,
            created_at: orgSpecialistPlan.created_at,
          } : null;

          // Fetch usage counts
          const [projectsResult, tasksResult, filesResult, invoicesResult] = await Promise.all([
            supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
            supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
            supabase.from("drive_files").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
            supabase.from("invoices").select("id", { count: "exact", head: true }).eq("organization_id", org.id),
          ]);

          return {
            id: org.id,
            name: org.name,
            slug: org.slug,
            employee_size: org.employee_size,
            created_at: org.created_at,
            is_suspended: org.is_suspended,
            suspended_at: org.suspended_at,
            suspension_reason: org.suspension_reason,
            users: usersWithRoles,
            subscription: subscription || null,
            specialistPlan,
            usage: {
              projects_count: projectsResult.count || 0,
              tasks_count: tasksResult.count || 0,
              files_count: filesResult.count || 0,
              invoices_count: invoicesResult.count || 0,
            },
          };
        })
      );

      setOrganizations(orgsWithDetails);
    } catch (err: any) {
      console.error("Error fetching organizations:", err);
      setError(err.message);
      toast.error("Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  }, []);

  const suspendOrganization = async (orgId: string, reason: string) => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      // suspended_by references profiles.id; only set it if a matching profile exists
      let suspendedBy: string | null = null;
      if (user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && profile?.id) suspendedBy = profile.id;
      }

      const { error } = await supabase
        .from("organizations")
        .update({
          is_suspended: true,
          suspended_at: new Date().toISOString(),
          suspended_by: suspendedBy,
          suspension_reason: reason,
        })
        .eq("id", orgId);

      if (error) throw error;

      toast.success("Organization suspended successfully");

      // Refreshing the list should not turn a successful suspend into an error toast
      try {
        await fetchOrganizations();
      } catch (refreshErr) {
        console.error("Error refreshing organizations after suspend:", refreshErr);
      }
    } catch (err: any) {
      console.error("Error suspending organization:", err);
      toast.error("Failed to suspend organization");
      throw err;
    }
  };

  const reactivateOrganization = async (orgId: string) => {
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          is_suspended: false,
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .eq("id", orgId);

      if (error) throw error;

      toast.success("Organization reactivated successfully");

      try {
        await fetchOrganizations();
      } catch (refreshErr) {
        console.error("Error refreshing organizations after reactivate:", refreshErr);
      }
    } catch (err: any) {
      console.error("Error reactivating organization:", err);
      toast.error("Failed to reactivate organization");
      throw err;
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
    suspendOrganization,
    reactivateOrganization,
  };
};
