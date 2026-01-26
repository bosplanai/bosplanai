import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";

export interface ResponseTemplate {
  id: string;
  organization_id: string;
  name: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useResponseTemplates = () => {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    if (!organization?.id) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("helpdesk_response_templates")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true });

      if (error) throw error;

      setTemplates((data || []) as ResponseTemplate[]);
    } catch (error) {
      console.error("Error fetching response templates:", error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const createTemplate = async (name: string, content: string) => {
    if (!organization?.id) return null;

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("helpdesk_response_templates")
        .insert({
          organization_id: organization.id,
          name,
          content,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates((prev) => [...prev, data as ResponseTemplate]);

      toast({
        title: "Template saved",
        description: "Your response template has been saved successfully.",
      });

      return data;
    } catch (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTemplate = async (id: string, name: string, content: string) => {
    try {
      const { error } = await supabase
        .from("helpdesk_response_templates")
        .update({ name, content, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name, content } : t))
      );

      toast({
        title: "Template updated",
        description: "Your response template has been updated.",
      });
    } catch (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("helpdesk_response_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTemplates((prev) => prev.filter((t) => t.id !== id));

      toast({
        title: "Template deleted",
        description: "The response template has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
};
