import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export type TemplateCategory = "operations" | "strategic" | "product" | "general";
export type TemplateType = "task" | "document";

export interface TemplateTask {
  id: string;
  template_id: string;
  template_version_id: string;
  title: string;
  description: string | null;
  priority: string;
  icon: string | null;
  position: number;
  default_board: string | null;
  created_at: string;
}

export interface TemplateDocument {
  id: string;
  template_id: string;
  template_version_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  drive_file_id: string | null;
  created_at: string;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  version_note: string | null;
  created_by: string | null;
  created_at: string;
  tasks?: TemplateTask[];
  documents?: TemplateDocument[];
}

export interface Template {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  template_type: TemplateType;
  folder_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  versions?: TemplateVersion[];
  created_by_profile?: {
    full_name: string;
  };
  latest_version?: TemplateVersion;
}

export const useTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchTemplates = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      
      // Fetch templates with creator info
      const { data: templatesData, error: templatesError } = await supabase
        .from("templates")
        .select(`
          *,
          created_by_profile:profiles!templates_created_by_fkey(full_name)
        `)
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (templatesError) throw templatesError;

      // For each template, fetch the latest version with its tasks/documents
      const templatesWithVersions = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: versionData } = await supabase
            .from("template_versions")
            .select("*")
            .eq("template_id", template.id)
            .order("version_number", { ascending: false })
            .limit(1)
            .single();

          let latestVersion: any = versionData;

          if (latestVersion) {
            // Fetch tasks for this version
            const { data: tasksData } = await supabase
              .from("template_tasks")
              .select("*")
              .eq("template_version_id", latestVersion.id)
              .order("position", { ascending: true });

            // Fetch documents for this version
            const { data: docsData } = await supabase
              .from("template_documents")
              .select("*")
              .eq("template_version_id", latestVersion.id);

            latestVersion = {
              ...latestVersion,
              tasks: tasksData || [],
              documents: docsData || [],
            };
          }

          return {
            ...template,
            latest_version: latestVersion,
          };
        })
      );

      setTemplates(templatesWithVersions as Template[]);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (
    name: string,
    description: string,
    category: TemplateCategory,
    templateType: TemplateType,
    tasks: Omit<TemplateTask, "id" | "template_id" | "template_version_id" | "created_at">[],
    documents?: Omit<TemplateDocument, "id" | "template_id" | "template_version_id" | "created_at">[]
  ) => {
    if (!organization?.id || !user?.id) return null;

    try {
      // Get user's profile id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profileData) throw new Error("Profile not found");

      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from("templates")
        .insert({
          organization_id: organization.id,
          name,
          description,
          category,
          template_type: templateType,
          created_by: profileData.id,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create initial version
      const { data: versionData, error: versionError } = await supabase
        .from("template_versions")
        .insert({
          template_id: templateData.id,
          version_number: 1,
          version_note: "Initial version",
          created_by: profileData.id,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Create tasks
      if (tasks.length > 0) {
        const tasksToInsert = tasks.map((task, index) => ({
          template_id: templateData.id,
          template_version_id: versionData.id,
          title: task.title,
          description: task.description,
          priority: task.priority || "medium",
          icon: task.icon,
          position: task.position ?? index,
          default_board: task.default_board,
        }));

        const { error: tasksError } = await supabase
          .from("template_tasks")
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      // Create documents if any
      if (documents && documents.length > 0) {
        const docsToInsert = documents.map((doc) => ({
          template_id: templateData.id,
          template_version_id: versionData.id,
          file_name: doc.file_name,
          file_path: doc.file_path,
          file_size: doc.file_size || 0,
          mime_type: doc.mime_type,
          drive_file_id: doc.drive_file_id,
        }));

        const { error: docsError } = await supabase
          .from("template_documents")
          .insert(docsToInsert);

        if (docsError) throw docsError;
      }

      toast({
        title: "Success",
        description: "Template created successfully",
      });

      await fetchTemplates();
      return templateData;
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTemplate = async (
    templateId: string,
    updates: {
      name?: string;
      description?: string;
      category?: TemplateCategory;
    },
    newTasks?: Omit<TemplateTask, "id" | "template_id" | "template_version_id" | "created_at">[],
    versionNote?: string
  ) => {
    if (!user?.id) return false;

    try {
      // Update template metadata
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("templates")
          .update(updates)
          .eq("id", templateId);

        if (updateError) throw updateError;
      }

      // If new tasks provided, create a new version
      if (newTasks) {
        // Get current max version number
        const { data: maxVersion } = await supabase
          .from("template_versions")
          .select("version_number")
          .eq("template_id", templateId)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();

        const newVersionNumber = (maxVersion?.version_number || 0) + 1;

        // Create new version
        const { data: versionData, error: versionError } = await supabase
          .from("template_versions")
          .insert({
            template_id: templateId,
            version_number: newVersionNumber,
            version_note: versionNote || `Version ${newVersionNumber}`,
            created_by: user.id,
          })
          .select()
          .single();

        if (versionError) throw versionError;

        // Create tasks for new version
        if (newTasks.length > 0) {
          const tasksToInsert = newTasks.map((task, index) => ({
            template_id: templateId,
            template_version_id: versionData.id,
            title: task.title,
            description: task.description,
            priority: task.priority || "medium",
            icon: task.icon,
            position: task.position ?? index,
            default_board: task.default_board,
          }));

          const { error: tasksError } = await supabase
            .from("template_tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }
      }

      toast({
        title: "Success",
        description: "Template updated successfully",
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from("templates")
        .update({ is_active: false })
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template deleted successfully",
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
      return false;
    }
  };

  const getTemplateVersions = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from("template_versions")
        .select(`
          *,
          created_by_profile:profiles!template_versions_created_by_fkey(full_name)
        `)
        .eq("template_id", templateId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      // Fetch tasks for each version
      const versionsWithTasks = await Promise.all(
        (data || []).map(async (version) => {
          const { data: tasksData } = await supabase
            .from("template_tasks")
            .select("*")
            .eq("template_version_id", version.id)
            .order("position", { ascending: true });

          return {
            ...version,
            tasks: tasksData || [],
          };
        })
      );

      return versionsWithTasks;
    } catch (error: any) {
      console.error("Error fetching template versions:", error);
      return [];
    }
  };

  const rollbackToVersion = async (templateId: string, versionId: string, versionNumber: number) => {
    if (!user?.id) return false;

    try {
      // Get tasks from the specified version
      const { data: oldTasks, error: tasksError } = await supabase
        .from("template_tasks")
        .select("*")
        .eq("template_version_id", versionId);

      if (tasksError) throw tasksError;

      // Get current max version number
      const { data: maxVersion } = await supabase
        .from("template_versions")
        .select("version_number")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();

      const newVersionNumber = (maxVersion?.version_number || 0) + 1;

      // Create new version as rollback
      const { data: versionData, error: versionError } = await supabase
        .from("template_versions")
        .insert({
          template_id: templateId,
          version_number: newVersionNumber,
          version_note: `Rolled back to version ${versionNumber}`,
          created_by: user.id,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // Copy tasks to new version
      if (oldTasks && oldTasks.length > 0) {
        const tasksToInsert = oldTasks.map((task) => ({
          template_id: templateId,
          template_version_id: versionData.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          icon: task.icon,
          position: task.position,
          default_board: task.default_board,
        }));

        const { error: insertError } = await supabase
          .from("template_tasks")
          .insert(tasksToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: `Rolled back to version ${versionNumber}`,
      });

      await fetchTemplates();
      return true;
    } catch (error: any) {
      console.error("Error rolling back version:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to rollback version",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates();
    }
  }, [organization?.id]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplateVersions,
    rollbackToVersion,
  };
};
