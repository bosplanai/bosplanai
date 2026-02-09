import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

export interface ProjectTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  category: string;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  attachment_url?: string | null; // signed URL (or null)
  attachment_name?: string | null;
  created_by_user_id?: string | null;
}

export const useProjectTasks = (projectId: string | null) => {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isMember, isViewer } = useUserRole();

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
            category,
            assigned_user_id,
            created_by_user_id,
            attachment_url,
            attachment_name,
            task_assignments(user_id)
          `
          )
          .eq("project_id", projectId)
          .is("deleted_at", null);

        if (error) throw error;

        // Filter tasks based on user role:
        // - Admin: sees all tasks within the project
        // - Manager: sees only Product Management (category = "product") tasks
        // - Viewer: sees only tasks they are assigned to or created
        let filteredData = data || [];
        
        if (!isAdmin) {
          if (isMember) {
            // Managers see only Product Management tasks within the project
            filteredData = filteredData.filter((t) => t.category === "product");
          } else if (isViewer && user) {
            // Viewers see only tasks they created or are assigned to
            filteredData = filteredData.filter((t) => {
              const isCreator = t.created_by_user_id === user.id;
              const isAssigned = t.assigned_user_id === user.id;
              const hasTaskAssignment = (t.task_assignments || []).some(
                (a: any) => a.user_id === user.id
              );
              return isCreator || isAssigned || hasTaskAssignment;
            });
          }
        }

        const sortedTasks = filteredData.sort((a, b) => {
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
              category: t.category,
              assigned_user_id: t.assigned_user_id,
              created_by_user_id: t.created_by_user_id,
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
  }, [projectId, isAdmin, isMember, isViewer, user?.id]);

  return { tasks, loading };
};

