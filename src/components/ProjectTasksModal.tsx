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
import TaskUrlsList from "./TaskUrlsList";

interface Task {
  id: string;
  created_at: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string;
  assignee_id: string | null;
  creator_id: string;
  completed: boolean;
  task_number: number;
}

interface ProjectTasksModalProps {
  open: boolean;
  onClose: () => void;
  project: any;
  tasks: Task[];
  onTaskCreate: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
}

const ProjectTasksModal = ({ open, onClose, project, tasks, onTaskCreate, onTaskUpdate, onTaskDelete }: ProjectTasksModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("open");
  const [priority, setPriority] = useState("low");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [showRequestSentDialog, setShowRequestSentDialog] = useState(false);
  const [requestSentTo, setRequestSentTo] = useState("");
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

  const { user } = useAuth();
  const { teamMembers, isLoading: isLoadingTeamMembers } = useTeamMembers();
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { organization } = useOrganization();
  const { hasPermission } = useUserRole();

  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  const sortedTeamMembers = teamMembers ? [...teamMembers].sort((a, b) => a.profile.full_name.localeCompare(b.profile.full_name)) : [];

  const handleCreateTask = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!user?.id || !project?.id) {
      toast.error("User or Project ID is missing");
      return;
    }

    const newTask = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      project_id: project.id,
      assignee_id: assigneeId,
      creator_id: user.id,
      completed: false,
      task_number: tasks.length + 1,
    };

    try {
      const { data: task, error } = await supabase
        .from("tasks")
        .insert([newTask])
        .select("*")
        .single();

      if (error) {
        toast.error(`Error creating task: ${error.message}`);
        console.error("Error creating task:", error);
        return;
      }

      if (task) {
        onTaskCreate(task);
        toast.success("Task created successfully!");
        setTitle("");
        setDescription("");
        setStatus("open");
        setPriority("low");
        setDueDate(undefined);
        setAssigneeId(null);

        if (assigneeId) {
          const assignedMember = teamMembers?.find(member => member.id === assigneeId);
          if (assignedMember) {
            setRequestSentTo(assignedMember.profile.full_name);
            setShowRequestSentDialog(true);
          }
        }
      }
    } catch (error) {
      toast.error(`Unexpected error creating task: ${error}`);
      console.error("Unexpected error creating task:", error);
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPriority(e.target.value);
  };

  const handleAssigneeChange = (value: string) => {
    setAssigneeId(value === "unassigned" ? null : value);
  };

  const handleTitleEdit = () => {
    setIsTitleEditing(true);
  };

  const handleDescriptionEdit = () => {
    setIsDescriptionEditing(true);
  };

  const handleTitleSave = () => {
    setIsTitleEditing(false);
  };

  const handleDescriptionSave = () => {
    setIsDescriptionEditing(false);
  };

  useEffect(() => {
    if (isTitleEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isTitleEditing]);

  useEffect(() => {
    if (isDescriptionEditing && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
    }
  }, [isDescriptionEditing]);

  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <FolderOpen className="w-5 h-5 mr-2" />
            {project?.title} Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-4">
          {/* Task Details */}
          <div className="col-span-1">
            <div className="bg-card rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Task Details</h3>

              {/* Title */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  {!isTitleEditing && (
                    <Button variant="ghost" size="icon" onClick={handleTitleEdit}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {isTitleEditing ? (
                  <div className="flex items-center">
                    <Input
                      type="text"
                      id="taskTitle"
                      placeholder="Enter task title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      ref={titleInputRef}
                      onBlur={handleTitleSave}
                      className="mr-2"
                    />
                    <Button variant="outline" size="sm" onClick={handleTitleSave}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <p>{title || "No title set"}</p>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  {!isDescriptionEditing && (
                    <Button variant="ghost" size="icon" onClick={handleDescriptionEdit}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {isDescriptionEditing ? (
                  <div className="flex items-center">
                    <Textarea
                      id="taskDescription"
                      placeholder="Enter task description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      ref={descriptionTextareaRef}
                      onBlur={handleDescriptionSave}
                      className="mr-2"
                    />
                    <Button variant="outline" size="sm" onClick={handleDescriptionSave}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <p>{description || "No description set"}</p>
                )}
              </div>

              {/* Status */}
              <div className="mb-4">
                <label htmlFor="taskStatus" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="in review">In Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="mb-4">
                <label htmlFor="taskPriority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="mb-4">
                <label htmlFor="taskDueDate" className="block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Assignee */}
              <div className="mb-4">
                <label htmlFor="taskAssignee" className="block text-sm font-medium text-gray-700">
                  Assignee
                </label>
                <Select value={assigneeId || "unassigned"} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {sortedTeamMembers?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Create Task Button */}
              <Button onClick={handleCreateTask} className="w-full">
                Create Task
              </Button>
            </div>
          </div>

          {/* Task List */}
          <div className="col-span-1">
            <div className="bg-card rounded-md p-4">
              <h3 className="text-lg font-semibold mb-2">Tasks</h3>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground">No tasks yet.</p>
              ) : (
                <ul>
                  {tasks.map((task) => (
                    <li key={task.id} className="py-2 border-b border-border last:border-none">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary">{task.status}</Badge>
                          <Button variant="ghost" size="icon">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
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
    </>
  );
};

export default ProjectTasksModal;
