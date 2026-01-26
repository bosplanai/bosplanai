import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";

export type AppRole = "admin" | "member" | "viewer";

interface UserRoleContextType {
  role: AppRole | null;
  loading: boolean;
  isViewer: boolean;
  isMember: boolean;
  isAdmin: boolean;
  canCreateTasks: boolean;
  canDeleteTasks: boolean;
  canManageUsers: boolean;
  canAccessOperational: boolean;
  canAccessStrategic: boolean;
  canUseDrive: boolean;
  canSwitchOrganizations: boolean;
  refetch: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();

  const fetchRole = async () => {
    if (!user || !organization) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } else {
        setRole(data?.role as AppRole || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [user, organization]);

  // Computed permissions
  const isViewer = role === "viewer";
  const isMember = role === "member";
  const isAdmin = role === "admin";

  // Viewer: restricted access
  // Member: can create tasks, see all tasks
  // Admin (Full Access): everything
  const canCreateTasks = role === "member" || role === "admin";
  const canDeleteTasks = role === "admin";
  const canManageUsers = role === "admin";
  const canAccessOperational = role === "admin";
  const canAccessStrategic = role === "admin";
  
  // All users have full Drive access
  const canUseDrive = role !== null;
  
  // Full Access (admin) and Manager (member) can switch organizations
  const canSwitchOrganizations = role === "admin" || role === "member";

  return (
    <UserRoleContext.Provider
      value={{
        role,
        loading,
        isViewer,
        isMember,
        isAdmin,
        canCreateTasks,
        canDeleteTasks,
        canManageUsers,
        canAccessOperational,
        canAccessStrategic,
        canUseDrive,
        canSwitchOrganizations,
        refetch: fetchRole,
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }
  return context;
};
