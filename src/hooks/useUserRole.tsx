import { useState, useEffect, createContext, useContext, ReactNode, useRef } from "react";
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
  canEditOwnTasks: boolean;
  canEditAllTasks: boolean;
  canAssignTasks: boolean;
  canManageUsers: boolean;
  canInviteUsers: boolean;
  canAccessProductManagement: boolean;
  canAccessOperational: boolean;
  canAccessStrategic: boolean;
  canUseDrive: boolean;
  canUseDataRoom: boolean;
  canUseTools: boolean;
  canUseTaskPopulate: boolean;
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

  // Track if this is the initial load vs a refetch
  const isInitialLoad = useRef(true);
  // Track the last fetched org+user to avoid unnecessary refetches
  // IMPORTANT: include user_id to prevent leaking a prior user's permissions after sign out/in.
  const lastFetchedOrgId = useRef<string | null>(null);
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchRole = async () => {
    if (!user || !organization) {
      lastFetchedOrgId.current = null;
      lastFetchedUserId.current = null;
      setRole(null);
      setLoading(false);
      isInitialLoad.current = false;
      return;
    }

    // Skip if we've already fetched for this exact user+org (unless it's a manual refetch)
    if (
      lastFetchedOrgId.current === organization.id &&
      lastFetchedUserId.current === user.id &&
      !isInitialLoad.current
    ) {
      return;
    }

    // Only show loading state on initial load, not on subsequent fetches
    if (isInitialLoad.current) {
      setLoading(true);
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

      lastFetchedOrgId.current = organization.id;
      lastFetchedUserId.current = user.id;
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  };

  // Force refetch for manual calls (e.g., after role change)
  const forceRefetch = async () => {
    lastFetchedOrgId.current = null;
    lastFetchedUserId.current = null;
    isInitialLoad.current = false;
    await fetchRole();
  };

  // Reset cached role when the authenticated user changes (prevents permission leakage)
  useEffect(() => {
    lastFetchedOrgId.current = null;
    lastFetchedUserId.current = null;
    isInitialLoad.current = true;

    if (!user) {
      setRole(null);
      setLoading(false);
      isInitialLoad.current = false;
    } else {
      setRole(null);
      setLoading(true);
    }
  }, [user?.id]);

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
  // Viewer: Can only move their own assigned tasks (To Do <-> Complete)
  // Manager: Can create tasks, edit their own tasks, assign tasks
  // Admin: Full CRUD on all boards
  const canCreateTasks = role === "member" || role === "admin";
  const canDeleteTasks = role === "member" || role === "admin";
  const canEditOwnTasks = role === "member" || role === "admin";
  const canEditAllTasks = role === "admin";
  const canAssignTasks = role === "member" || role === "admin";
  
  // User management - only Full Access
  const canManageUsers = role === "admin";
  const canInviteUsers = role === "admin";
  
  // Board access - Viewer and Manager only see Product Management
  // Operational and Strategic are hidden (not just disabled) for non-admins
  const canAccessProductManagement = role !== null; // All roles can access Product Management
  const canAccessOperational = role === "admin";
  const canAccessStrategic = role === "admin";
  
  // Tool access - Drive and Data Room available to all
  const canUseDrive = role !== null;
  const canUseDataRoom = role !== null;
  const canUseTools = role === "member" || role === "admin";
  
  // TaskPopulate access - Viewer has no access
  const canUseTaskPopulate = role === "member" || role === "admin";
  
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
        canEditOwnTasks,
        canEditAllTasks,
        canAssignTasks,
        canManageUsers,
        canInviteUsers,
        canAccessProductManagement,
        canAccessOperational,
        canAccessStrategic,
        canUseDrive,
        canUseDataRoom,
        canUseTools,
        canUseTaskPopulate,
        canSwitchOrganizations,
        canManageSettings,
        refetch: forceRefetch,
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
