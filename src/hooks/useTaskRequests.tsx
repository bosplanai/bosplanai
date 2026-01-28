// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";
import { useQueryClient } from "@tanstack/react-query";

export type AssignmentStatus = "pending" | "accepted" | "declined";

export interface TaskRequest {
  id: string;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  due_date: string | null;
  category: string;
  project_id: string | null;
  project?: { id: string; title: string } | null;
  created_by_user_id: string | null;
  created_by_user?: { id: string; full_name: string } | null;
  assigned_user_id: string;
  assignment_status: AssignmentStatus;
  created_at: string;
  organization_id: string;
}

export const useTaskRequests = () => {
  const [pendingRequests, setPendingRequests] = useState<TaskRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchPendingRequests = async () => {
    if (!user || !organization) {
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          id,
          title,
          description,
          priority,
          due_date,
          category,
          project_id,
          project:projects!tasks_project_id_fkey(id, title),
          created_by_user_id,
          assigned_user_id,
          assignment_status,
          created_at,
          organization_id,
          created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name)
        `
        )
        .eq("organization_id", organization.id)
        .eq("assigned_user_id", user.id)
        .eq("assignment_status", "pending")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPendingRequests(data as TaskRequest[]);
    } catch (error: any) {
      // Silently handle missing table/relationship errors (PGRST205/PGRST200)
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error fetching pending task requests:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, [user, organization]);

  // Real-time subscription for task request changes
  useEffect(() => {
    if (!user || !organization) return;

    const channel = supabase
      .channel(`task-requests-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `assigned_user_id=eq.${user.id}`,
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, organization]);

  const acceptTask = async (taskId: string, onSuccess?: () => void): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          assignment_status: "accepted",
        })
        .eq("id", taskId);

      if (error) throw error;

      setPendingRequests((prev) => prev.filter((r) => r.id !== taskId));
      
      // Invalidate all task-related queries to refresh main task board immediately
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-requests"] });
      
      // Call the success callback to trigger any additional refreshes (e.g., useTasks refetch)
      if (onSuccess) {
        onSuccess();
      }
      
      toast({
        title: "Task accepted",
        description: "The task has been added to your To Do list",
      });

      return true;
    } catch (error) {
      console.error("Error accepting task:", error);
      toast({
        title: "Error",
        description: "Failed to accept task",
        variant: "destructive",
      });
      return false;
    }
  };

  const declineTask = async (taskId: string, reason: string): Promise<boolean> => {
    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for declining the task",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Get the task details first (for notification)
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("title, created_by_user_id, organization_id")
        .eq("id", taskId)
        .single();

      if (taskError || !task) throw taskError || new Error("Task not found");

      // Get the current user's name for the notification
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      const declinerName = userProfile?.full_name || "A team member";

      // Update the task status
      const { error } = await supabase
        .from("tasks")
        .update({
          assignment_status: "declined",
          decline_reason: reason.trim(),
          assigned_user_id: null, // Clear the assigned user
        })
        .eq("id", taskId);

      if (error) throw error;

      // Create notification for the task creator with the decliner's name
      if (task.created_by_user_id && task.organization_id) {
        await supabase.from("notifications").insert({
          user_id: task.created_by_user_id,
          organization_id: task.organization_id,
          type: "task_declined",
          title: "Task Declined",
          message: `${declinerName} has declined the task: ${task.title}. Reason: ${reason.trim()}`,
          reference_id: taskId,
          reference_type: "task",
        });
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== taskId));
      
      // Invalidate tasks query
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      toast({
        title: "Task declined",
        description: "The task has been returned to the creator",
      });

      return true;
    } catch (error) {
      console.error("Error declining task:", error);
      toast({
        title: "Error",
        description: "Failed to decline task",
        variant: "destructive",
      });
      return false;
    }
  };

  const reassignTask = async (
    taskId: string,
    newAssigneeId: string,
    reason: string
  ): Promise<boolean> => {
    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for reassigning the task",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Update the task with new assignee, keeping status as pending
      const { error } = await supabase
        .from("tasks")
        .update({
          assigned_user_id: newAssigneeId,
          assignment_status: "pending",
          decline_reason: null,
          last_reminder_sent_at: null,
        })
        .eq("id", taskId);

      if (error) throw error;

      // Create notifications for reassignment
      const task = pendingRequests.find((r) => r.id === taskId);
      if (task) {
        // Fetch both the previous assignee (current user) and new assignee names
        const [previousAssigneeResult, newAssigneeResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user!.id)
            .single(),
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newAssigneeId)
            .single(),
        ]);
        
        const previousAssigneeName = previousAssigneeResult.data?.full_name || "A team member";
        const newAssigneeName = newAssigneeResult.data?.full_name || "another team member";
        
        // Build notifications array
        const notifications = [];
        
        // Notify the task creator about reassignment
        if (task.created_by_user_id) {
          notifications.push({
            user_id: task.created_by_user_id,
            organization_id: task.organization_id,
            type: "task_reassigned",
            title: "Task Reassigned",
            message: `${previousAssigneeName} reassigned "${task.title}" to ${newAssigneeName}. Reason: ${reason}`,
            reference_id: taskId,
            reference_type: "task",
          });
        }
        
        // Notify the new assignee about the reassignment
        notifications.push({
          user_id: newAssigneeId,
          organization_id: task.organization_id,
          type: "task_request",
          title: "Task Reassigned to You",
          message: `${previousAssigneeName} has reassigned "${task.title}" to you. Reason: ${reason}`,
          reference_id: taskId,
          reference_type: "task",
        });
        
        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }

      setPendingRequests((prev) => prev.filter((r) => r.id !== taskId));
      
      // Invalidate tasks query
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      toast({
        title: "Task reassigned",
        description: "The task has been sent to the new assignee",
      });

      return true;
    } catch (error) {
      console.error("Error reassigning task:", error);
      toast({
        title: "Error",
        description: "Failed to reassign task",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    pendingRequests,
    loading,
    acceptTask,
    declineTask,
    reassignTask,
    refetch: fetchPendingRequests,
  };
};

