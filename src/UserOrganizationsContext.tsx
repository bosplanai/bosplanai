import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: "admin" | "member" | "viewer";
  scheduled_deletion_at: string | null;
}

interface UserOrganizationsContextType {
  organizations: UserOrganization[];
  loading: boolean;
  activeOrgId: string | null;
  setActiveOrganization: (orgId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const UserOrganizationsContext = createContext<UserOrganizationsContextType | undefined>(undefined);

const ACTIVE_ORG_KEY = "active_organization_id";

export const UserOrganizationsProvider = ({ children }: { children: ReactNode }) => {
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchUserOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setLoading(false);
      return;
    }

    try {
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          role,
          organization_id,
          organizations:organization_id (
            id,
            name,
            slug,
            logo_url,
            scheduled_deletion_at
          )
        `)
        .eq("user_id", user.id);

      if (rolesError) throw rolesError;

      const orgs: UserOrganization[] = (userRoles || [])
        .filter((r: any) => r.organizations)
        .map((r: any) => ({
          id: r.organizations.id,
          name: r.organizations.name,
          slug: r.organizations.slug,
          logo_url: r.organizations.logo_url,
          role: r.role,
          scheduled_deletion_at: r.organizations.scheduled_deletion_at,
        }));

      setOrganizations(orgs);

      // If no active org is set, or the active org isn't in the list, set the first one
      if (orgs.length > 0) {
        const currentActiveOrg = orgs.find(o => o.id === activeOrgId);
        if (!currentActiveOrg) {
          setActiveOrgId(orgs[0].id);
          localStorage.setItem(ACTIVE_ORG_KEY, orgs[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching user organizations:", error);
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeOrgId]);

  const setActiveOrganization = useCallback(async (orgId: string) => {
    setActiveOrgId(orgId);
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
    // Dispatch storage event for other tabs/components listening
    window.dispatchEvent(new StorageEvent('storage', {
      key: ACTIVE_ORG_KEY,
      newValue: orgId,
    }));
  }, []);

  useEffect(() => {
    fetchUserOrganizations();
  }, [fetchUserOrganizations]);

  return (
    <UserOrganizationsContext.Provider value={{
      organizations,
      loading,
      activeOrgId,
      setActiveOrganization,
      refetch: fetchUserOrganizations,
    }}>
      {children}
    </UserOrganizationsContext.Provider>
  );
};

export const useUserOrganizations = () => {
  const context = useContext(UserOrganizationsContext);
  if (context === undefined) {
    throw new Error("useUserOrganizations must be used within a UserOrganizationsProvider");
  }
  return context;
};
