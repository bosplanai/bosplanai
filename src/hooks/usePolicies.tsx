import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Policy {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  file_id: string | null;
  current_version: number;
  status: "active" | "draft" | "archived" | "expired";
  effective_date: string | null;
  expiry_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tags?: PolicyTag[];
  file?: {
    id: string;
    name: string;
    file_path: string;
    mime_type: string | null;
  } | null;
}

export interface PolicyTag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;
  file_id: string | null;
  change_notes: string | null;
  created_by: string | null;
  created_at: string;
  file?: {
    id: string;
    name: string;
    file_path: string;
    mime_type: string | null;
  } | null;
  creator?: {
    full_name: string;
  } | null;
}

export interface CreatePolicyData {
  title: string;
  description?: string;
  file_id?: string;
  effective_date?: string;
  expiry_date?: string;
  tag_ids?: string[];
  status?: "active" | "draft";
}

export interface UpdatePolicyData {
  id: string;
  title?: string;
  description?: string;
  file_id?: string;
  effective_date?: string;
  expiry_date?: string;
  status?: "active" | "draft" | "archived" | "expired";
  tag_ids?: string[];
  change_notes?: string;
}

export const usePolicies = () => {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check for expired policies and create notifications on mount
  const { data: expiredChecked } = useQuery({
    queryKey: ["check-expired-policies", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return false;
      
      // Call the database function to check and notify about expired policies
      const { error } = await supabase.rpc("check_expired_policies");
      
      if (error) {
        console.error("Error checking expired policies:", error);
      }
      
      return true;
    },
    enabled: !!organization?.id,
    staleTime: 1000 * 60 * 5, // Only check every 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch all policies
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["policies", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("policies")
        .select(`
          *,
          file:drive_files(id, name, file_path, mime_type)
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch tags for each policy
      const policyIds = data.map((p: any) => p.id);
      const { data: tagAssignments } = await supabase
        .from("policy_tag_assignments")
        .select(`
          policy_id,
          tag:policy_tags(*)
        `)
        .in("policy_id", policyIds.length > 0 ? policyIds : ["none"]);

      // Map tags to policies
      const policiesWithTags = data.map((policy: any) => ({
        ...policy,
        tags: tagAssignments
          ?.filter((ta: any) => ta.policy_id === policy.id)
          .map((ta: any) => ta.tag) || [],
      }));

      return policiesWithTags as Policy[];
    },
    enabled: !!organization?.id,
  });

  // Fetch all policy tags
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["policy-tags", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from("policy_tags")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");

      if (error) throw error;
      return data as PolicyTag[];
    },
    enabled: !!organization?.id,
  });

  // Fetch policy versions
  const usePolicyVersions = (policyId: string | null) => {
    return useQuery({
      queryKey: ["policy-versions", policyId],
      queryFn: async () => {
        if (!policyId) return [];

        const { data, error } = await supabase
          .from("policy_versions")
          .select(`
            *,
            file:drive_files(id, name, file_path, mime_type)
          `)
          .eq("policy_id", policyId)
          .order("version_number", { ascending: false });

        if (error) throw error;

        // Fetch creator names
        const creatorIds = data.filter((v: any) => v.created_by).map((v: any) => v.created_by);
        let creators: Record<string, string> = {};
        
        if (creatorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", creatorIds);
          
          profiles?.forEach((p: any) => {
            creators[p.id] = p.full_name;
          });
        }

        return data.map((v: any) => ({
          ...v,
          creator: v.created_by ? { full_name: creators[v.created_by] || "Unknown" } : null,
        })) as PolicyVersion[];
      },
      enabled: !!policyId,
    });
  };

  // Create policy mutation
  const createPolicyMutation = useMutation({
    mutationFn: async (data: CreatePolicyData) => {
      if (!organization?.id || !user?.id) throw new Error("Not authenticated");

      const { data: policy, error } = await supabase
        .from("policies")
        .insert({
          organization_id: organization.id,
          title: data.title,
          description: data.description,
          file_id: data.file_id,
          effective_date: data.effective_date,
          expiry_date: data.expiry_date,
          status: data.status || "active",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial version
      await supabase.from("policy_versions").insert({
        policy_id: policy.id,
        version_number: 1,
        file_id: data.file_id,
        change_notes: "Initial version",
        created_by: user.id,
      });

      // Assign tags
      if (data.tag_ids && data.tag_ids.length > 0) {
        await supabase.from("policy_tag_assignments").insert(
          data.tag_ids.map((tagId) => ({
            policy_id: policy.id,
            tag_id: tagId,
          }))
        );
      }

      return policy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create policy");
    },
  });

  // Update policy mutation
  const updatePolicyMutation = useMutation({
    mutationFn: async (data: UpdatePolicyData) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { id, tag_ids, change_notes, ...updateData } = data;

      // Check if file changed (new version)
      const { data: currentPolicy } = await supabase
        .from("policies")
        .select("file_id, current_version")
        .eq("id", id)
        .single();

      const isNewVersion = updateData.file_id && updateData.file_id !== currentPolicy?.file_id;

      const newVersion = isNewVersion
        ? (currentPolicy?.current_version || 0) + 1
        : currentPolicy?.current_version;

      const { error } = await supabase
        .from("policies")
        .update({
          ...updateData,
          current_version: newVersion,
        })
        .eq("id", id);

      if (error) throw error;

      // Create new version entry if file changed
      if (isNewVersion) {
        await supabase.from("policy_versions").insert({
          policy_id: id,
          version_number: newVersion,
          file_id: updateData.file_id,
          change_notes: change_notes || `Updated to version ${newVersion}`,
          created_by: user.id,
        });
      }

      // Update tags if provided
      if (tag_ids !== undefined) {
        await supabase.from("policy_tag_assignments").delete().eq("policy_id", id);

        if (tag_ids.length > 0) {
          await supabase.from("policy_tag_assignments").insert(
            tag_ids.map((tagId) => ({
              policy_id: id,
              tag_id: tagId,
            }))
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      queryClient.invalidateQueries({ queryKey: ["policy-versions"] });
      toast.success("Policy updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update policy");
    },
  });

  // Archive policy mutation
  const archivePolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await supabase
        .from("policies")
        .update({ status: "archived" })
        .eq("id", policyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy archived successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to archive policy");
    },
  });

  // Restore policy mutation
  const restorePolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await supabase
        .from("policies")
        .update({ status: "active" })
        .eq("id", policyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy restored successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore policy");
    },
  });

  // Delete policy mutation
  const deletePolicyMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const { error } = await supabase.from("policies").delete().eq("id", policyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Policy deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete policy");
    },
  });

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!organization?.id) throw new Error("No organization");

      const { error } = await supabase.from("policy_tags").insert({
        organization_id: organization.id,
        name,
        color,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-tags"] });
      toast.success("Tag created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create tag");
    },
  });

  // Get policies expiring soon (within 30 days)
  const expiringPolicies = policies.filter((policy) => {
    if (!policy.expiry_date || policy.status !== "active") return false;
    const expiryDate = new Date(policy.expiry_date);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  return {
    policies,
    policiesLoading,
    tags,
    tagsLoading,
    usePolicyVersions,
    expiringPolicies,
    createPolicy: createPolicyMutation.mutateAsync,
    updatePolicy: updatePolicyMutation.mutateAsync,
    archivePolicy: archivePolicyMutation.mutateAsync,
    restorePolicy: restorePolicyMutation.mutateAsync,
    deletePolicy: deletePolicyMutation.mutateAsync,
    createTag: createTagMutation.mutateAsync,
    isCreating: createPolicyMutation.isPending,
    isUpdating: updatePolicyMutation.isPending,
  };
};
