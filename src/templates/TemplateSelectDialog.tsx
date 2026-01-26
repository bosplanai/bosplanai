import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTemplates, Template } from "@/hooks/useTemplates";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckSquare, Search, ArrowRight, Loader2, AlertCircle } from "lucide-react";

interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: Template) => void;
}

const categoryColors: Record<string, string> = {
  operations: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  strategic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  product: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const TemplateSelectDialog = ({ open, onOpenChange, onSelectTemplate }: TemplateSelectDialogProps) => {
  const { templates, loading } = useTemplates();
  const [searchQuery, setSearchQuery] = useState("");

  const taskTemplates = templates.filter(t => 
    t.template_type === "task" && 
    (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     t.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select a Template</DialogTitle>
          <DialogDescription className="space-y-2">
            <span>Choose a template to create tasks from</span>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs">Don't forget to assign team members and due dates to your tasks!</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : taskTemplates.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? "No templates match your search" : "No task templates available"}
              </p>
            </div>
          ) : (
            taskTemplates.map((template) => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors group"
                onClick={() => onSelectTemplate(template)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="h-5 w-5 text-primary" />
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={categoryColors[template.category]}>
                          {template.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {template.latest_version?.tasks?.length || 0} tasks
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="border-t pt-4 mt-4">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateSelectDialog;
