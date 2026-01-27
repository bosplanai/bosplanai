import { useState, useRef } from "react";
import { format } from "date-fns";
import { X, Plus, Trash2, ClipboardList, CalendarIcon, Upload, Paperclip, LucideIcon, ListTodo, Search, Users, BarChart3, Coins, TrendingUp, CheckSquare, Navigation, Lightbulb, FileText, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { usePersonalChecklist, TimeGroup, ChecklistPriority, ChecklistItem } from "@/hooks/usePersonalChecklist";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const iconMap: Record<string, LucideIcon> = {
  ListTodo, Search, Users, BarChart3, Coins, TrendingUp, CheckSquare, Navigation, Lightbulb, FileText, ClipboardList
};

const iconOptions = [
  { value: "ListTodo", label: "List" },
  { value: "Search", label: "Search" },
  { value: "Users", label: "Users" },
  { value: "BarChart3", label: "Chart" },
  { value: "Coins", label: "Money" },
  { value: "TrendingUp", label: "Trending" },
  { value: "CheckSquare", label: "Checkbox" },
  { value: "Navigation", label: "Navigation" },
  { value: "Lightbulb", label: "Idea" },
  { value: "FileText", label: "Document" },
  { value: "ClipboardList", label: "Clipboard" }
];

const priorityOptions = [
  { value: "high", label: "High", className: "text-priority-high" },
  { value: "medium", label: "Medium", className: "text-priority-medium" },
  { value: "low", label: "Low", className: "text-priority-low" }
];

const timeGroupLabels: Record<TimeGroup, string> = {
  today: "Today",
  this_week: "This Week",
  this_month: "This Month",
};

const PersonalChecklistModal = () => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TimeGroup>("today");
  const [isAddMode, setIsAddMode] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("ListTodo");
  const [priority, setPriority] = useState<ChecklistPriority>("medium");
  const [projectSelection, setProjectSelection] = useState<string>("none");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const { items, loading, addItem, updateItem, toggleItem, deleteItem, getItemsByGroup } = usePersonalChecklist();
  const { projects } = useProjects();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIcon("ListTodo");
    setPriority("medium");
    setProjectSelection("none");
    setDueDate(undefined);
    setAttachments([]);
    setIsAddMode(false);
    setEditingItem(null);
  };

  const startEditing = (item: ChecklistItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setIcon(item.icon || "ListTodo");
    setPriority(item.priority || "medium");
    setProjectSelection(item.project_id || "none");
    setDueDate(item.due_date ? new Date(item.due_date) : undefined);
    setAttachments([]);
    setIsAddMode(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast({
        title: "Not signed in",
        description: "Please sign in to upload attachments.",
        variant: "destructive",
      });
      return null;
    }

    const fileExt = file.name.split(".").pop();
    const safeExt = fileExt ? `.${fileExt}` : "";
    // Path format: <user_id>/<timestamp>_<uuid>.<ext>
    const filePath = `${userData.user.id}/${Date.now()}_${crypto.randomUUID()}${safeExt}`;

    const { data, error } = await supabase.storage
      .from("personal-checklist-attachments")
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    // Store the file path in the database; signed URLs are generated when rendering.
    return { url: data.path, name: file.name };
  };

  const handleSaveItem = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      let attachmentUrl: string | null = editingItem?.attachment_url || null;
      let attachmentName: string | null = editingItem?.attachment_name || null;
      
      if (attachments.length > 0) {
        const result = await uploadFile(attachments[0]);
        if (!result) return;
        attachmentUrl = result.url;
        attachmentName = result.name;
      }

      const dueDateStr = dueDate ? dueDate.toISOString().split('T')[0] : null;

      if (editingItem) {
        // Update existing item
        await updateItem({
          id: editingItem.id,
          title: title.trim(),
          description: description || null,
          dueDate: dueDateStr,
          priority,
          projectId: projectSelection !== "none" ? projectSelection : null,
          icon,
          attachmentUrl,
          attachmentName,
        });
      } else {
        // Add new item
        await addItem({
          title: title.trim(),
          description: description || undefined,
          dueDate: dueDateStr,
          priority,
          projectId: projectSelection !== "none" ? projectSelection : null,
          icon,
          attachmentUrl,
          attachmentName,
        });
      }

      resetForm();
    } catch (error) {
      console.error("Error saving item:", error);
      toast({
        title: "Error",
        description: "Failed to save item",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const renderChecklistItems = (group: TimeGroup) => {
    const groupItems = getItemsByGroup(group);

    if (groupItems.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-6">
          No items yet. Add one above!
        </p>
      );
    }

    return (
      <div className="space-y-2">
        {groupItems.map(item => {
          const IconComp = iconMap[item.icon] || ListTodo;
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors group",
                item.is_completed && "bg-muted/50"
              )}
            >
              <Checkbox
                checked={item.is_completed}
                onCheckedChange={() => toggleItem(item.id)}
                className="h-5 w-5 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <IconComp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span
                    className={cn(
                      "text-sm font-medium",
                      item.is_completed && "line-through text-muted-foreground"
                    )}
                  >
                    {item.title}
                  </span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    item.priority === "high" && "bg-priority-high/10 text-priority-high",
                    item.priority === "medium" && "bg-priority-medium/10 text-priority-medium",
                    item.priority === "low" && "bg-priority-low/10 text-priority-low"
                  )}>
                    {item.priority}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                {item.due_date && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {format(new Date(item.due_date), "MMM d, yyyy")}
                  </p>
                )}
                {(item.signed_attachment_url || item.attachment_url) && item.attachment_name && (
                  <a
                    href={item.signed_attachment_url || item.attachment_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paperclip className="w-3 h-3" />
                    {item.attachment_name}
                  </a>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditing(item)}
                  className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAddForm = () => (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="checklist-title">Title <span className="text-destructive">*</span></Label>
        <Input
          id="checklist-title"
          placeholder="Enter title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="checklist-description">
          Description <span className="text-muted-foreground text-xs">({description.length}/500)</span>
        </Label>
        <Textarea
          id="checklist-description"
          placeholder="Enter description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={2}
          maxLength={500}
        />
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
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Due Date */}
      <div className="space-y-2">
        <Label>Due Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dueDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dueDate ? format(dueDate, "PPP") : <span>Pick a due date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {dueDate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDueDate(undefined)}
            className="text-xs text-muted-foreground"
          >
            Clear date
          </Button>
        )}
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as ChecklistPriority)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                <span className={p.className}>{p.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Icon */}
      <div className="space-y-2">
        <Label>Icon</Label>
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {iconOptions.map((ic) => {
              const IconComp = iconMap[ic.value];
              return (
                <SelectItem key={ic.value} value={ic.value}>
                  <IconComp className="w-4 h-4" />
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* File Attachments */}
      <div className="space-y-2">
        <Label>Attachments</Label>
        <div
          className="border-2 border-dashed border-border rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">Click to upload</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        {attachments.length > 0 && (
          <div className="space-y-1 mt-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-muted/50 p-2 rounded-md">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs truncate">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="flex-shrink-0 h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleSaveItem}
          className="flex-1"
          disabled={isUploading || !title.trim()}
        >
          {isUploading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
        </Button>
        <Button variant="outline" onClick={resetForm}>
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full gap-2 bg-brand-orange hover:bg-brand-orange/90 border-brand-orange text-white dark:text-black hover:text-white dark:hover:text-black">
          <ClipboardList className="w-4 h-4" />
          My Checklist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Personal Checklist
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TimeGroup)}>
          <TabsList className="grid w-full grid-cols-3">
            {(Object.keys(timeGroupLabels) as TimeGroup[]).map(group => (
              <TabsTrigger key={group} value={group} className="text-xs">
                {timeGroupLabels[group]}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-4">
            {/* Add Button or Form */}
            {isAddMode ? (
              renderAddForm()
            ) : (
              <Button 
                onClick={() => setIsAddMode(true)} 
                variant="outline" 
                className="w-full mb-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add New Item
              </Button>
            )}

            {loading ? (
              <div className="text-center py-6 text-muted-foreground">Loading...</div>
            ) : (
              <>
                {(Object.keys(timeGroupLabels) as TimeGroup[]).map(group => (
                  <TabsContent key={group} value={group} className="mt-0">
                    {renderChecklistItems(group)}
                  </TabsContent>
                ))}
              </>
            )}
          </div>
        </Tabs>

        <div className="text-xs text-muted-foreground mt-2 text-center">
          Your personal checklist is private and not shared with others.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonalChecklistModal;
