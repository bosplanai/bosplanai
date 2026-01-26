import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface TaskUrl {
  id: string;
  task_id: string;
  url: string;
  title: string | null;
  created_at: string;
  created_by: string;
}

export const useTaskUrls = (taskId: string | null) => {
  const [urls, setUrls] = useState<TaskUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUrls = useCallback(async () => {
    if (!taskId) {
      setUrls([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("task_urls")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setUrls(data || []);
    } catch (error) {
      console.error("Error fetching task URLs:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const addUrl = async (
    url: string,
    title: string | null,
    organizationId: string
  ): Promise<TaskUrl | null> => {
    if (!taskId) return null;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    try {
      const { data, error } = await supabase
        .from("task_urls")
        .insert({
          task_id: taskId,
          organization_id: organizationId,
          url: url.trim(),
          title: title?.trim() || null,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setUrls((prev) => [...prev, data]);
      toast({ title: "URL added" });
      return data;
    } catch (error: any) {
      console.error("Error adding URL:", error);
      toast({
        title: "Failed to add URL",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteUrl = async (urlId: string) => {
    try {
      const { error } = await supabase
        .from("task_urls")
        .delete()
        .eq("id", urlId);

      if (error) throw error;

      setUrls((prev) => prev.filter((u) => u.id !== urlId));
      toast({ title: "URL removed" });
    } catch (error: any) {
      console.error("Error deleting URL:", error);
      toast({
        title: "Failed to remove URL",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    urls,
    loading,
    addUrl,
    deleteUrl,
    refetch: fetchUrls,
  };
};
