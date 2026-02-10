import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { useUserOrganizations } from "@/contexts/UserOrganizationsContext";
import { mapDbRoleToUiRole, mapUiRoleToDbRole, type UiAccessRole } from "@/lib/roles";

type AppRole = UiAccessRole;

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  job_role: string;
  email: string;
  role: AppRole;
  created_at: string;
}

interface Invite {
  id: string;
  email: string;
  role: AppRole;
  status: string;
  created_at: string;
  expires_at: string;
  organization_id: string;
  organization_name?: string;
  token?: string;
}

export const useTeamMembers = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { user } = useAuth();
  const { organizations } = useUserOrganizations();

  // Get organizations where user is admin (for invites across all orgs)
  const adminOrgs = organizations.filter(org => org.role === "admin");

  const fetchMembers = useCallback(async () => {
    if (!organization) return;

    try {
      // Fetch roles for this organization first - this is the source of truth for membership
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", organization.id);

      if (rolesError) throw rolesError;

      // Get current user's role
      if (user) {
        const myRole = roles?.find((r) => r.user_id === user.id);
        setCurrentUserRole(mapDbRoleToUiRole(myRole?.role) as AppRole | null);
      }

      if (!roles || roles.length === 0) {
        setMembers([]);
        return;
      }

      // Fetch profiles for users who have roles in this organization
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, job_role, created_at")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Fetch emails for members using edge function (admin only)
      let emailMap: Record<string, string> = {};
      const isCurrentUserAdmin = roles.find(r => r.user_id === user?.id)?.role === "admin";
      
      if (isCurrentUserAdmin && userIds.length > 0) {
        try {
          // Get current session to ensure we have a valid token
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData?.session?.access_token) {
            const { data: emailData, error: emailError } = await supabase.functions.invoke("get-member-emails", {
              body: {
                userIds,
                organizationId: organization.id,
              },
            });
            
            if (!emailError && emailData?.emails) {
              emailMap = emailData.emails;
            } else if (emailError) {
              console.warn("Could not fetch member emails:", emailError.message);
            }
          }
        } catch (e) {
          console.warn("Error fetching member emails (non-critical):", e);
          // Continue without emails - non-critical feature
        }
      }

      // Combine profiles with roles - only include users who have a role
      const membersWithRoles: TeamMember[] = roles
        .map((role) => {
          const profile = profiles?.find((p) => p.id === role.user_id);
          if (!profile) return null;
          
          return {
            id: profile.id,
            user_id: profile.id,
            full_name: profile.full_name,
            job_role: profile.job_role,
            email: emailMap[profile.id] || "",
            role: (mapDbRoleToUiRole(role.role) as AppRole) || "viewer",
            created_at: profile.created_at,
          };
        })
        .filter((m): m is TeamMember => m !== null);

      setMembers(membersWithRoles);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  }, [organization, user]);

  const fetchInvites = useCallback(async () => {
    // Get admin orgs from the current organizations list
    const currentAdminOrgs = organizations.filter(org => org.role === "admin");
    
    if (currentAdminOrgs.length === 0) {
      setInvites([]);
      return;
    }

    try {
      // Fetch invites from all organizations where user is admin
      const adminOrgIds = currentAdminOrgs.map(org => org.id);
      const { data, error } = await supabase
        .from("organization_invites")
        .select("id, email, role, status, created_at, expires_at, organization_id, token")
        .in("organization_id", adminOrgIds)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map organization names to invites
      const invitesWithOrgNames: Invite[] = (data || []).map(invite => ({
        ...invite,
        role: invite.role as AppRole,
        organization_name: currentAdminOrgs.find(org => org.id === invite.organization_id)?.name || "Unknown",
      }));

      setInvites(invitesWithOrgNames);
    } catch (error) {
      console.error("Error fetching invites:", error);
    }
  }, [organizations]);

  const removeInvitedUser = async (inviteId: string, email: string, status: string, removeFromAllOrgs = false) => {
    if (!organization) throw new Error("Organization not found");

    // If the invite was accepted, we need to find and remove the user's role too
    if (status === "accepted") {
      const { data, error: funcError } = await supabase.functions.invoke("remove-team-member-by-email", {
        body: {
          email,
          organizationId: organization.id,
          removeFromAllOrgs,
        },
      });

      if (funcError) {
        console.error("Error removing user by email:", funcError);
        // Try to extract the real error message
        let message = funcError.message || "Failed to remove user";
        const ctxBody = (funcError as any)?.context?.body;
        if (typeof ctxBody === "string") {
          try {
            const parsed = JSON.parse(ctxBody);
            if (parsed?.error) message = String(parsed.error);
          } catch {
            // keep original
          }
        }
        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }
    }

    // Delete the invite record(s)
    if (removeFromAllOrgs) {
      // Delete all invites for this email across all orgs the user is admin of
      // This will be filtered by RLS anyway
      const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("email", email.toLowerCase());

      if (error) {
        console.error("Error deleting invites:", error);
        // Continue anyway as the main removal was successful
      }
    } else {
      // Delete only the specific invite
      const { error } = await supabase
        .from("organization_invites")
        .delete()
        .eq("id", inviteId);

      if (error) throw error;
    }
    
    await Promise.all([fetchInvites(), fetchMembers()]);
  };



  const sendInvite = async (
    email: string, 
    role: AppRole, 
    targetOrgId?: string, 
    targetOrgName?: string, 
    fullName?: string
  ) => {
    if (!user) {
      throw new Error("User not found");
    }

    // Use provided org or current org
    const orgId = targetOrgId || organization?.id;
    const orgName = targetOrgName || organization?.name;

    if (!orgId || !orgName) {
      throw new Error("Organization not found");
    }

    // Call edge function to create invite and send email (bypasses RLS)
    const { data, error } = await supabase.functions.invoke("send-invite", {
      body: {
        email,
        role,
        organizationId: orgId,
        organizationName: orgName,
        fullName: fullName || "Team Member",
      },
    });

    if (error) {
      console.error("Error sending invite:", error);

      let message = error.message || "Failed to send invitation";

      // For FunctionsHttpError, the response body is in error.context and needs to be read as json()
      try {
        if ((error as any)?.context?.json && typeof (error as any).context.json === "function") {
          const errorData = await (error as any).context.json();
          if (errorData?.error) {
            message = String(errorData.error);
          }
        }
      } catch (parseError) {
        console.error("Error parsing edge function response:", parseError);
      }

      throw new Error(message);
    }

    if ((data as any)?.error) {
      throw new Error((data as any).error);
    }

    // Optimistically add the new invite to the list immediately
    if (data?.invite) {
      const newInvite: Invite = {
        id: data.invite.id,
        email: email.toLowerCase(),
        role: role,
        status: data.invite.status || "pending",
        created_at: data.invite.created_at || new Date().toISOString(),
        expires_at: data.invite.expires_at || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        organization_id: orgId,
        organization_name: orgName,
        token: data.invite.token,
      };
      setInvites(prev => [newInvite, ...prev.filter(i => !(i.email.toLowerCase() === email.toLowerCase() && i.organization_id === orgId))]);
    }

    // Also fetch to reconcile with server state
    await fetchInvites();
    await fetchMembers(); // Refresh members as user may have been created
    return data;
  };

  // Send batch invite to multiple organizations at once (single email)
  const sendBatchInvite = async (
    email: string,
    fullName: string,
    organizations: Array<{ orgId: string; orgName: string; role: AppRole }>
  ) => {
    if (!user) {
      throw new Error("User not found");
    }

    if (organizations.length === 0) {
      throw new Error("No organizations selected");
    }

    // Call edge function with multi-org format
    const { data, error } = await supabase.functions.invoke("send-invite", {
      body: {
        email,
        fullName: fullName || "Team Member",
        organizations: organizations.map(org => ({
          organizationId: org.orgId,
          organizationName: org.orgName,
          role: org.role
        }))
      },
    });

    if (error) {
      console.error("Error sending batch invite:", error);

      let message = error.message || "Failed to send invitation";
      
      // For FunctionsHttpError, the response body is in error.context and needs to be read as json()
      try {
        if ((error as any)?.context?.json && typeof (error as any).context.json === "function") {
          const errorData = await (error as any).context.json();
          if (errorData?.error) {
            message = String(errorData.error);
          }
        }
      } catch (parseError) {
        console.error("Error parsing edge function response:", parseError);
      }

      throw new Error(message);
    }

    if ((data as any)?.error) {
      throw new Error((data as any).error);
    }

    // Fetch to reconcile with server state
    await fetchInvites();
    await fetchMembers();
    return data;
  };

  const cancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from("organization_invites")
      .delete()
      .eq("id", inviteId);

    if (error) throw error;
    await fetchInvites();
  };

  const resendInvite = async (inviteId: string) => {
    // Get the invite to find the email
    const { data: invite, error: fetchError } = await supabase
      .from("organization_invites")
      .select("*")
      .eq("id", inviteId)
      .single();

    if (fetchError || !invite) throw new Error("Invite not found");

    // Fetch ALL pending invites for this email to preserve the full invitation state
    const { data: allInvites, error: allInvitesError } = await supabase
      .from("organization_invites")
      .select("id, email, role, organization_id, status")
      .eq("email", invite.email.toLowerCase())
      .eq("status", "pending");

    if (allInvitesError) throw allInvitesError;
    if (!allInvites || allInvites.length === 0) throw new Error("No pending invites found");

    // Build the list of organizations with their original roles
    const orgsToInvite: Array<{ orgId: string; orgName: string; role: AppRole }> = [];
    
    for (const inv of allInvites) {
      const org = adminOrgs.find(o => o.id === inv.organization_id);
      if (org) {
        orgsToInvite.push({
          orgId: org.id,
          orgName: org.name,
          role: inv.role as AppRole,
        });
      }
    }

    if (orgsToInvite.length === 0) throw new Error("No valid organizations found for resend");

    // Delete all existing invites for this email
    const { error: deleteError } = await supabase
      .from("organization_invites")
      .delete()
      .eq("email", invite.email.toLowerCase())
      .eq("status", "pending");

    if (deleteError) throw deleteError;

    // Resend using batch invite to preserve all organizations and roles
    if (orgsToInvite.length === 1) {
      await sendInvite(
        invite.email,
        orgsToInvite[0].role,
        orgsToInvite[0].orgId,
        orgsToInvite[0].orgName,
        "Team Member"
      );
    } else {
      await sendBatchInvite(invite.email, "Team Member", orgsToInvite);
    }

    await fetchInvites();
    await fetchMembers();
  };

  // Add user to another organization (for accepted invites)
  const addToOrganization = async (email: string, role: AppRole, targetOrgId: string, targetOrgName: string) => {
    // This will create a new invite for the user in the target org
    await sendInvite(email, role, targetOrgId, targetOrgName, "Team Member");
  };

  const updateMemberRole = async (userId: string, newRole: AppRole) => {
    if (!organization) throw new Error("Organization not found");

    const { error } = await supabase
      .from("user_roles")
      .update({ role: mapUiRoleToDbRole(newRole) })
      .eq("user_id", userId)
      .eq("organization_id", organization.id);

    if (error) throw error;
    await fetchMembers();
  };

  const removeMember = async (userId: string) => {
    if (!organization) throw new Error("Organization not found");

    // Delete the user's role for this organization
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organization.id);

    if (error) throw error;
    await fetchMembers();
  };

  const updateMemberProfile = async (userId: string, updates: { full_name?: string; job_role?: string }) => {
    if (!organization) throw new Error("Organization not found");

    // Verify the user is in this organization
    const member = members.find(m => m.user_id === userId);
    if (!member) throw new Error("Member not found in this organization");

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) throw error;
    await fetchMembers();
  };

  const createMember = async (
    email: string,
    fullName: string,
    jobRole: string,
    phoneNumber: string,
    role: AppRole
  ) => {
    if (!organization) throw new Error("Organization not found");

    const { data, error } = await supabase.functions.invoke("create-team-member", {
      body: {
        email,
        fullName,
        jobRole,
        phoneNumber,
        role,
        organizationId: organization.id,
        organizationName: organization.name,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    await fetchMembers();
    return data;
  };

  const bulkCreateMembers = async (
    members: Array<{
      email: string;
      fullName: string;
      jobRole: string;
      role: AppRole;
    }>
  ) => {
    if (!organization) throw new Error("Organization not found");

    const { data, error } = await supabase.functions.invoke("bulk-create-team-members", {
      body: {
        members,
        organizationId: organization.id,
        organizationName: organization.name,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    await fetchMembers();
    return data;
  };

  const resendPasswordReset = async (userId: string, fullName: string) => {
    if (!organization) throw new Error("Organization not found");

    const { data, error } = await supabase.functions.invoke("resend-password-reset", {
      body: {
        userId,
        email: "", // Edge function will look up the email
        fullName,
        organizationId: organization.id,
        organizationName: organization.name,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  };

  const setMemberPassword = async (userId: string, newPassword: string) => {
    if (!organization) throw new Error("Organization not found");

    const { data, error } = await supabase.functions.invoke("set-member-password", {
      body: {
        userId,
        newPassword,
        organizationId: organization.id,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    return data;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchInvites()]);
      setLoading(false);
    };

    if (organization) {
      loadData();
    }
  }, [organization, fetchMembers, fetchInvites]);

  // Refetch data when page becomes visible (e.g., user returns to tab after invite accepted)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && organization) {
        // Silently refetch without showing loading state
        Promise.all([fetchMembers(), fetchInvites()]);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [organization, fetchMembers, fetchInvites]);

  const isAdmin = currentUserRole === "admin";

  return {
    members,
    invites,
    currentUserRole,
    isAdmin,
    loading,
    sendInvite,
    sendBatchInvite,
    cancelInvite,
    resendInvite,
    updateMemberRole,
    updateMemberProfile,
    removeMember,
    removeInvitedUser,
    createMember,
    bulkCreateMembers,
    resendPasswordReset,
    setMemberPassword,
    addToOrganization,
    
    refetch: () => Promise.all([fetchMembers(), fetchInvites()]),
  };
};
