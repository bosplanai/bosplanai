// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";
import { differenceInDays } from "date-fns";

export interface ArchivedTask {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  completed_at: string | null;
  archived_at: string;
  project?: {
    id: string;
    title: string;
  } | null;
}

export interface ArchivedProject {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  archived_at: string;
  updated_at: string;
}

export type ArchiveFilter = "30days" | "6months" | "12months" | "older";

export const useArchive = () => {
  const [archivedTasks, setArchivedTasks] = useState<ArchivedTask[]>([]);
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { profile } = useOrganization();
  const { toast } = useToast();

  const fetchArchivedItems = useCallback(async () => {
    if (!user || !profile?.organization_id) return;

    setLoading(true);
    try {
      // Fetch archived tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id, title, description, category, priority, completed_at, archived_at
        `)
        .eq("organization_id", profile.organization_id)
        .not("archived_at", "is", null)
        .is("deleted_at", null)
        .order("archived_at", { ascending: false });

      // Gracefully handle missing table/relationship errors
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (tasksError && !ignoredCodes.includes(tasksError?.code)) throw tasksError;

      // Fetch archived projects (gracefully handle missing table)
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, title, description, status, due_date, archived_at, updated_at")
        .eq("organization_id", profile.organization_id)
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });

      if (projectsError && !ignoredCodes.includes(projectsError?.code)) throw projectsError;

      setArchivedTasks(tasksData || []);
      setArchivedProjects(projectsData || []);
    } catch (error) {
      console.error("Error fetching archived items:", error);
    } finally {
      setLoading(false);
    }
  }, [user, profile?.organization_id]);

  // Auto-archive items that have been complete for 10+ days
  const autoArchiveItems = useCallback(async () => {
    if (!user || !profile?.organization_id) return;

    try {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      const cutoffDate = tenDaysAgo.toISOString();

      // Auto-archive completed tasks
      const { data: tasksToArchive, error: tasksQueryError } = await supabase
        .from("tasks")
        .select("id, completed_at")
        .eq("organization_id", profile.organization_id)
        .eq("status", "complete")
        .is("archived_at", null)
        .is("deleted_at", null)
        .not("completed_at", "is", null)
        .lt("completed_at", cutoffDate);

      if (tasksQueryError) throw tasksQueryError;

      if (tasksToArchive && tasksToArchive.length > 0) {
        const { error: tasksUpdateError } = await supabase
          .from("tasks")
          .update({ archived_at: new Date().toISOString() })
          .in("id", tasksToArchive.map(t => t.id));

        if (tasksUpdateError) throw tasksUpdateError;
      }

      // Auto-archive completed projects (using updated_at as proxy for completion date)
      const { data: projectsToArchive, error: projectsQueryError } = await supabase
        .from("projects")
        .select("id, updated_at")
        .eq("organization_id", profile.organization_id)
        .eq("status", "done")
        .is("archived_at", null);

      // Gracefully handle missing table
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (projectsQueryError && !ignoredCodes.includes(projectsQueryError?.code)) throw projectsQueryError;

      const projectsOlderThan10Days = (projectsToArchive || []).filter(p => {
        const updatedDate = new Date(p.updated_at);
        return differenceInDays(new Date(), updatedDate) >= 10;
      });

      if (projectsOlderThan10Days.length > 0) {
        const { error: projectsUpdateError } = await supabase
          .from("projects")
          .update({ archived_at: new Date().toISOString() })
          .in("id", projectsOlderThan10Days.map(p => p.id));

        const ignoredCodes = ['PGRST205', 'PGRST200'];
        if (projectsUpdateError && !ignoredCodes.includes(projectsUpdateError?.code)) throw projectsUpdateError;
      }
    } catch (error: any) {
      // Silently handle missing table/relationship errors
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error auto-archiving items:", error);
      }
    }
  }, [user, profile?.organization_id]);

  const archiveTask = async (taskId: string): Promise<boolean> => {
    try {
      const archivedAt = new Date().toISOString();
      
      // First fetch the task details before archiving
      const { data: taskData, error: fetchError } = await supabase
        .from("tasks")
        .select(`
          id, title, description, category, priority, completed_at
        `)
        .eq("id", taskId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("tasks")
        .update({ archived_at: archivedAt })
        .eq("id", taskId);

      if (error) throw error;

      // Immediately add to archived tasks state
      if (taskData) {
        const archivedTask: ArchivedTask = {
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority,
          completed_at: taskData.completed_at,
          archived_at: archivedAt,
          project: taskData.project,
        };
        setArchivedTasks(prev => [archivedTask, ...prev]);
      }

      toast({
        title: "Task archived",
        description: "Task has been moved to the archive",
      });

      return true;
    } catch (error) {
      console.error("Error archiving task:", error);
      toast({
        title: "Error",
        description: "Failed to archive task",
        variant: "destructive",
      });
      return false;
    }
  };

  const archiveProject = async (projectId: string): Promise<boolean> => {
    try {
      const archivedAt = new Date().toISOString();
      
      // First fetch the project details before archiving
      const { data: projectData, error: fetchError } = await supabase
        .from("projects")
        .select("id, title, description, status, due_date, updated_at")
        .eq("id", projectId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("projects")
        .update({ archived_at: archivedAt })
        .eq("id", projectId);

      if (error) throw error;

      // Immediately add to archived projects state
      if (projectData) {
        const archivedProject: ArchivedProject = {
          id: projectData.id,
          title: projectData.title,
          description: projectData.description,
          status: projectData.status,
          due_date: projectData.due_date,
          archived_at: archivedAt,
          updated_at: projectData.updated_at,
        };
        setArchivedProjects(prev => [archivedProject, ...prev]);
      }

      toast({
        title: "Project archived",
        description: "Project has been moved to the archive",
      });

      return true;
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: "Failed to archive project",
        variant: "destructive",
      });
      return false;
    }
  };

  const restoreTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ archived_at: null })
        .eq("id", taskId);

      if (error) throw error;

      setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
      toast({
        title: "Task restored",
        description: "Task has been restored from archive",
      });

      return true;
    } catch (error) {
      console.error("Error restoring task:", error);
      toast({
        title: "Error",
        description: "Failed to restore task",
        variant: "destructive",
      });
      return false;
    }
  };

  const restoreProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ archived_at: null })
        .eq("id", projectId);

      if (error) throw error;

      setArchivedProjects(prev => prev.filter(p => p.id !== projectId));
      toast({
        title: "Project restored",
        description: "Project has been restored from archive",
      });

      return true;
    } catch (error) {
      console.error("Error restoring project:", error);
      toast({
        title: "Error",
        description: "Failed to restore project",
        variant: "destructive",
      });
      return false;
    }
  };

  const filterByDate = <T extends { archived_at: string }>(
    items: T[],
    filter: ArchiveFilter
  ): T[] => {
    const now = new Date();
    
    return items.filter(item => {
      const archivedDate = new Date(item.archived_at);
      const daysDiff = differenceInDays(now, archivedDate);

      switch (filter) {
        case "30days":
          return daysDiff <= 30;
        case "6months":
          return daysDiff <= 180;
        case "12months":
          return daysDiff <= 365;
        case "older":
          return daysDiff > 365;
        default:
          return true;
      }
    });
  };

  // Clear cached data and re-run auto-archive when org changes
  useEffect(() => {
    if (user && profile?.organization_id) {
      setArchivedTasks([]);
      setArchivedProjects([]);
      autoArchiveItems();
    }
  }, [user, profile?.organization_id, autoArchiveItems]);

  return {
    archivedTasks,
    archivedProjects,
    loading,
    fetchArchivedItems,
    archiveTask,
    archiveProject,
    restoreTask,
    restoreProject,
    filterByDate,
    autoArchiveItems,
  };
};

