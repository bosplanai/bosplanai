import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Template, TemplateTask } from "@/hooks/useTemplates";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CheckSquare, FileText, Edit2, X, CalendarIcon, User, Users, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTasks } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjects";
import { useOrganization } from "@/hooks/useOrganization";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template;
}

interface EditableTask extends TemplateTask {
  selected: boolean;
  editedTitle: string;
  editedDescription: string;
  editedPriority: string;
  editedBoard: string;
  dueDate: Date | null;
  assignedUserIds: string[];
}

const TemplatePreviewDialog = ({ open, onOpenChange, template }: TemplatePreviewDialogProps) => {
  const { addTask } = useTasks();
  const { projects } = useProjects();
  const { organization } = useOrganization();
  const { members } = useTeamMembers();
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const handleDownloadDocument = async (doc: { id: string; file_name: string; file_path: string }) => {
    setDownloadingDocId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from("drive-files")
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded",
        description: `${doc.file_name} has been downloaded`,
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Download failed",
        description: "Could not download the document",
        variant: "destructive",
      });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const initialTasks: EditableTask[] = (template.latest_version?.tasks || []).map(task => ({
    ...task,
    selected: true,
    editedTitle: task.title,
    editedDescription: task.description || "",
    editedPriority: task.priority,
    editedBoard: task.default_board || "product",
    dueDate: null,
    assignedUserIds: [],
  }));

  const [tasks, setTasks] = useState<EditableTask[]>(initialTasks);

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, selected: !t.selected } : t
    ));
  };

  const handleToggleAll = () => {
    const allSelected = tasks.every(t => t.selected);
    setTasks(tasks.map(t => ({ ...t, selected: !allSelected })));
  };

  const handleEditTask = (taskId: string, field: keyof EditableTask, value: any) => {
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, [field]: value } : t
    ));
  };

  const handleToggleAssignee = (taskId: string, userId: string) => {
    setTasks(tasks.map(t => {
      if (t.id !== taskId) return t;
      const currentAssignees = t.assignedUserIds || [];
      const newAssignees = currentAssignees.includes(userId)
        ? currentAssignees.filter(id => id !== userId)
        : [...currentAssignees, userId];
      return { ...t, assignedUserIds: newAssignees };
    }));
  };

  const handleApplyTemplate = async () => {
    const selectedTasks = tasks.filter(t => t.selected);
    if (selectedTasks.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to create",
        variant: "destructive",
      });
      return;
    }

    setIsApplying(true);
    try {
      for (const task of selectedTasks) {
        await addTask(
          task.editedTitle,
          "ListTodo", // icon - default icon
          task.editedBoard, // category
          task.editedPriority as "high" | "medium" | "low", // priority
          task.editedDescription || "", // description
          "weekly" as const, // subcategory
          null, // projectId
          task.dueDate ? task.dueDate.toISOString() : null, // dueDate
          task.assignedUserIds.length > 0 ? task.assignedUserIds[0] : null, // assignedUserId (primary)
          task.assignedUserIds, // assignedUserIds
          false // isRecurring
        );
      }

      toast({
        title: "Success",
        description: `Created ${selectedTasks.length} task${selectedTasks.length > 1 ? "s" : ""} from template`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error applying template:", error);
      toast({
        title: "Error",
        description: "Failed to create tasks from template",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const selectedCount = tasks.filter(t => t.selected).length;
  const allSelected = tasks.length > 0 && tasks.every(t => t.selected);

  const priorityColors: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  const getAssigneeNames = (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return null;
    const names = userIds
      .map(id => members.find(m => m.user_id === id)?.full_name)
      .filter(Boolean);
    if (names.length === 0) return null;
    if (names.length === 1) return names[0];
    return `${names[0]} +${names.length - 1}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {template.template_type === "task" ? (
              <CheckSquare className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            <DialogTitle>{template.name}</DialogTitle>
          </div>
          <DialogDescription>
            {template.description || "Preview and customise tasks before applying"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {template.template_type === "task" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleToggleAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedCount} of {tasks.length} tasks selected
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Click edit icon to customise
                </span>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`border rounded-lg p-3 transition-colors ${
                      task.selected ? "bg-background" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={task.selected}
                        onCheckedChange={() => handleToggleTask(task.id)}
                        className="mt-1"
                      />
                      
                      {editingTaskId === task.id ? (
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2 flex-wrap">
                            <Input
                              value={task.editedTitle}
                              onChange={(e) => handleEditTask(task.id, "editedTitle", e.target.value)}
                              placeholder="Task title"
                              className="flex-1 min-w-[200px]"
                            />
                            <Select
                              value={task.editedPriority}
                              onValueChange={(v) => handleEditTask(task.id, "editedPriority", v)}
                            >
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={task.editedBoard}
                              onValueChange={(v) => handleEditTask(task.id, "editedBoard", v)}
                            >
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="product">Product</SelectItem>
                                <SelectItem value="operational">Operational</SelectItem>
                                <SelectItem value="strategic">Strategic</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTaskId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            value={task.editedDescription}
                            onChange={(e) => handleEditTask(task.id, "editedDescription", e.target.value)}
                            placeholder="Description (optional)"
                          />
                          <div className="flex gap-2 flex-wrap">
                            {/* Due Date Picker */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "justify-start text-left font-normal",
                                    !task.dueDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {task.dueDate ? format(task.dueDate, "MMM d, yyyy") : "Set due date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={task.dueDate || undefined}
                                  onSelect={(date) => handleEditTask(task.id, "dueDate", date || null)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>

                            {/* Assignee Selector */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "justify-start text-left font-normal",
                                    task.assignedUserIds.length === 0 && "text-muted-foreground"
                                  )}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  {getAssigneeNames(task.assignedUserIds) || "Assign members"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-2" align="start">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium mb-2">Assign to:</p>
                                  {members.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No team members found</p>
                                  ) : (
                                    members.map((member) => (
                                      <div
                                        key={member.user_id}
                                        className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                                        onClick={() => handleToggleAssignee(task.id, member.user_id)}
                                      >
                                        <Checkbox
                                          checked={task.assignedUserIds.includes(member.user_id)}
                                          onCheckedChange={() => handleToggleAssignee(task.id, member.user_id)}
                                        />
                                        <span className="text-sm">{member.full_name}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>

                            {task.dueDate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTask(task.id, "dueDate", null)}
                                className="text-muted-foreground"
                              >
                                Clear date
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{task.editedTitle}</h4>
                            {task.editedDescription && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {task.editedDescription}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className={priorityColors[task.editedPriority]}>
                                {task.editedPriority}
                              </Badge>
                              <Badge variant="secondary">
                                {task.editedBoard}
                              </Badge>
                              {task.dueDate && (
                                <Badge variant="outline" className="gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {format(task.dueDate, "MMM d")}
                                </Badge>
                              )}
                              {task.assignedUserIds.length > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <User className="h-3 w-3" />
                                  {getAssigneeNames(task.assignedUserIds)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTaskId(task.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {template.template_type === "document" && template.latest_version?.documents && (
            <div className="space-y-2">
              {template.latest_version.documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between gap-3 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{doc.file_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {doc.mime_type} • {Math.round(doc.file_size / 1024)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(doc)}
                    disabled={downloadingDocId === doc.id}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {downloadingDocId === doc.id ? "Downloading..." : "Download"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {template.template_type === "task" && (
            <Button 
              onClick={handleApplyTemplate} 
              disabled={selectedCount === 0 || isApplying}
            >
              {isApplying ? "Creating..." : `Create ${selectedCount} Task${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewDialog;
