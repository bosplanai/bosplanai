import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  employee_size: string;
  logo_url: string | null;
  is_suspended: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
}

interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  job_role: string;
  phone_number: string;
}

// Store active organization ID in localStorage
const ACTIVE_ORG_KEY = "active_organization_id";

interface OrganizationContextType {
  organization: Organization | null;
  profile: Profile | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchOrganizationData = useCallback(async () => {
    if (!user) {
      setOrganization(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // First, check if there's an active organization stored
      const activeOrgId = localStorage.getItem(ACTIVE_ORG_KEY);

      // Fetch all profiles for this user (they may belong to multiple orgs)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          id: profileData.id,
          organization_id: profileData.organization_id,
          full_name: profileData.full_name,
          job_role: profileData.job_role,
          phone_number: profileData.phone_number,
        });

        // Determine which organization to use
        let orgIdToFetch = activeOrgId || profileData.organization_id;

        // Verify the user has access to this organization
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("organization_id")
          .eq("user_id", user.id)
          .eq("organization_id", orgIdToFetch)
          .maybeSingle();

        // If user doesn't have access to the stored org, fall back to profile org
        if (!userRole) {
          orgIdToFetch = profileData.organization_id;
          localStorage.setItem(ACTIVE_ORG_KEY, orgIdToFetch);
        }

        // Fetch organization
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgIdToFetch)
          .maybeSingle();

        if (orgError) throw orgError;

        if (orgData) {
          setOrganization({
            id: orgData.id,
            name: orgData.name,
            slug: orgData.slug,
            employee_size: orgData.employee_size,
            logo_url: orgData.logo_url,
            is_suspended: orgData.is_suspended,
            suspended_at: orgData.suspended_at,
            suspension_reason: orgData.suspension_reason,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching organization data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizationData();
  }, [fetchOrganizationData]);

  // Listen for storage changes (when org is switched)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_ORG_KEY) {
        fetchOrganizationData();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchOrganizationData]);

  return (
    <OrganizationContext.Provider 
      value={{ 
        organization, 
        profile, 
        loading, 
        refetch: fetchOrganizationData,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};
