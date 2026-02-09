// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, Flag, User, Circle, Pencil, Check, X, Users, FolderOpen, Plus, Trash2, FileText, Paperclip, Link, Upload } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Calendar as CalendarPicker } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Checkbox } from "./ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import ProjectAttachmentsList from "./ProjectAttachmentsList";
import TaskAttachmentsList from "./TaskAttachmentsList";
import TaskEditSheet from "./TaskEditSheet";

interface ProjectTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  projectTitle: string;
}

interface TaskAssignment {
  user_id: string;
  user?: { id: string; full_name: string };
}

interface ProjectTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  category: string;
  assigned_user_id: string | null;
  assigned_user_name?: string;
  created_by_user_id: string | null;
  created_by_user_name?: string;
  project_id: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  task_assignments?: TaskAssignment[];
  assignment_status?: string;
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "high":
      return {
        label: "High",
        className: "bg-priority-high/10 text-priority-high border-priority-high/20",
      };
    case "medium":
      return { label: "Medium", className: "bg-priority-medium/10 text-priority-medium border-priority-medium/20" };
    case "low":
      return { label: "Low", className: "bg-priority-low/10 text-priority-low border-priority-low/20" };
    default:
      return { label: priority, className: "bg-muted text-muted-foreground border-border" };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "todo":
      return { label: "To Do", className: "bg-muted text-muted-foreground" };
    case "in_progress":
      return { label: "In Progress", className: "bg-primary/10 text-primary" };
    case "complete":
      return { label: "Complete", className: "bg-green-500/10 text-green-600" };
    default:
      return { label: status, className: "bg-muted text-muted-foreground" };
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const ProjectTasksModal = ({ isOpen, onClose, projectId, projectTitle }: ProjectTasksModalProps) => {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editSheetTask, setEditSheetTask] = useState<ProjectTask | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<string>("");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("");
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(undefined);
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [newTaskAttachments, setNewTaskAttachments] = useState<File[]>([]);
  const [newTaskUrl, setNewTaskUrl] = useState<string>("");
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showRequestSentDialog, setShowRequestSentDialog] = useState(false);
  const [requestSentTo, setRequestSentTo] = useState<string>("");
  const [isEditingProjectTitle, setIsEditingProjectTitle] = useState(false);
  const [isEditingProjectDescription, setIsEditingProjectDescription] = useState(false);
  const [editedProjectTitle, setEditedProjectTitle] = useState("");
  const [editedProjectDescription, setEditedProjectDescription] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  const projectTitleInputRef = useRef<HTMLInputElement>(null);
  const projectDescriptionInputRef = useRef<HTMLTextAreaElement>(null);

  const { members } = useTeamMembers();
  const { projects, updateProject } = useProjects();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { isAdmin, isMember, isViewer } = useUserRole();

  // Get current project details
  const currentProject = projects.find(p => p.id === projectId);

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

  const fetchTasks = async () => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          due_date,
          priority,
          status,
          category,
          assigned_user_id,
          created_by_user_id,
          project_id,
          attachment_url,
          attachment_name,
          task_assignments(user_id, user:profiles!task_assignments_user_id_fkey(id, full_name)),
          created_by_user:profiles!tasks_created_by_user_id_fkey(id, full_name)
        `)
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

          const createdByUser = t.created_by_user as { id: string; full_name: string } | null;
          return {
            id: t.id,
            title: t.title,
            description: t.description,
            due_date: t.due_date,
            priority: t.priority,
            status: t.status,
            category: t.category,
            assigned_user_id: t.assigned_user_id,
            created_by_user_id: t.created_by_user_id,
            created_by_user_name: createdByUser?.full_name,
            project_id: t.project_id,
            attachment_url: signedAttachmentUrl,
            attachment_name: t.attachment_name,
            task_assignments: (t.task_assignments || []) as TaskAssignment[],
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

  useEffect(() => {
    if (isOpen && projectId) {
      fetchTasks();
    }
  }, [isOpen, projectId]);

  // Real-time subscription for task updates
  useEffect(() => {
    if (!isOpen || !projectId) return;

    const channel = supabase
      .channel(`project-tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, projectId]);

  const updateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );

    try {
      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating task:", error);
      fetchTasks(); // Revert on error
    }
  };

  const handleStartEditTitle = (task: ProjectTask) => {
    setEditingTaskId(task.id);
    setEditingField("title");
    setEditedTitle(task.title);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleSaveTitle = (taskId: string) => {
    const trimmed = editedTitle.trim();
    if (trimmed) {
      updateTask(taskId, { title: trimmed });
    }
    setEditingTaskId(null);
    setEditingField(null);
  };

  const handleStartEditDescription = (task: ProjectTask) => {
    setEditingTaskId(task.id);
    setEditingField("description");
    setEditedDescription(task.description || "");
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };

  const handleSaveDescription = (taskId: string) => {
    updateTask(taskId, { description: editedDescription.trim() || null });
    setEditingTaskId(null);
    setEditingField(null);
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTask(taskId, { status: newStatus });
  };

  const handlePriorityChange = (taskId: string, newPriority: string) => {
    updateTask(taskId, { priority: newPriority });
  };

  const handleDueDateChange = (taskId: string, date: Date | undefined) => {
    updateTask(taskId, { due_date: date ? date.toISOString().split('T')[0] : null });
  };

  const handleAssigneeChange = (taskId: string, userId: string | null) => {
    // Determine assignment status: 'pending' if assigned to someone else, 'accepted' if self-assigned or unassigned
    const assignmentStatus = userId && userId !== user?.id ? 'pending' : 'accepted';
    updateTask(taskId, { assigned_user_id: userId, assignment_status: assignmentStatus });
    // Update the display name
    if (userId) {
      const member = members.find((m) => m.user_id === userId);
      if (member) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, assigned_user_name: member.full_name } : t
          )
        );
      }
    } else {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, assigned_user_name: undefined } : t
        )
      );
    }
  };

  const toggleTaskAssignment = async (taskId: string, userId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !user) return;

    const isAssigned = task.task_assignments?.some(a => a.user_id === userId) || task.assigned_user_id === userId;

    if (isAssigned) {
      // Remove assignment
      if (task.assigned_user_id === userId) {
        // Legacy single assignment - clear it
        await supabase
          .from("tasks")
          .update({ assigned_user_id: null, assignment_status: 'accepted' })
          .eq("id", taskId);
      }
      // Remove from task_assignments table
      await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId)
        .eq("user_id", userId);
    } else {
      // Add assignment to task_assignments table
      await supabase
        .from("task_assignments")
        .insert({
          task_id: taskId,
          user_id: userId,
          assigned_by: user.id,
        });
    }

    // Refresh tasks to get updated assignments
    fetchTasks();
  };

  const getTaskAssignees = (task: ProjectTask) => {
    const assignees: { id: string; name: string }[] = [];
    
    // Add legacy assigned user
    if (task.assigned_user_id && task.assigned_user_name) {
      assignees.push({ id: task.assigned_user_id, name: task.assigned_user_name });
    }
    
    // Add multi-assignments (excluding legacy user to avoid duplicates)
    task.task_assignments?.forEach(a => {
      if (a.user?.id && a.user.id !== task.assigned_user_id) {
        assignees.push({ id: a.user.id, name: a.user.full_name });
      }
    });
    
    return assignees;
  };

  const isUserAssignedToTask = (task: ProjectTask, userId: string) => {
    return task.assigned_user_id === userId || 
           task.task_assignments?.some(a => a.user_id === userId);
  };

  const handleProjectChange = (taskId: string, newProjectId: string | null) => {
    updateTask(taskId, { project_id: newProjectId });
    // Remove from current list if moving to different project
    if (newProjectId !== projectId) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !newTaskCategory || !projectId || !user || !organization) return;

    setIsAddingTask(true);
    try {
      // Check if assigning to someone other than self
      const isAssigningToOther = newTaskAssignee && newTaskAssignee !== user.id;
      
      // Create the task
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || null,
          project_id: projectId,
          user_id: user.id,
          created_by_user_id: user.id,
          organization_id: organization.id,
          status: "todo",
          priority: newTaskPriority || "medium",
          due_date: newTaskDueDate ? newTaskDueDate.toISOString() : null,
          category: newTaskCategory,
          subcategory: "weekly",
          icon: "ListTodo",
          assigned_user_id: newTaskAssignee || null,
          attachment_url: newTaskUrl.trim() || null,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // If assigning to someone, create the task_assignment record
      if (newTaskAssignee) {
        const assignmentStatus = isAssigningToOther ? "pending" : "accepted";
        const acceptedAt = isAssigningToOther ? null : new Date().toISOString();
        
        const { error: assignmentError } = await supabase
          .from("task_assignments")
          .insert({
            task_id: taskData.id,
            user_id: newTaskAssignee,
            assigned_by: user.id,
            assignment_status: assignmentStatus,
            accepted_at: acceptedAt,
          });

        if (assignmentError) {
          console.error("Error creating assignment:", assignmentError);
          // Don't throw - task was created successfully
        }
      }

      // Upload file attachments
      if (newTaskAttachments.length > 0) {
        for (const file of newTaskAttachments) {
          const fileExt = file.name.split(".").pop();
          const filePath = `${organization.id}/${taskData.id}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(filePath, file);
          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }
          await supabase.from("task_attachments").insert({
            task_id: taskData.id,
            organization_id: organization.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || null,
            uploaded_by: user.id,
          });
        }
      }

      // Get assignee name for the confirmation dialog
      if (isAssigningToOther) {
        const assignee = members.find(m => m.user_id === newTaskAssignee);
        setRequestSentTo(assignee?.full_name || "the assignee");
        setShowRequestSentDialog(true);
      } else {
        toast.success("Task added to project");
      }

      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskCategory("");
      setNewTaskAssignee("");
      setNewTaskDueDate(undefined);
      setNewTaskPriority("medium");
      setNewTaskAttachments([]);
      setNewTaskUrl("");
      fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${taskTitle}"?`)) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
    }

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const scrollAmount = 100;
    const pageScrollAmount = scrollContainer.clientHeight * 0.8;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        scrollContainer.scrollTop += scrollAmount;
        break;
      case "ArrowUp":
        e.preventDefault();
        scrollContainer.scrollTop -= scrollAmount;
        break;
      case "PageDown":
        e.preventDefault();
        scrollContainer.scrollTop += pageScrollAmount;
        break;
      case "PageUp":
        e.preventDefault();
        scrollContainer.scrollTop -= pageScrollAmount;
        break;
      case "Home":
        e.preventDefault();
        scrollContainer.scrollTop = 0;
        break;
      case "End":
        e.preventDefault();
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        break;
    }
  }, []);


  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header with project title */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                {currentProject?.title || projectTitle || "Project"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage project details and tasks
              </p>
            </div>
          </div>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain focus:outline-none"
        >
          {/* Project Details Section */}
          {projectId && currentProject && (
            <section className="px-6 py-5 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                Project Details
              </h2>
              
              <div className="space-y-4">
                {/* Project Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Title
                  </label>
                  {isEditingProjectTitle ? (
                    <div className="flex items-center gap-2">
                      <Input
                        ref={projectTitleInputRef}
                        value={editedProjectTitle}
                        onChange={(e) => setEditedProjectTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (editedProjectTitle.trim()) {
                              updateProject(projectId, { title: editedProjectTitle.trim() });
                            }
                            setIsEditingProjectTitle(false);
                          }
                          if (e.key === "Escape") {
                            setIsEditingProjectTitle(false);
                          }
                        }}
                        className="h-9 text-base"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 hover:bg-green-500/10 hover:text-green-600"
                        onClick={() => {
                          if (editedProjectTitle.trim()) {
                            updateProject(projectId, { title: editedProjectTitle.trim() });
                          }
                          setIsEditingProjectTitle(false);
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setIsEditingProjectTitle(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 cursor-pointer group px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      onClick={() => {
                        setEditedProjectTitle(currentProject.title);
                        setIsEditingProjectTitle(true);
                        setTimeout(() => projectTitleInputRef.current?.focus(), 0);
                      }}
                    >
                      <span className="text-base font-medium text-foreground">{currentProject.title}</span>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                    </div>
                  )}
                </div>

                {/* Project Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </label>
                  {isEditingProjectDescription ? (
                    <div className="space-y-2">
                      <Textarea
                        ref={projectDescriptionInputRef}
                        value={editedProjectDescription}
                        onChange={(e) => setEditedProjectDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setIsEditingProjectDescription(false);
                          }
                        }}
                        rows={3}
                        className="text-sm resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            updateProject(projectId, { description: editedProjectDescription.trim() || null });
                            setIsEditingProjectDescription(false);
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsEditingProjectDescription(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-start gap-2 cursor-pointer group px-3 py-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => {
                        setEditedProjectDescription(currentProject.description || "");
                        setIsEditingProjectDescription(true);
                        setTimeout(() => projectDescriptionInputRef.current?.focus(), 0);
                      }}
                    >
                      <span className={cn(
                        "text-sm leading-relaxed flex-1",
                        currentProject.description ? "text-foreground" : "text-muted-foreground italic"
                      )}>
                        {currentProject.description || "Click to add a description..."}
                      </span>
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Project Attachments Section */}
          {projectId && organization && (
            <section className="px-6 py-5 border-b border-border">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Attachments
                </h2>
              </div>
              <ProjectAttachmentsList
                projectId={projectId}
                organizationId={organization.id}
              />
            </section>
          )}

          {/* Tasks Section */}
          <section className="px-6 py-5">
            {/* Section Header with Add Task */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Tasks
                </h2>
                <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5">
                  {tasks.length}
                </Badge>
              </div>
            </div>

            {/* Add Task Input */}
            <div className="flex flex-col gap-4 mb-5 p-4 rounded-xl bg-muted/20 border border-border">
              {/* Project indicator */}
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Project:</span>
                <Badge variant="secondary" className="text-xs font-medium">
                  {projectTitle}
                </Badge>
              </div>

              {/* Task title & description */}
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Task title <span className="text-destructive">*</span></label>
                  <Input
                    ref={newTaskInputRef}
                    placeholder="What needs to be done?"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTaskTitle.trim() && newTaskCategory) {
                        handleAddTask();
                      }
                    }}
                    className="h-10 bg-background text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea
                    placeholder="Add a description..."
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background shadow-md px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>

              {/* Row 1: Board & Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Board <span className="text-destructive">*</span></label>
                  <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
                    <SelectTrigger className="h-9 bg-background text-sm">
                      <SelectValue placeholder="Select board" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="product">Product Management</SelectItem>
                      {isAdmin && (
                        <>
                          <SelectItem value="operational">Operational Management</SelectItem>
                          <SelectItem value="strategic">Strategic Management</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select value={newTaskAssignee || "__none__"} onValueChange={(val) => setNewTaskAssignee(val === "__none__" ? "" : val)}>
                    <SelectTrigger className="h-9 bg-background text-sm">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="No assignee" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        <span className="text-muted-foreground">No assignee</span>
                      </SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {member.full_name?.substring(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.full_name}</span>
                            {member.user_id === user?.id && (
                              <span className="text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Due date & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Due date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full h-9 justify-start text-left text-sm font-normal", !newTaskDueDate && "text-muted-foreground")}>
                        <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                        {newTaskDueDate ? format(newTaskDueDate, "MMM d, yyyy") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={newTaskDueDate}
                        onSelect={setNewTaskDueDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                    <SelectTrigger className="h-9 bg-background text-sm">
                      <div className="flex items-center gap-2">
                        <Flag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Priority" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: URL & Attachments side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Link / URL</label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="https://example.com"
                      value={newTaskUrl}
                      onChange={(e) => setNewTaskUrl(e.target.value)}
                      className="h-9 pl-9 bg-background text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Attachments {newTaskAttachments.length > 0 && `(${newTaskAttachments.length})`}
                  </label>
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setNewTaskAttachments((prev) => [...prev, ...files]);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 w-full gap-2 text-sm font-normal justify-start"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {newTaskAttachments.length === 0 ? "Attach files" : "Add more files"}
                  </Button>
                </div>
              </div>

              {/* Attached files list */}
              {newTaskAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newTaskAttachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 text-xs bg-muted/60 border border-border/40 rounded-full px-3 py-1.5 group"
                    >
                      <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">
                        {(file.size / 1024).toFixed(0)}KB
                      </span>
                      <button
                        type="button"
                        onClick={() => setNewTaskAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center justify-between pt-1">
                {!newTaskCategory && newTaskTitle.trim() ? (
                  <p className="text-xs text-destructive">Please select a board</p>
                ) : (
                  <div />
                )}
                <Button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim() || !newTaskCategory || isAddingTask}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingTask ? "Adding..." : "Add Task"}
                </Button>
              </div>
            </div>

            {/* Task List */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading tasks...</span>
                </div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Circle className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-1">No tasks yet</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  Add your first task using the input above to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, index) => {
                  const priorityConfig = getPriorityConfig(task.priority);
                  const statusConfig = getStatusConfig(task.status);
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200",
                        task.status === "complete" 
                          ? "border-green-500/20 bg-green-500/5" 
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="space-y-3">
                        {/* Task Header: Title + Status + Edit */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                              <h4 className={cn(
                                "text-base font-semibold",
                                task.status === "complete" 
                                  ? "text-muted-foreground line-through" 
                                  : "text-foreground"
                              )}>
                                {task.title}
                              </h4>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground leading-relaxed pl-6 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Edit Button - Opens Sheet */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditSheetTask(task)}
                              title="Edit task"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>

                            {/* Status Badge */}
                            <Select
                              value={task.status}
                              onValueChange={(value) => handleStatusChange(task.id, value)}
                            >
                              <SelectTrigger className="w-auto h-8 px-3 border-0 gap-1.5">
                                <Badge className={cn("text-xs font-medium", statusConfig.className)}>
                                  {statusConfig.label}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="complete">Complete</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex flex-wrap items-center gap-2 pl-6 pt-2 border-t border-border/50">
                        {/* Due Date */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-7 px-2 text-xs border-0 bg-[#F5F6F7] dark:bg-[#1D2128] dark:text-white",
                                !task.due_date && "text-muted-foreground dark:text-white/60"
                              )}
                            >
                              <Calendar className="w-3 h-3 mr-1" />
                              {task.due_date
                                ? format(new Date(task.due_date), "MMM d, yyyy")
                                : "Set date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={task.due_date ? new Date(task.due_date) : undefined}
                              onSelect={(date) => handleDueDateChange(task.id, date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        {/* Priority */}
                        <Select
                          value={task.priority}
                          onValueChange={(value) => handlePriorityChange(task.id, value)}
                        >
                          <SelectTrigger className="h-7 w-auto px-2 border-0 bg-[#F5F6F7] dark:bg-[#1D2128]">
                            <Badge
                              variant="outline"
                              className={cn("text-xs", priorityConfig.className)}
                            >
                              <Flag className="w-3 h-3 mr-1" />
                              {priorityConfig.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Assignees - Multi-select */}
                        <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 border-0 bg-[#F5F6F7] dark:bg-[#1D2128] dark:text-white"
                              >
                                {(() => {
                                  const assignees = getTaskAssignees(task);
                                  if (assignees.length === 0) {
                                    return (
                                      <>
                                        <Users className="w-3 h-3 mr-1" />
                                        <span className="text-xs text-muted-foreground">Assign</span>
                                      </>
                                    );
                                  }
                                  return (
                                    <div className="flex items-center gap-1.5">
                                      <div className="flex items-center -space-x-1">
                                        {assignees.slice(0, 3).map((a, idx) => (
                                          <Avatar key={a.id} className="w-5 h-5 border-2 border-background" style={{ zIndex: 3 - idx }}>
                                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-medium">
                                              {getInitials(a.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                      </div>
                                      <span className="text-xs text-foreground/70 dark:text-white max-w-[100px] truncate">
                                        Assigned: {assignees.length === 1 
                                          ? assignees[0].name.split(' ')[0]
                                          : `${assignees.length}`}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-2" align="start">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Assign to (select multiple)
                              </p>
                              <div className="space-y-1 max-h-48 overflow-y-auto">
                                {members.map((member) => {
                                  const isAssigned = isUserAssignedToTask(task, member.user_id);
                                  return (
                                    <div
                                      key={member.user_id}
                                      className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors",
                                        isAssigned && "bg-primary/10"
                                      )}
                                      onClick={() => toggleTaskAssignment(task.id, member.user_id)}
                                    >
                                      <Checkbox checked={isAssigned} className="pointer-events-none" />
                                      <Avatar className="w-5 h-5">
                                        <AvatarFallback className="text-[8px]">
                                          {getInitials(member.full_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs truncate">{member.full_name}</span>
                                    </div>
                                  );
                                })}
                                {members.length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    No team members available
                                  </p>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>

                        {/* Project */}
                        <Select
                          value={task.project_id || "no-project"}
                          onValueChange={(value) =>
                            handleProjectChange(task.id, value === "no-project" ? null : value)
                          }
                        >
                          <SelectTrigger className="h-7 w-auto px-2 border-0 bg-[#F5F6F7] dark:bg-[#1D2128] dark:text-white">
                            <div className="flex items-center gap-1">
                              <FolderOpen className="w-3 h-3" />
                              <span className="text-xs max-w-[100px] truncate">
                                {projects.find((p) => p.id === task.project_id)?.title || "No project"}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-project">No project</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Created by */}
                        {task.created_by_user_name && (
                          <div 
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full border-0 bg-[#F5F6F7] dark:bg-[#1D2128]"
                            title={`Created by ${task.created_by_user_name}`}
                          >
                            <span className="text-[10px] text-muted-foreground dark:text-white">By:</span>
                            <Avatar className="w-4 h-4 border border-border">
                              <AvatarFallback className="text-[7px] bg-muted text-muted-foreground font-semibold">
                                {getInitials(task.created_by_user_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium text-muted-foreground dark:text-white">
                              {task.created_by_user_name.split(' ')[0]}
                            </span>
                          </div>
                        )}

                        {/* Task Attachments */}
                        {organization?.id && (
                          <TaskAttachmentsList
                            taskId={task.id}
                            organizationId={organization.id}
                            canEdit={true}
                          />
                        )}

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-muted-foreground hover:text-destructive ml-auto"
                          onClick={() => handleDeleteTask(task.id, task.title)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} in this project
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Task Request Sent Confirmation Dialog */}
    <AlertDialog open={showRequestSentDialog} onOpenChange={setShowRequestSentDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-4 h-4 text-primary" />
            </div>
            Task Request Sent
          </AlertDialogTitle>
          <AlertDialogDescription>
            Your task request has been successfully sent to <strong>{requestSentTo}</strong>. 
            The task will appear on their dashboard once they accept it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setShowRequestSentDialog(false)}>
            Got it
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Task Edit Sheet */}
    {editSheetTask && organization?.id && (
      <TaskEditSheet
        open={!!editSheetTask}
        onOpenChange={(open) => {
          if (!open) setEditSheetTask(null);
        }}
        task={editSheetTask}
        members={members}
        organizationId={organization.id}
        onSave={() => fetchTasks()}
        onRequestSent={(name) => {
          setRequestSentTo(name);
          setShowRequestSentDialog(true);
        }}
      />
    )}
    </>
  );
};

export default ProjectTasksModal;
