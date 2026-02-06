// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";

export type TaskPriority = "high" | "medium" | "low";
export type TaskSubcategory = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

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
  assignment_status?: string;
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
  
  // Refs to avoid stale closures in realtime subscription
  const userRef = useRef(user);
  const profileRef = useRef(profile);
  const organizationRef = useRef(organization);
  
  // Keep refs updated
  useEffect(() => {
    userRef.current = user;
    profileRef.current = profile;
    organizationRef.current = organization;
  }, [user, profile, organization]);

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

  const fetchTasks = useCallback(async () => {
    const currentUser = userRef.current;
    const currentProfile = profileRef.current;
    const currentOrganization = organizationRef.current;
    
    if (!currentUser || !currentProfile || !currentOrganization) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch tasks with assignment details to filter by per-user acceptance
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name),
          created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name),
          project:projects!tasks_project_id_fkey(id, title),
          task_assignments(id, user_id, assignment_status, user:profiles!task_assignments_user_id_fkey(id, full_name))
        `)
        .eq("organization_id", currentOrganization.id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .or("is_draft.is.null,is_draft.eq.false")
        .order("position", { ascending: true });

      if (error) throw error;

      // Defensive: supabase-js should return an array here, but if it doesn't,
      // avoid crashing and incorrectly showing a load error.
      const rows = Array.isArray(data) ? data : [];

      // Filter tasks based on per-assignee acceptance:
      // - Task appears on user's board if they have an accepted assignment
      // - Task appears on creator's board if at least one assignee accepted OR no assignees exist
      const filteredRows = rows.filter((t: any) => {
        const assignments = t.task_assignments || [];
        const userHasAcceptedAssignment = assignments.some(
          (a: any) => a.user_id === currentUser.id && a.assignment_status === "accepted"
        );
        const anyAssigneeAccepted = assignments.some(
          (a: any) => a.assignment_status === "accepted"
        );
        const userIsCreator = t.created_by_user_id === currentUser.id;
        const hasNoAssignments = assignments.length === 0;
        
        // User sees task if:
        // 1. They have personally accepted the assignment, OR
        // 2. They created the task AND (at least one person has accepted OR there are no assignments)
        return userHasAcceptedAssignment || (userIsCreator && (anyAssigneeAccepted || hasNoAssignments));
      });

      // Generate signed URLs for attachments
      const tasksWithSignedUrls = await Promise.all(
        filteredRows.map(async (t: any) => {
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
  }, [toast]);

  useEffect(() => {
    fetchTasks();
  }, [user, profile, organization, fetchTasks]);

  // Real-time subscription for task changes to keep all assignees in sync
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
          // Refetch tasks when any change occurs (status changes, updates, etc.)
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments',
        },
        (payload) => {
          console.log('Task assignment realtime update received:', payload);
          // Refetch when assignments change (accept/decline/reassign)
          fetchTasks();
        }
      )
      .subscribe((status) => {
        console.log('Tasks realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, user?.id, fetchTasks]);

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
      // Create the task without assignment - assignments are handled separately in task_assignments
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
          assigned_user_id: assignedUserId, // Keep for backward compatibility / primary assignee
          is_recurring: isRecurring,
          is_draft: isDraft,
          assignment_status: "accepted", // Task-level status deprecated in favor of per-assignment status
        } as any)
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name),
          created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name),
          project:projects!tasks_project_id_fkey(id, title)
        `)
        .single();

      if (error) throw error;

      // Collect all assignees: primary + additional
      const allAssigneeIds = assignedUserId 
        ? [assignedUserId, ...assignedUserIds.filter(id => id !== assignedUserId)]
        : assignedUserIds;
      
      // Create task_assignments for all assignees with proper per-user status
      if (allAssigneeIds.length > 0) {
        const assignmentInserts = allAssigneeIds.map(userId => ({
          task_id: data.id,
          user_id: userId,
          assigned_by: user.id,
          assignment_status: userId === user.id ? "accepted" : "pending",
          accepted_at: userId === user.id ? new Date().toISOString() : null,
        }));

        await supabase.from("task_assignments").insert(assignmentInserts);
      }

      // Generate signed URL for attachment if exists
      let signedUrl: string | null = null;
      if (data.attachment_url && !data.attachment_url.startsWith('http')) {
        signedUrl = await getSignedUrl(data.attachment_url);
      } else {
        signedUrl = data.attachment_url;
      }

      // Check if current user has an accepted assignment (self-assigned) OR there are no assignees
      const userHasAcceptedAssignment = allAssigneeIds.includes(user.id) && 
        allAssigneeIds.length > 0 && 
        allAssigneeIds.some(id => id === user.id);
      const hasNoAssignees = allAssigneeIds.length === 0;
      
      // Add to local state if user self-assigned (accepted) OR task has no assignees (creator sees it)
      if (userHasAcceptedAssignment || hasNoAssignees) {
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
            task_assignments: allAssigneeIds.map(id => ({
              id: '',
              user_id: id,
              assignment_status: id === user.id ? 'accepted' : 'pending',
            })),
            created_at: data.created_at,
            due_date: data.due_date,
            completed_at: data.completed_at,
            is_recurring: data.is_recurring,
            assignment_status: "accepted" as AssignmentStatus,
          },
        ]);
      }

      // Show different toast based on whether all assignees are self or include others
      const hasOtherAssignees = allAssigneeIds.some(id => id !== user.id);
      if (hasOtherAssignees) {
        const otherCount = allAssigneeIds.filter(id => id !== user.id).length;
        toast({
          title: "Task sent for approval",
          description: `Task request sent to ${otherCount} team member${otherCount > 1 ? 's' : ''}. They must accept before the task appears on their dashboard.`,
        });
      } else if (allAssigneeIds.length > 0) {
        toast({
          title: "Task added",
          description: "Your task has been added successfully",
        });
      } else {
        toast({
          title: "Task added",
          description: "Task created without assignees",
        });
      }

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

  const updateTaskAssignment = async (taskId: string, assignedUserId: string | null, reassignmentReason?: string) => {
    try {
      if (assignedUserId && assignedUserId !== user?.id) {
        // Reassigning to someone else - use the SECURITY DEFINER RPC
        // This sets assignment_status to 'pending', clears decline_reason and last_reminder_sent_at,
        // stores the reassignment reason, and triggers the notification
        const { error } = await supabase.rpc("reassign_task", {
          p_task_id: taskId,
          p_new_assignee_id: assignedUserId,
          p_reassignment_reason: reassignmentReason || null,
        });
        
        if (error) throw error;
        
        // Get the assignee name for the toast
        const assignee = profile?.organization_id 
          ? (await supabase.from("profiles").select("full_name").eq("id", assignedUserId).single()).data
          : null;
        
        // Task is now pending - remove from local state as it won't appear in the 'accepted' task list
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        
        toast({
          title: "Task sent for approval",
          description: `This task has been sent to ${assignee?.full_name || 'the assignee'}. They must accept it before it's added to their dashboard.`,
        });
      } else {
        // Self-assigned or unassigned - direct update is fine
        const { data, error } = await supabase
          .from("tasks")
          .update({ 
            assigned_user_id: assignedUserId,
            assignment_status: 'accepted',
            decline_reason: null,
            last_reminder_sent_at: null,
            reassignment_reason: null,
          })
          .eq("id", taskId)
          .select(`
            assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name)
          `)
          .single();

        if (error) throw error;

        // Update in place
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  assigned_user_id: assignedUserId,
                  assigned_user: data.assigned_user as TaskUser | null,
                  assignment_status: 'accepted' as AssignmentStatus,
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
      // First, fetch the draft to check its assignee
      const { data: draft, error: fetchError } = await supabase
        .from("tasks")
        .select(`
          assigned_user_id,
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name)
        `)
        .eq("id", taskId)
        .single();

      if (fetchError) throw fetchError;

      // Determine assignment status based on assignee
      // - If no assignee or self-assigned: 'accepted' (appears on board immediately)
      // - If assigned to someone else: 'pending' (enters task request flow)
      const assignmentStatus = draft.assigned_user_id && draft.assigned_user_id !== user?.id 
        ? 'pending' 
        : 'accepted';

      const { data: updatedData, error } = await supabase
        .from("tasks")
        .update({ 
          is_draft: false,
          assignment_status: assignmentStatus,
        } as any)
        .eq("id", taskId)
        .select("id, is_draft");

      if (error) throw error;
      
      // Verify the update actually happened (RLS may silently block)
      if (!updatedData || updatedData.length === 0 || updatedData[0].is_draft !== false) {
        throw new Error("Failed to publish draft - update was blocked");
      }

      // Refetch tasks to update the board
      await fetchTasks();

      if (assignmentStatus === 'pending') {
        toast({
          title: "Task Request Sent",
          description: `${draft.assigned_user?.full_name || 'The assignee'} will need to accept this task`,
        });
      } else {
        toast({
          title: "Task Published",
          description: "Your task has been added to the dashboard",
        });
      }
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
