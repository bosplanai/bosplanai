import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { toast } from "./use-toast";

export interface Project {
  id: string;
  user_id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  position: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { organization } = useOrganization();

  const fetchProjects = async () => {
    if (!user || !organization) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organization.id)
        .is("archived_at", null)
        .order("position", { ascending: true });

      if (error) throw error;
      setProjects((data as Project[]) || []);
    } catch (error: any) {
      // Silently handle missing table/relationship errors for new organizations
      // PGRST205 = missing table, PGRST200 = missing relationship
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error fetching projects:", error);
        toast({
          title: "Error fetching projects",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user, organization]);

  // Real-time subscription for projects
  useEffect(() => {
    if (!user || !organization) return;

    const channel = supabase
      .channel(`projects-changes-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `organization_id=eq.${organization.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newProject = payload.new as Project & { archived_at?: string | null };
            // Only add if not archived and not already in list
            if (newProject.archived_at) return;
            setProjects((prev) => {
              // Prevent duplicates
              if (prev.some(p => p.id === newProject.id)) return prev;
              return [...prev, newProject as Project].sort((a, b) => a.position - b.position);
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedProject = payload.new as Project & { archived_at?: string | null };
            // Remove if archived, otherwise update
            if (updatedProject.archived_at) {
              setProjects((prev) => prev.filter((p) => p.id !== updatedProject.id));
            } else {
              setProjects((prev) =>
                prev.map((p) => (p.id === updatedProject.id ? updatedProject as Project : p))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedProject = payload.old as { id: string };
            setProjects((prev) => prev.filter((p) => p.id !== deletedProject.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, organization]);

  const addProject = async (title: string, description: string, dueDate?: Date, targetOrgId?: string): Promise<Project | null> => {
    if (!user) return null;
    
    const orgId = targetOrgId || organization?.id;
    if (!orgId) return null;

    try {
      // Get max position from database
      const { data: maxData } = await supabase
        .from("projects")
        .select("position")
        .eq("organization_id", orgId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const maxPosition = maxData?.position ?? -1;

      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          organization_id: orgId,
          title,
          description,
          status: "todo",
          position: maxPosition + 1,
          due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newProject = data as Project;
      
      // Only add to local state if it belongs to current organization
      if (orgId === organization?.id) {
        setProjects((prev) => [...prev, newProject]);
      }
      
      toast({
        title: "Project added",
        description: `"${title}" has been created`,
      });
      return newProject;
    } catch (error: any) {
      toast({
        title: "Error adding project",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProject = async (id: string, updates: Partial<Pick<Project, "title" | "description" | "status" | "due_date">>) => {
    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    } catch (error: any) {
      // Revert on error
      fetchProjects();
      toast({
        title: "Error updating project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast({
        title: "Project deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const reorderProjects = async (
    projectId: string,
    newStatus: "todo" | "in_progress" | "done",
    newPosition: number
  ) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const oldStatus = project.status;
    const oldPosition = project.position;

    // Optimistic update
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          return { ...p, status: newStatus, position: newPosition };
        }
        
        if (p.status === newStatus && p.id !== projectId) {
          if (oldStatus === newStatus) {
            // Same column reorder
            if (oldPosition < newPosition && p.position > oldPosition && p.position <= newPosition) {
              return { ...p, position: p.position - 1 };
            } else if (oldPosition > newPosition && p.position >= newPosition && p.position < oldPosition) {
              return { ...p, position: p.position + 1 };
            }
          } else {
            // Moving from different column
            if (p.position >= newPosition) {
              return { ...p, position: p.position + 1 };
            }
          }
        }
        
        if (p.status === oldStatus && oldStatus !== newStatus && p.position > oldPosition) {
          return { ...p, position: p.position - 1 };
        }
        
        return p;
      });
      return updated;
    });

    try {
      const { error } = await supabase
        .from("projects")
        .update({ status: newStatus, position: newPosition })
        .eq("id", projectId);

      if (error) throw error;
    } catch (error: any) {
      fetchProjects();
      toast({
        title: "Error reordering project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    reorderProjects,
    refetchProjects: fetchProjects,
  };
};
