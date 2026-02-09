import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Flag, User, Link, Paperclip, FileText, X, Check, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import TaskAttachmentsList from "./TaskAttachmentsList";

interface TeamMember {
  user_id: string;
  full_name: string;
}

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  assigned_user_id: string | null;
  attachment_url?: string | null;
  category: string;
}

interface TaskEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskData;
  members: TeamMember[];
  organizationId: string;
  onSave: () => void;
  onRequestSent?: (assigneeName: string) => void;
}

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const TaskEditSheet = ({
  open,
  onOpenChange,
  task,
  members,
  organizationId,
  onSave,
  onRequestSent,
}: TaskEditSheetProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assigned_user_id || "__none__");
  const [url, setUrl] = useState(task.attachment_url || "");
  const [newAttachments, setNewAttachments] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when task changes
  useEffect(() => {
    if (open) {
      setTitle(task.title);
      setDescription(task.description || "");
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setPriority(task.priority);
      setAssigneeId(task.assigned_user_id || "__none__");
      setUrl(task.attachment_url || "");
      setNewAttachments([]);
    }
  }, [open, task.id]);

  const handleSave = async () => {
    if (!title.trim() || !user) return;

    setIsSaving(true);
    try {
      const actualAssigneeId = assigneeId === "__none__" ? null : assigneeId;
      const previousAssigneeId = task.assigned_user_id;
      const assigneeChanged = actualAssigneeId !== previousAssigneeId;
      const isAssigningToOther = actualAssigneeId && actualAssigneeId !== user.id;

      // Build update payload
      const updates: Record<string, any> = {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate ? dueDate.toISOString().split("T")[0] : null,
        priority,
        attachment_url: url.trim() || null,
      };

      // Handle assignee change with task request flow
      if (assigneeChanged) {
        updates.assigned_user_id = actualAssigneeId;

        if (isAssigningToOther) {
          // If changing to a new person, go through task request flow
          updates.assignment_status = "pending";

          // Remove old assignment record
          if (previousAssigneeId) {
            await supabase
              .from("task_assignments")
              .delete()
              .eq("task_id", task.id)
              .eq("user_id", previousAssigneeId);
          }

          // Create new assignment record as pending
          await supabase.from("task_assignments").insert({
            task_id: task.id,
            user_id: actualAssigneeId,
            assigned_by: user.id,
            assignment_status: "pending",
          });
        } else if (actualAssigneeId === user.id) {
          // Self-assigning
          updates.assignment_status = "accepted";

          if (previousAssigneeId) {
            await supabase
              .from("task_assignments")
              .delete()
              .eq("task_id", task.id)
              .eq("user_id", previousAssigneeId);
          }

          await supabase.from("task_assignments").insert({
            task_id: task.id,
            user_id: actualAssigneeId,
            assigned_by: user.id,
            assignment_status: "accepted",
            accepted_at: new Date().toISOString(),
          });
        } else {
          // Unassigning
          updates.assignment_status = "accepted";
          if (previousAssigneeId) {
            await supabase
              .from("task_assignments")
              .delete()
              .eq("task_id", task.id)
              .eq("user_id", previousAssigneeId);
          }
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", task.id);

      if (error) throw error;

      // Sync URL to task_urls table
      const newUrl = url.trim();
      const oldUrl = task.attachment_url?.trim() || "";
      if (newUrl !== oldUrl) {
        // Remove old URL entry if it existed
        if (oldUrl) {
          await supabase
            .from("task_urls")
            .delete()
            .eq("task_id", task.id)
            .eq("url", oldUrl);
        }
        // Add new URL entry
        if (newUrl) {
          await supabase.from("task_urls").insert({
            task_id: task.id,
            organization_id: organizationId,
            url: newUrl,
            title: null,
            created_by: user.id,
          });
        }
      }

      // Upload new file attachments
      if (newAttachments.length > 0) {
        for (const file of newAttachments) {
          const fileExt = file.name.split(".").pop();
          const filePath = `${organizationId}/${task.id}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("task-attachments")
            .upload(filePath, file);
          if (uploadError) {
            console.error("Upload error:", uploadError);
            continue;
          }
          await supabase.from("task_attachments").insert({
            task_id: task.id,
            organization_id: organizationId,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || null,
            uploaded_by: user.id,
          });
        }
      }

      // Trigger task request notification if assignee changed to someone else
      if (assigneeChanged && isAssigningToOther && onRequestSent) {
        const assignee = members.find((m) => m.user_id === actualAssigneeId);
        onRequestSent(assignee?.full_name || "the assignee");
      } else {
        toast.success("Task updated successfully");
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Task</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="h-10"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">
              Description{" "}
              <span className="text-muted-foreground text-xs">
                ({description.length}/500)
              </span>
            </Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              placeholder="Add a description..."
              className="resize-none"
            />
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="h-10">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
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
                          {getInitials(member.full_name)}
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
            {assigneeId !== "__none__" &&
              assigneeId !== task.assigned_user_id &&
              assigneeId !== user?.id && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Changing assignee will send a new task request for approval.
                </p>
              )}
          </div>

          {/* Due Date & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="w-4 h-4 mr-2 shrink-0" />
                    {dueDate ? format(dueDate, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDueDate(undefined)}
                  className="text-xs text-muted-foreground h-6 px-1"
                >
                  Clear date
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-10">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <SelectValue />
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

          {/* URL */}
          <div className="space-y-1.5">
            <Label>Link / URL</Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-10 pl-10"
              />
            </div>
          </div>

          {/* Existing Attachments */}
          <div className="space-y-1.5">
            <Label>Attachments</Label>
            <TaskAttachmentsList
              taskId={task.id}
              organizationId={organizationId}
              canEdit={true}
            />

            {/* New attachments to upload */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setNewAttachments((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 text-sm font-normal justify-start h-9"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="w-3.5 h-3.5" />
              {newAttachments.length === 0 ? "Add attachments" : "Add more files"}
            </Button>

            {newAttachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newAttachments.map((file, idx) => (
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
                      onClick={() =>
                        setNewAttachments((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-destructive shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!title.trim() || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskEditSheet;
