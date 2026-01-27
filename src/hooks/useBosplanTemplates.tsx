import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type BosplanTemplateCategory = 
  | "business_management" 
  | "accounting_management" 
  | "marketing" 
  | "team_management";

export interface BosplanTemplate {
  id: string;
  name: string;
  description: string | null;
  category: BosplanTemplateCategory;
  template_type: "task" | "document";
  file_name: string | null;
  file_path: string | null;
  file_size: number;
  mime_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export const BOSPLAN_CATEGORY_LABELS: Record<BosplanTemplateCategory, string> = {
  business_management: "Business Management",
  accounting_management: "Accounting Management",
  marketing: "Marketing",
  team_management: "Team Management",
};

export const BOSPLAN_CATEGORY_COLORS: Record<BosplanTemplateCategory, string> = {
  business_management: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  accounting_management: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  marketing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  team_management: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export const useBosplanTemplates = () => {
  const [templates, setTemplates] = useState<BosplanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bosplan_templates")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as BosplanTemplate[]);
    } catch (error: any) {
      // Silently handle missing table/relationship errors for new organizations
      // PGRST205 = missing table, PGRST200 = missing relationship
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error fetching Bosplan templates:", error);
        toast({
          title: "Error",
          description: "Failed to load Bosplan templates",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getTemplatesByCategory = (category: BosplanTemplateCategory) => {
    return templates.filter((t) => t.category === category);
  };

  const downloadTemplate = async (template: BosplanTemplate) => {
    if (!template.file_path) {
      toast({
        title: "Error",
        description: "No file available for this template",
        variant: "destructive",
      });
      return;
    }

    try {
      let blob: Blob;

      // Check if it's a public folder path (starts with /templates/)
      if (template.file_path.startsWith("/templates/")) {
        const response = await fetch(template.file_path);
        if (!response.ok) throw new Error("Failed to fetch template");
        blob = await response.blob();
      } else {
        // Use Supabase storage for other paths
        const { data, error } = await supabase.storage
          .from("drive-files")
          .download(template.file_path);

        if (error) throw error;
        blob = data;
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = template.file_name || "template";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Template downloaded successfully",
      });
    } catch (error: any) {
      console.error("Error downloading template:", error);
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    fetchTemplates,
    getTemplatesByCategory,
    downloadTemplate,
  };
};
