import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { mapDbRoleToUiRole, type UiAccessRole } from "@/lib/roles";

export type AppRole = UiAccessRole;

interface UserRoleContextType {
  role: AppRole | null;
  loading: boolean;
  isViewer: boolean;
  isMember: boolean;
  isAdmin: boolean;
  canCreateTasks: boolean;
  canDeleteTasks: boolean;
  canManageUsers: boolean;
  canInviteUsers: boolean;
  canAccessProductManagement: boolean;
  canAccessOperational: boolean;
  canAccessStrategic: boolean;
  canUseDrive: boolean;
  canUseDataRoom: boolean;
  canUseTools: boolean;
  canSwitchOrganizations: boolean;
  canManageSettings: boolean;
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
        setRole(mapDbRoleToUiRole(data?.role) as AppRole | null);
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

  // Computed permissions based on role types:
  // - admin (Full Access): Complete platform access, can manage users, boards, projects, settings
  // - member (Manager): Can create/manage tasks on Product Management board, access tools
  // - viewer (Team): Can view/complete assigned tasks, access Data Room and Drive
  
  const isViewer = role === "viewer";
  const isMember = role === "member";
  const isAdmin = role === "admin";

  // Task permissions
  const canCreateTasks = role === "member" || role === "admin";
  const canDeleteTasks = role === "admin";
  
  // User management - only Full Access
  const canManageUsers = role === "admin";
  const canInviteUsers = role === "admin";
  
  // Board access
  const canAccessProductManagement = role === "member" || role === "admin";
  const canAccessOperational = role === "admin";
  const canAccessStrategic = role === "admin";
  
  // Tool access - Drive and Data Room available to all
  const canUseDrive = role !== null;
  const canUseDataRoom = role !== null;
  const canUseTools = role === "member" || role === "admin";
  
  // Organization management
  const canSwitchOrganizations = role === "admin" || role === "member";
  const canManageSettings = role === "admin";

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
        canInviteUsers,
        canAccessProductManagement,
        canAccessOperational,
        canAccessStrategic,
        canUseDrive,
        canUseDataRoom,
        canUseTools,
        canSwitchOrganizations,
        canManageSettings,
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
