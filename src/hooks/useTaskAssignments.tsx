import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  user?: {
    id: string;
    full_name: string;
  };
}

export const useTaskAssignments = (taskId: string) => {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssignments = useCallback(async () => {
    if (!taskId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("task_assignments")
        .select(`
          *,
          user:profiles!task_assignments_user_id_fkey(id, full_name)
        `)
        .eq("task_id", taskId);

      if (error) throw error;

      setAssignments(data || []);
    } catch (error) {
      console.error("Error fetching task assignments:", error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const addAssignment = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("task_assignments")
        .insert({
          task_id: taskId,
          user_id: userId,
          assigned_by: user.id,
        })
        .select(`
          *,
          user:profiles!task_assignments_user_id_fkey(id, full_name)
        `)
        .single();

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - user already assigned
          toast({
            title: "Already assigned",
            description: "This user is already assigned to the task",
          });
          return;
        }
        throw error;
      }

      setAssignments((prev) => [...prev, data]);
      toast({
        title: "User assigned",
        description: "User has been assigned to this task",
      });
    } catch (error) {
      console.error("Error adding assignment:", error);
      toast({
        title: "Error",
        description: "Failed to assign user",
        variant: "destructive",
      });
    }
  };

  const removeAssignment = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);

      if (error) throw error;

      setAssignments((prev) => prev.filter((a) => a.user_id !== userId));
      toast({
        title: "User unassigned",
        description: "User has been removed from this task",
      });
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast({
        title: "Error",
        description: "Failed to unassign user",
        variant: "destructive",
      });
    }
  };

  const toggleAssignment = async (userId: string) => {
    const isAssigned = assignments.some((a) => a.user_id === userId);
    if (isAssigned) {
      await removeAssignment(userId);
    } else {
      await addAssignment(userId);
    }
  };

  const setAssignments_bulk = async (userIds: string[]) => {
    // Get current assigned user IDs
    const currentUserIds = assignments.map((a) => a.user_id);
    
    // Find users to add and remove
    const toAdd = userIds.filter((id) => !currentUserIds.includes(id));
    const toRemove = currentUserIds.filter((id) => !userIds.includes(id));

    // Remove assignments
    for (const userId of toRemove) {
      await removeAssignment(userId);
    }

    // Add assignments
    for (const userId of toAdd) {
      await addAssignment(userId);
    }
  };

  return {
    assignments,
    loading,
    addAssignment,
    removeAssignment,
    toggleAssignment,
    setAssignments: setAssignments_bulk,
    refetch: fetchAssignments,
    isUserAssigned: (userId: string) => assignments.some((a) => a.user_id === userId),
  };
};
