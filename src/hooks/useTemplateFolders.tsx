import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

export interface TemplateFolder {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useTemplateFolders = () => {
  const [folders, setFolders] = useState<TemplateFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchFolders = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("template_folders")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (error: any) {
      // Silently handle missing table/relationship errors for new organizations
      // PGRST205 = missing table, PGRST200 = missing relationship
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error fetching template folders:", error);
        toast({
          title: "Error",
          description: "Failed to load folders",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async (
    name: string,
    description?: string,
    color?: string,
    icon?: string
  ) => {
    if (!organization?.id || !user?.id) return null;

    try {
      const { data, error } = await supabase
        .from("template_folders")
        .insert({
          organization_id: organization.id,
          name,
          description: description || null,
          color: color || "#6366f1",
          icon: icon || "folder",
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder created successfully",
      });

      await fetchFolders();
      return data;
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateFolder = async (
    folderId: string,
    updates: {
      name?: string;
      description?: string;
      color?: string;
      icon?: string;
    }
  ) => {
    try {
      const { error } = await supabase
        .from("template_folders")
        .update(updates)
        .eq("id", folderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder updated successfully",
      });

      await fetchFolders();
      return true;
    } catch (error: any) {
      console.error("Error updating folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update folder",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      const { error } = await supabase
        .from("template_folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder deleted successfully",
      });

      await fetchFolders();
      return true;
    } catch (error: any) {
      console.error("Error deleting folder:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete folder",
        variant: "destructive",
      });
      return false;
    }
  };

  const moveTemplateToFolder = async (templateId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from("templates")
        .update({ folder_id: folderId })
        .eq("id", templateId);

      if (error) throw error;

      return true;
    } catch (error: any) {
      console.error("Error moving template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to move template",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchFolders();
    }
  }, [organization?.id]);

  return {
    folders,
    loading,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveTemplateToFolder,
  };
};
