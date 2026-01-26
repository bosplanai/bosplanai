import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  attachment_url?: string | null; // signed URL (or null)
  attachment_name?: string | null;
}

export const useProjectTasks = (projectId: string | null) => {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    const fetchTasks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("tasks")
          .select(
            `
            id,
            title,
            due_date,
            priority,
            status,
            assigned_user_id,
            attachment_url,
            attachment_name
          `
          )
          .eq("project_id", projectId)
          .is("deleted_at", null);

        if (error) throw error;

        const sortedTasks = (data || []).sort((a, b) => {
          if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          }
          if (a.due_date && !b.due_date) return -1;
          if (!a.due_date && b.due_date) return 1;
          return 0;
        });

        const tasksWithSignedUrls: ProjectTask[] = await Promise.all(
          sortedTasks.map(async (t) => {
            let signedAttachmentUrl: string | null = t.attachment_url ?? null;
            if (signedAttachmentUrl && !signedAttachmentUrl.startsWith("http")) {
              signedAttachmentUrl = await getSignedUrl(signedAttachmentUrl);
            }

            return {
              id: t.id,
              title: t.title,
              due_date: t.due_date,
              priority: t.priority,
              status: t.status,
              assigned_user_id: t.assigned_user_id,
              attachment_url: signedAttachmentUrl,
              attachment_name: t.attachment_name,
            };
          })
        );

        const userIds = [
          ...new Set(
            tasksWithSignedUrls
              .map((t) => t.assigned_user_id)
              .filter((id): id is string => !!id)
          ),
        ];

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds);

          const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

          setTasks(
            tasksWithSignedUrls.map((task) => ({
              ...task,
              assigned_user_name: task.assigned_user_id
                ? profileMap.get(task.assigned_user_id) || undefined
                : undefined,
            }))
          );
        } else {
          setTasks(tasksWithSignedUrls);
        }
      } catch (error) {
        console.error("Error fetching project tasks:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [projectId]);

  return { tasks, loading };
};

