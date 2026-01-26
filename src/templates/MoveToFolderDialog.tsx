import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Folder, FolderX } from "lucide-react";
import { TemplateFolder, useTemplateFolders } from "@/hooks/useTemplateFolders";
import { Template } from "@/hooks/useTemplates";

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
  folders: TemplateFolder[];
  onSuccess?: () => void;
}

const MoveToFolderDialog = ({ open, onOpenChange, template, folders, onSuccess }: MoveToFolderDialogProps) => {
  const { moveTemplateToFolder } = useTemplateFolders();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!template) return;

    setIsSubmitting(true);
    const result = await moveTemplateToFolder(template.id, selectedFolderId);
    setIsSubmitting(false);

    if (result) {
      onOpenChange(false);
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup
            value={selectedFolderId || "none"}
            onValueChange={(value) => setSelectedFolderId(value === "none" ? null : value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="none" id="no-folder" />
              <Label htmlFor="no-folder" className="flex items-center gap-2 cursor-pointer flex-1">
                <FolderX className="w-4 h-4 text-muted-foreground" />
                <span>No Folder</span>
              </Label>
            </div>
            {folders.map((folder) => (
              <div 
                key={folder.id} 
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value={folder.id} id={folder.id} />
                <Label htmlFor={folder.id} className="flex items-center gap-2 cursor-pointer flex-1">
                  <Folder className="w-4 h-4" style={{ color: folder.color }} />
                  <span>{folder.name}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          {folders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No folders created yet. Create a folder first to organize your templates.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MoveToFolderDialog;
