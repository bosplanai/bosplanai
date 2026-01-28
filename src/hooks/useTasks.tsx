// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";

export type TaskPriority = "high" | "medium" | "low";
export type TaskSubcategory = "weekly" | "monthly" | "quarterly" | "yearly" | "misc";

export interface TaskUser {
  id: string;
  full_name: string;
}

export interface TaskProject {
  id: string;
  title: string;
}

export interface TaskAssignmentUser {
  id: string;
  user_id: string;
  user?: TaskUser;
}

export type AssignmentStatus = "pending" | "accepted" | "declined";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "complete";
  icon: string;
  category: string;
  subcategory: TaskSubcategory;
  position: number;
  priority: TaskPriority;
  attachment_url: string | null;
  attachment_name: string | null;
  organization_id: string | null;
  assigned_user_id: string | null;
  created_by_user_id: string | null;
  project_id: string | null;
  assigned_user?: TaskUser | null;
  created_by_user?: TaskUser | null;
  project?: TaskProject | null;
  task_assignments?: TaskAssignmentUser[];
  created_at: string;
  due_date: string | null;
  completed_at: string | null;
  is_recurring: boolean;
  is_draft?: boolean;
  assignment_status: AssignmentStatus;
  decline_reason?: string | null;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { profile, organization } = useOrganization();
  const { toast } = useToast();

  // Helper to generate signed URL from file path
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  };

  const fetchTasks = async () => {
    if (!user || !profile || !organization) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name),
          created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name),
          project:projects!tasks_project_id_fkey(id, title),
          task_assignments(id, user_id, user:profiles!task_assignments_user_id_fkey(id, full_name))
        `)
        .eq("organization_id", organization.id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .or("is_draft.is.null,is_draft.eq.false")
        .eq("assignment_status", "accepted")
        .order("position", { ascending: true });

      if (error) throw error;

      // Defensive: supabase-js should return an array here, but if it doesn't,
      // avoid crashing and incorrectly showing a load error.
      const rows = Array.isArray(data) ? data : [];

      // Generate signed URLs for attachments
      const tasksWithSignedUrls = await Promise.all(
        rows.map(async (t) => {
          let signedUrl: string | null = null;
          // Check if attachment_url is a file path (not a full URL)
          if (t.attachment_url && !t.attachment_url.startsWith('http')) {
            signedUrl = await getSignedUrl(t.attachment_url);
          } else {
            signedUrl = t.attachment_url;
          }
          
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status as "todo" | "complete",
            icon: t.icon,
            category: t.category,
            subcategory: t.subcategory as TaskSubcategory,
            position: t.position,
            priority: t.priority as TaskPriority,
            attachment_url: signedUrl,
            attachment_name: t.attachment_name,
            attachment_path: t.attachment_url, // Store original path for reference
            organization_id: t.organization_id,
            assigned_user_id: t.assigned_user_id,
            created_by_user_id: t.created_by_user_id,
            project_id: t.project_id,
            assigned_user: t.assigned_user as TaskUser | null,
            created_by_user: t.created_by_user as TaskUser | null,
            project: t.project as TaskProject | null,
            task_assignments: (t.task_assignments || []) as TaskAssignmentUser[],
            created_at: t.created_at,
            due_date: t.due_date,
            completed_at: t.completed_at,
            is_recurring: t.is_recurring,
            is_draft: (t as any).is_draft ?? false,
            assignment_status: (t as any).assignment_status ?? "accepted",
            decline_reason: (t as any).decline_reason ?? null,
          };
        })
      );

      setTasks(tasksWithSignedUrls);
    } catch (error: any) {
      // Silently handle missing table/relationship errors for new organizations
      // PGRST205 = missing table, PGRST200 = missing relationship
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error fetching tasks:", {
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          raw: error,
        });
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, profile, organization]);

  // Real-time subscription for task changes to keep calendar in sync
  useEffect(() => {
    if (!organization || !user) return;

    const channel = supabase
      .channel(`tasks-realtime-${organization.id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          console.log('Task realtime update received:', payload);
          // Refetch tasks when any change occurs (including assignment_status changes)
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization, user]);

  // Expose refetch function for external use
  const refetchTasks = () => {
    fetchTasks();
  };

  const addTask = async (
    title: string,
    icon: string,
    category: string,
    priority: TaskPriority = "medium",
    description: string = "",
    subcategory: TaskSubcategory = "weekly",
    projectId: string | null = null,
    dueDate: string | null = null,
    assignedUserId: string | null = null,
    assignedUserIds: string[] = [],
    isRecurring: boolean = false,
    isDraft: boolean = false
  ): Promise<string | null> => {
    if (!user || !profile || !organization) return null;

    // Get the max position for this category and status
    const categoryTasks = tasks.filter(
      (t) => t.category === category && t.status === "todo"
    );
    const maxPosition = categoryTasks.length > 0
      ? Math.max(...categoryTasks.map((t) => t.position))
      : -1;

    try {
      // Determine assignment status: 'pending' if assigned to someone else, 'accepted' if self-assigned or unassigned
      const assignmentStatus = assignedUserId && assignedUserId !== user.id ? 'pending' : 'accepted';
      
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title,
          description: description.trim() || null,
          icon,
          category,
          subcategory,
          priority,
          status: "todo",
          user_id: user.id,
          organization_id: organization.id,
          position: maxPosition + 1,
          created_by_user_id: user.id,
          project_id: projectId,
          due_date: dueDate,
          assigned_user_id: assignedUserId,
          is_recurring: isRecurring,
          is_draft: isDraft,
          assignment_status: assignmentStatus,
        } as any)
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name),
          created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name),
          project:projects!tasks_project_id_fkey(id, title)
        `)
        .single();

      if (error) throw error;

      // Create additional task assignments for multi-user assignment
      if (assignedUserIds.length > 0) {
        const additionalAssignees = assignedUserIds.filter(id => id !== assignedUserId);
        if (additionalAssignees.length > 0) {
          await supabase
            .from("task_assignments")
            .insert(
              additionalAssignees.map(userId => ({
                task_id: data.id,
                user_id: userId,
                assigned_by: user.id,
              }))
            );
        }
      }

      // Generate signed URL for attachment if exists
      let signedUrl: string | null = null;
      if (data.attachment_url && !data.attachment_url.startsWith('http')) {
        signedUrl = await getSignedUrl(data.attachment_url);
      } else {
        signedUrl = data.attachment_url;
      }

      // Only add to local state if assignment_status is 'accepted' (matches what we fetch)
      const taskAssignmentStatus = (data as any).assignment_status;
      if (taskAssignmentStatus === 'accepted') {
        setTasks((prev) => [
          ...prev,
          {
            id: data.id,
            title: data.title,
            description: data.description,
            status: data.status as "todo" | "complete",
            icon: data.icon,
            category: data.category,
            subcategory: data.subcategory as TaskSubcategory,
            position: data.position,
            priority: data.priority as TaskPriority,
            attachment_url: signedUrl,
            attachment_name: data.attachment_name,
            organization_id: data.organization_id,
            assigned_user_id: data.assigned_user_id,
            created_by_user_id: data.created_by_user_id,
            project_id: data.project_id,
            assigned_user: data.assigned_user as TaskUser | null,
            created_by_user: data.created_by_user as TaskUser | null,
            project: data.project as TaskProject | null,
            task_assignments: [],
            created_at: data.created_at,
            due_date: data.due_date,
            completed_at: data.completed_at,
            is_recurring: data.is_recurring,
            assignment_status: taskAssignmentStatus as AssignmentStatus,
          },
        ]);
      }

      toast({
        title: "Task added",
        description: "Your task has been added successfully",
      });

      return data.id;
    } catch (error) {
      console.error("Error adding task:", error);
      toast({
        title: "Error",
        description: "Failed to add task",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateTaskStatus = async (taskId: string, status: "todo" | "complete") => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Get max position in new status column
    const targetTasks = tasks.filter(
      (t) => t.category === task.category && t.status === status
    );
    const maxPosition = targetTasks.length > 0
      ? Math.max(...targetTasks.map((t) => t.position))
      : -1;

    try {
      const completedAt = status === "complete" ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("tasks")
        .update({ status, position: maxPosition + 1, completed_at: completedAt })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status, position: maxPosition + 1, completed_at: completedAt } : t
        )
      );
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const reorderTasks = async (
    taskId: string,
    newStatus: "todo" | "complete",
    newPosition: number,
    category: string
  ) => {
    // Optimistic update
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (!task) return prev;

      const otherTasks = prev.filter((t) => t.id !== taskId);
      const sameCategoryAndStatus = otherTasks.filter(
        (t) => t.category === category && t.status === newStatus
      );

      // Update positions of tasks that need to shift
      const updatedOthers = otherTasks.map((t) => {
        if (t.category === category && t.status === newStatus && t.position >= newPosition) {
          return { ...t, position: t.position + 1 };
        }
        return t;
      });

      return [
        ...updatedOthers,
        { ...task, status: newStatus, position: newPosition },
      ];
    });

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, position: newPosition })
        .eq("id", taskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error reordering task:", error);
      // Refetch on error to restore correct state
      fetchTasks();
      toast({
        title: "Error",
        description: "Failed to reorder task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((task) => task.id !== taskId));

      toast({
        title: "Task moved to recycling bin",
        description: "Task will be permanently deleted after 30 days",
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const updateTaskAttachment = async (taskId: string, filePath: string | null, attachmentName: string | null) => {
    try {
      // Store file path in DB
      const { error } = await supabase
        .from("tasks")
        .update({ attachment_url: filePath, attachment_name: attachmentName })
        .eq("id", taskId);

      if (error) throw error;

      // Generate signed URL for display
      let signedUrl: string | null = null;
      if (filePath) {
        signedUrl = await getSignedUrl(filePath);
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, attachment_url: signedUrl, attachment_name: attachmentName } : t
        )
      );

      toast({
        title: filePath ? "Attachment added" : "Attachment removed",
      });
    } catch (error) {
      console.error("Error updating attachment:", error);
      toast({
        title: "Error",
        description: "Failed to update attachment",
        variant: "destructive",
      });
    }
  };

  const updateTaskPriority = async (taskId: string, priority: TaskPriority) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ priority })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, priority } : t
        )
      );
    } catch (error) {
      console.error("Error updating priority:", error);
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
      });
    }
  };

  const updateTaskTitle = async (taskId: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ title: trimmedTitle })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, title: trimmedTitle } : t
        )
      );
    } catch (error) {
      console.error("Error updating task title:", error);
      toast({
        title: "Error",
        description: "Failed to update task title",
        variant: "destructive",
      });
    }
  };

  const updateTaskDescription = async (taskId: string, description: string) => {
    const trimmedDescription = description.trim();
    const newDescription = trimmedDescription || null;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ description: newDescription })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, description: newDescription } : t
        )
      );
    } catch (error) {
      console.error("Error updating task description:", error);
      toast({
        title: "Error",
        description: "Failed to update task description",
        variant: "destructive",
      });
    }
  };

  const updateTaskAssignment = async (taskId: string, assignedUserId: string | null) => {
    try {
      // Determine assignment status: 'pending' if assigned to someone else, 'accepted' if self-assigned or unassigned
      const assignmentStatus = assignedUserId && assignedUserId !== user?.id ? 'pending' : 'accepted';
      
      const { data, error } = await supabase
        .from("tasks")
        .update({ 
          assigned_user_id: assignedUserId,
          assignment_status: assignmentStatus,
          // Reset decline reason and reminder when reassigning
          decline_reason: null,
          last_reminder_sent_at: null,
        })
        .eq("id", taskId)
        .select(`
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name)
        `)
        .single();

      if (error) throw error;

      if (assignmentStatus === 'pending') {
        // Task is now pending - remove from local state as it won't appear in the 'accepted' task list
        // The assignee will see it in their pending task requests
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        
        toast({
          title: "Task request sent",
          description: `${data.assigned_user?.full_name || 'The user'} will need to accept or decline this task`,
        });
      } else {
        // Self-assigned or unassigned - update in place
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  assigned_user_id: assignedUserId,
                  assigned_user: data.assigned_user as TaskUser | null,
                  assignment_status: assignmentStatus as AssignmentStatus,
                }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Error updating task assignment:", error);
      toast({
        title: "Error",
        description: "Failed to update task assignment",
        variant: "destructive",
      });
    }
  };

  const updateTaskDueDate = async (taskId: string, dueDate: string | null) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ due_date: dueDate })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, due_date: dueDate } : t
        )
      );
    } catch (error) {
      console.error("Error updating due date:", error);
      toast({
        title: "Error",
        description: "Failed to update due date",
        variant: "destructive",
      });
    }
  };

  const updateTaskProject = async (taskId: string, projectId: string | null) => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .update({ project_id: projectId })
        .eq("id", taskId)
        .select(`project:projects!tasks_project_id_fkey(id, title)`)
        .single();

      if (error) throw error;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                project_id: projectId,
                project: data.project as TaskProject | null,
              }
            : t
        )
      );
    } catch (error) {
      console.error("Error updating task project:", error);
      toast({
        title: "Error",
        description: "Failed to update task project",
        variant: "destructive",
      });
    }
  };

  // Fetch draft tasks
  const fetchDraftTasks = async (): Promise<Task[]> => {
    if (!user || !organization) return [];

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name),
          created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name),
          project:projects!tasks_project_id_fkey(id, title)
        `)
        .eq("organization_id", organization.id)
        .eq("is_draft", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status as "todo" | "complete",
        icon: t.icon,
        category: t.category,
        subcategory: t.subcategory as TaskSubcategory,
        position: t.position,
        priority: t.priority as TaskPriority,
        attachment_url: t.attachment_url,
        attachment_name: t.attachment_name,
        organization_id: t.organization_id,
        assigned_user_id: t.assigned_user_id,
        created_by_user_id: t.created_by_user_id,
        project_id: t.project_id,
        assigned_user: t.assigned_user as TaskUser | null,
        created_by_user: t.created_by_user as TaskUser | null,
        project: t.project as TaskProject | null,
        created_at: t.created_at,
        due_date: t.due_date,
        completed_at: t.completed_at,
        is_recurring: t.is_recurring,
        is_draft: true,
        assignment_status: ((t as any).assignment_status ?? 'accepted') as AssignmentStatus,
      }));
    } catch (error) {
      console.error("Error fetching draft tasks:", error);
      return [];
    }
  };

  // Publish a draft task
  const publishDraft = async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_draft: false } as any)
        .eq("id", taskId);

      if (error) throw error;

      fetchTasks();
      toast({
        title: "Task Published",
        description: "Your draft has been published to the dashboard",
      });
      return true;
    } catch (error) {
      console.error("Error publishing draft:", error);
      toast({
        title: "Error",
        description: "Failed to publish draft",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    tasks,
    loading,
    addTask,
    updateTaskStatus,
    reorderTasks,
    deleteTask,
    updateTaskPriority,
    updateTaskTitle,
    updateTaskDescription,
    updateTaskAssignment,
    updateTaskDueDate,
    updateTaskProject,
    refetch: fetchTasks,
    fetchDraftTasks,
    publishDraft,
  };
};
