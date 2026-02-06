// @ts-nocheck
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useQueryClient } from "@tanstack/react-query";

export type AssignmentStatus = "pending" | "accepted" | "declined";

export interface TaskRequest {
  id: string; // task_assignment id
  task_id: string;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  due_date: string | null;
  category: string;
  project_id: string | null;
  project?: { id: string; title: string } | null;
  created_by_user_id: string | null;
  created_by_user?: { id: string; full_name: string } | null;
  assigned_by: string | null;
  assigned_by_user?: { id: string; full_name: string } | null;
  assignment_status: AssignmentStatus;
  created_at: string;
  organization_id: string;
}

export const useTaskRequests = (organizationId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<TaskRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchPendingRequests = async () => {
    if (!user) {
      setPendingRequests([]);
      setLoading(false);
      return;
    }

    try {
      // Query task_assignments for pending assignments to this user
      const { data, error } = await supabase
        .from("task_assignments")
        .select(`
          id,
          task_id,
          user_id,
          assigned_by,
          assignment_status,
          created_at,
          assigned_by_user:profiles!task_assignments_assigned_by_fkey(id, full_name),
          task:tasks!task_assignments_task_id_fkey(
            id,
            title,
            description,
            priority,
            due_date,
            category,
            project_id,
            created_by_user_id,
            organization_id,
            is_draft,
            deleted_at,
            project:projects!tasks_project_id_fkey(id, title),
            created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name)
          )
        `)
        .eq("user_id", user.id)
        .eq("assignment_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out draft/deleted tasks and filter by organization if provided
      const requests: TaskRequest[] = (data || [])
        .filter((item: any) => {
          const task = item.task;
          if (!task || task.is_draft || task.deleted_at) return false;
          // Filter by organization if organizationId is provided
          if (organizationId && task.organization_id !== organizationId) return false;
          return true;
        })
        .map((item: any) => ({
          id: item.id,
          task_id: item.task_id,
          title: item.task.title,
          description: item.task.description,
          priority: item.task.priority,
          due_date: item.task.due_date,
          category: item.task.category,
          project_id: item.task.project_id,
          project: item.task.project,
          created_by_user_id: item.task.created_by_user_id,
          created_by_user: item.task.created_by_user,
          assigned_by: item.assigned_by,
          assigned_by_user: item.assigned_by_user,
          assignment_status: item.assignment_status,
          created_at: item.created_at,
          organization_id: item.task.organization_id,
        }));

      setPendingRequests(requests);
    } catch (error: any) {
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
  }, [user, organizationId]);

  // Real-time subscription for task assignment changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`task-assignments-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_assignments",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchPendingRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const acceptTask = async (taskId: string, onSuccess?: () => void): Promise<boolean> => {
    try {
      // Use the RPC to accept the assignment
      const { error } = await supabase.rpc("accept_task_assignment", {
        p_task_id: taskId,
      });

      if (error) throw error;

      setPendingRequests((prev) => prev.filter((r) => r.task_id !== taskId));
      
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-requests"] });
      
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
      // Use the RPC to decline (which will update, notify, then delete the assignment)
      const { error } = await supabase.rpc("decline_task_assignment", {
        p_task_id: taskId,
        p_decline_reason: reason.trim(),
      });

      if (error) throw error;

      setPendingRequests((prev) => prev.filter((r) => r.task_id !== taskId));
      
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      toast({
        title: "Task declined",
        description: "You have been removed from this task",
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
      // First decline the current assignment
      const { error: declineError } = await supabase.rpc("decline_task_assignment", {
        p_task_id: taskId,
        p_decline_reason: `Reassigned to another user. Reason: ${reason.trim()}`,
      });

      if (declineError) throw declineError;

      // Then add a new assignment for the new assignee
      const { error: assignError } = await supabase
        .from("task_assignments")
        .insert({
          task_id: taskId,
          user_id: newAssigneeId,
          assigned_by: user?.id,
          assignment_status: "pending",
        });

      if (assignError) throw assignError;

      setPendingRequests((prev) => prev.filter((r) => r.task_id !== taskId));
      
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
