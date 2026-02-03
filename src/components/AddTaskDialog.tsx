import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Plus, CalendarIcon, Upload, X, Paperclip, LucideIcon, ListTodo, Search, Users, BarChart3, Coins, TrendingUp, CheckSquare, Navigation, Lightbulb, FileText, ClipboardList, Library, Save, AlertTriangle, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";
import { TaskPriority, TaskSubcategory } from "@/hooks/useTasks";
import { useProjects, Project } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTemplates, Template } from "@/hooks/useTemplates";
import TemplateSelectDialog from "./templates/TemplateSelectDialog";
import TemplatePreviewDialog from "./templates/TemplatePreviewDialog";
const iconMap: Record<string, LucideIcon> = {
  ListTodo,
  Search,
  Users,
  BarChart3,
  Coins,
  TrendingUp,
  CheckSquare,
  Navigation,
  Lightbulb,
  FileText,
  ClipboardList
};
const iconOptions = [{
  value: "ListTodo",
  label: "List"
}, {
  value: "Search",
  label: "Search"
}, {
  value: "Users",
  label: "Users"
}, {
  value: "BarChart3",
  label: "Chart"
}, {
  value: "Coins",
  label: "Money"
}, {
  value: "TrendingUp",
  label: "Trending"
}, {
  value: "CheckSquare",
  label: "Checkbox"
}, {
  value: "Navigation",
  label: "Navigation"
}, {
  value: "Lightbulb",
  label: "Idea"
}, {
  value: "FileText",
  label: "Document"
}, {
  value: "ClipboardList",
  label: "Clipboard"
}];
const priorityOptions = [{
  value: "high",
  label: "High",
  className: "text-priority-high"
}, {
  value: "medium",
  label: "Medium",
  className: "text-priority-medium"
}, {
  value: "low",
  label: "Low",
  className: "text-priority-low"
}];
const subcategoryOptions = [{
  value: "weekly",
  label: "Weekly"
}, {
  value: "monthly",
  label: "Monthly"
}, {
  value: "quarterly",
  label: "Quarterly"
}, {
  value: "yearly",
  label: "Yearly"
}, {
  value: "misc",
  label: "MISC"
}];
interface TeamMember {
  id: string;
  full_name: string;
}
interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: string;
  showSubcategoryFilter: boolean;
  teamMembers: TeamMember[];
  organizationId: string | null;
  canCreateProject?: boolean;
  onAddTask: (params: {
    title: string;
    icon: string;
    category: string;
    priority: TaskPriority;
    description: string;
    subcategory: TaskSubcategory;
    projectId: string | null;
    dueDate: string | null;
    assignedUserId: string | null;
    assignedUserIds: string[];
    isRecurring: boolean;
    isDraft?: boolean;
  }) => Promise<string | null>;
  onComplete?: () => void; // Called after all uploads finish
}

// Session storage key for persisting form state
const FORM_STORAGE_KEY = "addTaskDialog_formState";
interface PersistedFormState {
  title: string;
  description: string;
  icon: string;
  priority: TaskPriority;
  subcategory: TaskSubcategory;
  projectSelection: string;
  newProjectTitle: string;
  dueDate: string | null;
  assignedUserIds: string[];
  taskUrls: {
    url: string;
    title: string;
  }[];
  newUrl: string;
  newUrlTitle: string;
  isRecurring: boolean;
}
const AddTaskDialog = ({
  open,
  onOpenChange,
  activeTab,
  showSubcategoryFilter,
  teamMembers,
  organizationId,
  canCreateProject = true,
  onAddTask,
  onComplete
}: AddTaskDialogProps) => {
  // Initialize state from sessionStorage if available
  const getInitialState = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(FORM_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as PersistedFormState;
      }
    } catch (e) {
      console.error("Error reading form state from sessionStorage:", e);
    }
    return null;
  }, []);
  const initialState = getInitialState();
  const [title, setTitle] = useState(initialState?.title || "");
  const [description, setDescription] = useState(initialState?.description || "");
  const [icon, setIcon] = useState(initialState?.icon || "ListTodo");
  const [priority, setPriority] = useState<TaskPriority>(initialState?.priority || "medium");
  const [subcategory, setSubcategory] = useState<TaskSubcategory>(initialState?.subcategory || "weekly");
  const [projectSelection, setProjectSelection] = useState<string>(initialState?.projectSelection || "none");
  const [newProjectTitle, setNewProjectTitle] = useState(initialState?.newProjectTitle || "");
  const [dueDate, setDueDate] = useState<Date | undefined>(initialState?.dueDate ? new Date(initialState.dueDate) : undefined);
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>(initialState?.assignedUserIds || []);
  const [attachments, setAttachments] = useState<File[]>([]); // Files can't be persisted to sessionStorage
  const [taskUrls, setTaskUrls] = useState<{
    url: string;
    title: string;
  }[]>(initialState?.taskUrls || []);
  const [newUrl, setNewUrl] = useState(initialState?.newUrl || "");
  const [newUrlTitle, setNewUrlTitle] = useState(initialState?.newUrlTitle || "");
  const [isRecurring, setIsRecurring] = useState(initialState?.isRecurring || false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    toast
  } = useToast();
  const {
    templates
  } = useTemplates();
  const [templateSelectOpen, setTemplateSelectOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const {
    projects,
    addProject
  } = useProjects();
  const hasTaskTemplates = templates.some(t => t.template_type === "task");

  // Persist form state to sessionStorage whenever it changes (only when dialog is open)
  useEffect(() => {
    if (!open) return;
    const formState: PersistedFormState = {
      title,
      description,
      icon,
      priority,
      subcategory,
      projectSelection,
      newProjectTitle,
      dueDate: dueDate ? dueDate.toISOString() : null,
      assignedUserIds,
      taskUrls,
      newUrl,
      newUrlTitle,
      isRecurring
    };
    try {
      sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formState));
    } catch (e) {
      console.error("Error saving form state to sessionStorage:", e);
    }
  }, [open, title, description, icon, priority, subcategory, projectSelection, newProjectTitle, dueDate, assignedUserIds, taskUrls, newUrl, newUrlTitle, isRecurring]);

  // Check if user has entered any data
  const hasUnsavedChanges = title.trim() !== "" || description.trim() !== "" || attachments.length > 0 || taskUrls.length > 0 || projectSelection !== "none" || dueDate !== undefined || assignedUserIds.length > 0;
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIcon("ListTodo");
    setPriority("medium");
    setSubcategory("weekly");
    setProjectSelection("none");
    setNewProjectTitle("");
    setDueDate(undefined);
    setAssignedUserIds([]);
    setAttachments([]);
    setTaskUrls([]);
    setNewUrl("");
    setNewUrlTitle("");
    setIsRecurring(false);
    // Clear persisted state
    try {
      sessionStorage.removeItem(FORM_STORAGE_KEY);
    } catch (e) {
      console.error("Error clearing form state from sessionStorage:", e);
    }
  };
  const handleCloseAttempt = (isOpen: boolean) => {
    if (!isOpen && hasUnsavedChanges) {
      setShowCloseWarning(true);
    } else {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }
  };
  const confirmClose = () => {
    setShowCloseWarning(false);
    resetForm();
    onOpenChange(false);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  const uploadAttachmentToStorage = async (file: File, taskId: string): Promise<boolean> => {
    if (!organizationId) return false;
    const {
      data: userData
    } = await supabase.auth.getUser();
    if (!userData.user) return false;
    const fileExt = file.name.split(".").pop();
    const filePath = `${organizationId}/${taskId}_${Date.now()}.${fileExt}`;
    try {
      // Upload to storage
      const {
        error: uploadError
      } = await supabase.storage.from("task-attachments").upload(filePath, file);
      if (uploadError) throw uploadError;

      // Insert into task_attachments table
      const {
        error
      } = await supabase.from("task_attachments").insert({
        task_id: taskId,
        organization_id: organizationId,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
        uploaded_by: userData.user.id
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Upload error:", error);
      return false;
    }
  };
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title",
        variant: "destructive"
      });
      return;
    }
    setIsUploading(true);
    try {
      let finalProjectId: string | null = null;

      // Handle project creation if "new" is selected
      if (projectSelection === "new" && newProjectTitle.trim()) {
        await addProject(newProjectTitle, "", undefined);
        // Get the newly created project
        const {
          data: newProjects
        } = await supabase.from("projects").select("id").eq("title", newProjectTitle).order("created_at", {
          ascending: false
        }).limit(1);
        if (newProjects && newProjects.length > 0) {
          finalProjectId = newProjects[0].id;
        }
      } else if (projectSelection !== "none" && projectSelection !== "new") {
        finalProjectId = projectSelection;
      }

      // Create the task and get the task ID
      const taskId = await onAddTask({
        title,
        icon,
        category: activeTab,
        priority,
        description,
        subcategory: showSubcategoryFilter ? subcategory : "weekly",
        projectId: finalProjectId,
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : null,
        assignedUserId: assignedUserIds.length > 0 ? assignedUserIds[0] : null,
        assignedUserIds,
        isRecurring,
        isDraft: false
      });

      // Upload attachments if task was created successfully
      if (taskId && attachments.length > 0) {
        const uploadPromises = attachments.map(file => uploadAttachmentToStorage(file, taskId));
        await Promise.all(uploadPromises);
      }

      // Save URLs if task was created successfully
      if (taskId && taskUrls.length > 0 && organizationId) {
        const {
          data: userData
        } = await supabase.auth.getUser();
        if (userData.user) {
          const urlInserts = taskUrls.map(u => ({
            task_id: taskId,
            organization_id: organizationId,
            url: u.url,
            title: u.title || null,
            created_by: userData.user.id
          }));
          await supabase.from("task_urls").insert(urlInserts);
        }
      }

      // Trigger refetch after all uploads are complete
      onComplete?.();
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleSaveAsDraft = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title to save as draft",
        variant: "destructive"
      });
      return;
    }
    setIsSavingDraft(true);
    try {
      let finalProjectId: string | null = null;
      if (projectSelection === "new" && newProjectTitle.trim()) {
        await addProject(newProjectTitle, "", undefined);
        const {
          data: newProjects
        } = await supabase.from("projects").select("id").eq("title", newProjectTitle).order("created_at", {
          ascending: false
        }).limit(1);
        if (newProjects && newProjects.length > 0) {
          finalProjectId = newProjects[0].id;
        }
      } else if (projectSelection !== "none" && projectSelection !== "new") {
        finalProjectId = projectSelection;
      }
      const taskId = await onAddTask({
        title,
        icon,
        category: activeTab,
        priority,
        description,
        subcategory: showSubcategoryFilter ? subcategory : "weekly",
        projectId: finalProjectId,
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : null,
        assignedUserId: assignedUserIds.length > 0 ? assignedUserIds[0] : null,
        assignedUserIds,
        isRecurring,
        isDraft: true
      });
      if (taskId && attachments.length > 0) {
        const uploadPromises = attachments.map(file => uploadAttachmentToStorage(file, taskId));
        await Promise.all(uploadPromises);
      }

      // Save URLs for drafts too
      if (taskId && taskUrls.length > 0 && organizationId) {
        const {
          data: userData
        } = await supabase.auth.getUser();
        if (userData.user) {
          const urlInserts = taskUrls.map(u => ({
            task_id: taskId,
            organization_id: organizationId,
            url: u.url,
            title: u.title || null,
            created_by: userData.user.id
          }));
          await supabase.from("task_urls").insert(urlInserts);
        }
      }

      // Trigger refetch after uploads/urls complete for drafts too
      onComplete?.();
      resetForm();
      onOpenChange(false);
      toast({
        title: "Draft saved",
        description: "Your task has been saved as a draft"
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingDraft(false);
    }
  };
  return <>
    {/* Unsaved Changes Warning Dialog */}
    <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to leave? All progress on this task will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCloseWarning(false)}>
            No, Continue Editing
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmClose} className="bg-destructive hover:bg-destructive/90">
            Yes, Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-full px-5 text-white dark:text-black shadow-md hover:opacity-90 bg-brand-orange hover:bg-brand-orange/90">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Template Selection Button */}
          {hasTaskTemplates && <Button type="button" variant="outline" className="w-full justify-start gap-2 border-dashed" onClick={() => setTemplateSelectOpen(true)}>
              <Library className="h-4 w-4" />
              Use a Template
            </Button>}

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="Enter task title..." value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {/* Task Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-muted-foreground text-xs">({description.length}/2000)</span>
            </Label>
            <Textarea id="description" placeholder="Enter task description (optional)..." value={description} onChange={e => setDescription(e.target.value.slice(0, 2000))} rows={3} maxLength={2000} />
          </div>

          {/* Project Association */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={projectSelection} onValueChange={setProjectSelection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Project</SelectItem>
                {canCreateProject && <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Create New Project
                    </div>
                  </SelectItem>}
                {projects.map(project => <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* New Project Title */}
          {projectSelection === "new" && <div className="space-y-2">
              <Label htmlFor="newProjectTitle">New Project Title <span className="text-destructive">*</span></Label>
              <Input id="newProjectTitle" placeholder="Enter new project title..." value={newProjectTitle} onChange={e => setNewProjectTitle(e.target.value)} />
            </div>}

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {dueDate && <Button variant="ghost" size="sm" onClick={() => setDueDate(undefined)} className="text-xs text-muted-foreground">
                Clear date
              </Button>}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map(p => <SelectItem key={p.value} value={p.value}>
                    <span className={p.className}>{p.label}</span>
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Assignees - multi-select */}
          <div className="space-y-2">
            <Label>Assign To (select multiple)</Label>
              <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
                {teamMembers.length === 0 ? <p className="text-xs text-muted-foreground py-2 text-center">No team members available</p> : teamMembers.map(member => {
                const isSelected = assignedUserIds.includes(member.id);
                return <div key={member.id} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors", isSelected && "bg-primary/10")} onClick={() => {
                  if (isSelected) {
                    setAssignedUserIds(assignedUserIds.filter(id => id !== member.id));
                  } else {
                    setAssignedUserIds([...assignedUserIds, member.id]);
                  }
                }}>
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <span className="text-sm">{member.full_name}</span>
                      </div>;
              })}
              </div>
              {assignedUserIds.length > 0 && <p className="text-xs text-muted-foreground">
                  {assignedUserIds.length} user{assignedUserIds.length !== 1 ? 's' : ''} selected
                </p>}
          </div>

          {/* Icon - hidden for Product Management dashboard */}
          {activeTab !== "product"}

          {/* Task Type (Subcategory) */}
          {showSubcategoryFilter && <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={subcategory} onValueChange={v => setSubcategory(v as TaskSubcategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subcategoryOptions.map(option => <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>}

          {/* Recurring Task Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox id="isRecurring" checked={isRecurring} onCheckedChange={checked => setIsRecurring(checked === true)} />
            <Label htmlFor="isRecurring" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
              Recurring Task
            </Label>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" />
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full justify-start gap-2">
              <Paperclip className="w-4 h-4" />
              Add Attachments
            </Button>
            {attachments.length > 0 && <div className="space-y-2 mt-2">
                {attachments.map((file, index) => <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(index)} className="h-6 w-6 p-0 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>)}
              </div>}
          </div>

          {/* URLs */}
          <div className="space-y-2">
            <Label>URLs</Label>
            <div className="flex gap-2">
              <Input placeholder="https://example.com" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="flex-1" />
              <Button type="button" variant="outline" size="icon" onClick={() => {
                if (newUrl.trim()) {
                  setTaskUrls([...taskUrls, {
                    url: newUrl.trim(),
                    title: newUrlTitle.trim()
                  }]);
                  setNewUrl("");
                  setNewUrlTitle("");
                }
              }} disabled={!newUrl.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {taskUrls.length > 0 && <div className="space-y-2 mt-2">
                {taskUrls.map((urlItem, index) => <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate text-primary">{urlItem.url}</span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTaskUrls(taskUrls.filter((_, i) => i !== index))} className="h-6 w-6 p-0 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>)}
              </div>}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSaveAsDraft} variant="outline" className="flex-1" disabled={isSavingDraft || isUploading || !title.trim()}>
              <Save className="w-4 h-4 mr-2" />
              {isSavingDraft ? "Saving..." : "Save as Draft"}
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={isUploading || isSavingDraft || !title.trim() || projectSelection === "new" && !newProjectTitle.trim()}>
              {isUploading ? "Creating..." : "Add Task"}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Template Selection Dialog */}
      <TemplateSelectDialog open={templateSelectOpen} onOpenChange={setTemplateSelectOpen} onSelectTemplate={template => {
        setTemplateSelectOpen(false);
        setSelectedTemplate(template);
        setTemplatePreviewOpen(true);
        onOpenChange(false); // Close the add task dialog
      }} />

      {/* Template Preview Dialog */}
      {selectedTemplate && <TemplatePreviewDialog open={templatePreviewOpen} onOpenChange={open => {
        setTemplatePreviewOpen(open);
        if (!open) setSelectedTemplate(null);
      }} template={selectedTemplate} />}
    </Dialog>
    </>;
};
export default AddTaskDialog;