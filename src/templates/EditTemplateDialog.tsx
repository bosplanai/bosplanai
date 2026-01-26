import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTemplates, TemplateCategory, TemplateTask, Template } from "@/hooks/useTemplates";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

const EditTemplateDialog = ({ open, onOpenChange, template }: EditTemplateDialogProps) => {
  const { updateTemplate } = useTemplates();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("general");
  const [tasks, setTasks] = useState<Partial<TemplateTask>[]>([]);
  const [versionNote, setVersionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setCategory(template.category);
      setVersionNote("");
      
      // Load tasks from latest version
      if (template.latest_version?.tasks && template.latest_version.tasks.length > 0) {
        setTasks(template.latest_version.tasks.map(t => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          icon: t.icon,
          position: t.position,
          default_board: t.default_board,
        })));
      } else {
        setTasks([{ title: "", description: "", priority: "medium", default_board: "product", position: 0 }]);
      }
    }
  }, [template]);

  const handleAddTask = () => {
    setTasks([...tasks, { 
      title: "", 
      description: "", 
      priority: "medium", 
      default_board: "product", 
      position: tasks.length 
    }]);
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleTaskChange = (index: number, field: keyof TemplateTask, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setTasks(newTasks);
  };

  const handleSubmit = async () => {
    if (!template || !name.trim()) return;
    
    const validTasks = tasks.filter(t => t.title?.trim());
    
    setIsSubmitting(true);
    try {
      // Check if metadata changed
      const metadataUpdates: { name?: string; description?: string; category?: TemplateCategory } = {};
      if (name !== template.name) metadataUpdates.name = name;
      if (description !== template.description) metadataUpdates.description = description;
      if (category !== template.category) metadataUpdates.category = category;

      // Check if tasks changed
      const originalTasks = template.latest_version?.tasks || [];
      const tasksChanged = JSON.stringify(validTasks.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        default_board: t.default_board,
      }))) !== JSON.stringify(originalTasks.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        default_board: t.default_board,
      })));

      // Prepare tasks for update
      const templateTasks = tasksChanged ? validTasks.map((t, i) => ({
        title: t.title!,
        description: t.description || null,
        priority: t.priority || "medium",
        icon: t.icon || null,
        position: i,
        default_board: t.default_board || null,
      })) : undefined;

      await updateTemplate(
        template.id,
        metadataUpdates,
        templateTasks,
        versionNote || undefined
      );
      
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = name.trim() && (template?.template_type === "document" || tasks.some(t => t.title?.trim()));

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Template Name *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekly Sprint Tasks"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is used for..."
              rows={2}
            />
          </div>

          {/* Task Template Fields */}
          {template.template_type === "task" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Template Tasks *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {tasks.map((task, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                    <GripVertical className="h-5 w-5 mt-2 text-muted-foreground cursor-move" />
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={task.title || ""}
                          onChange={(e) => handleTaskChange(index, "title", e.target.value)}
                          placeholder="Task title *"
                          className="flex-1"
                        />
                        <Select 
                          value={task.priority || "medium"} 
                          onValueChange={(v) => handleTaskChange(index, "priority", v)}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">
                              <Badge variant="outline" className="bg-red-100 text-red-800 border-0">High</Badge>
                            </SelectItem>
                            <SelectItem value="medium">
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-0">Medium</Badge>
                            </SelectItem>
                            <SelectItem value="low">
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-0">Low</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Select 
                          value={task.default_board || "product"} 
                          onValueChange={(v) => handleTaskChange(index, "default_board", v)}
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
                      </div>
                      <Input
                        value={task.description || ""}
                        onChange={(e) => handleTaskChange(index, "description", e.target.value)}
                        placeholder="Task description (optional)"
                      />
                    </div>
                    {tasks.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTask(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version Note */}
          <div className="space-y-2">
            <Label htmlFor="version-note">Version Note (optional)</Label>
            <Input
              id="version-note"
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              placeholder="e.g., Updated task priorities"
            />
            <p className="text-xs text-muted-foreground">
              Changes to tasks will create a new version of the template
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditTemplateDialog;
