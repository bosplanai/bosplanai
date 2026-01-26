import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTemplates, TemplateCategory, TemplateTask, TemplateType, TemplateDocument } from "@/hooks/useTemplates";
import { Plus, Trash2, GripVertical, Upload, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateTemplateDialog = ({ open, onOpenChange }: CreateTemplateDialogProps) => {
  const { createTemplate } = useTemplates();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [templateType, setTemplateType] = useState<TemplateType>("task");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("general");
  const [tasks, setTasks] = useState<Partial<TemplateTask>[]>([
    { title: "", description: "", priority: "medium", default_board: "product", position: 0 }
  ]);
  const [documents, setDocuments] = useState<{ file: File; uploading: boolean }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newDocs = files.map(file => ({ file, uploading: false }));
    setDocuments([...documents, ...newDocs]);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const uploadDocumentToStorage = async (file: File): Promise<{ file_path: string } | null> => {
    if (!organization?.id) return null;

    try {
      const filePath = `${organization.id}/templates/${Date.now()}_${file.name}`;

      // Upload to drive-files storage (just storage, not the drive_files table)
      const { error: uploadError } = await supabase.storage
        .from("drive-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      return { file_path: filePath };
    } catch (error) {
      console.error("Error uploading document:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    if (templateType === "task") {
      const validTasks = tasks.filter(t => t.title?.trim());
      if (validTasks.length === 0) return;

      setIsSubmitting(true);
      try {
        const templateTasks = validTasks.map((t, i) => ({
          title: t.title!,
          description: t.description || null,
          priority: t.priority || "medium",
          icon: t.icon || null,
          position: i,
          default_board: t.default_board || null,
        }));

        await createTemplate(name, description, category, "task", templateTasks);
        resetForm();
        onOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Document template
      if (documents.length === 0) {
        toast({
          title: "No documents",
          description: "Please add at least one document",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const uploadedDocs: Omit<TemplateDocument, "id" | "template_id" | "template_version_id" | "created_at">[] = [];
        
        for (const doc of documents) {
          const result = await uploadDocumentToStorage(doc.file);
          if (result) {
            uploadedDocs.push({
              file_name: doc.file.name,
              file_path: result.file_path,
              file_size: doc.file.size,
              mime_type: doc.file.type || null,
              drive_file_id: null,
            });
          }
        }

        if (uploadedDocs.length === 0) {
          toast({
            title: "Upload failed",
            description: "Failed to upload documents",
            variant: "destructive",
          });
          return;
        }

        await createTemplate(name, description, category, "document", [], uploadedDocs);
        resetForm();
        onOpenChange(false);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("general");
    setTemplateType("task");
    setTasks([{ title: "", description: "", priority: "medium", default_board: "product", position: 0 }]);
    setDocuments([]);
  };

  const isValid = templateType === "task" 
    ? name.trim() && tasks.some(t => t.title?.trim())
    : name.trim() && documents.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Type Tabs */}
          <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as TemplateType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="task">Task Template</TabsTrigger>
              <TabsTrigger value="document">Document Template</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={templateType === "task" ? "e.g., Weekly Sprint Tasks" : "e.g., Project Proposal"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is used for..."
              rows={2}
            />
          </div>

          {/* Task Template Fields */}
          {templateType === "task" && (
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

          {/* Document Template Fields */}
          {templateType === "document" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Template Documents *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.txt,.rtf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {documents.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload Word, Excel, PDF, or other document files
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Files
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                      <FileText className="h-5 w-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(index)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTemplateDialog;
