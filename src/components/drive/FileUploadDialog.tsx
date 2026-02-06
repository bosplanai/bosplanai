import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Lock, X, Users, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
const FILE_CATEGORIES = [{
  value: "general",
  label: "General Document"
}, {
  value: "contract",
  label: "Contract"
}, {
  value: "strategy",
  label: "Strategy Document"
}, {
  value: "policy",
  label: "Policy"
}, {
  value: "report",
  label: "Report"
}, {
  value: "presentation",
  label: "Presentation"
}, {
  value: "financial",
  label: "Financial Document"
}, {
  value: "legal",
  label: "Legal Document"
}, {
  value: "hr",
  label: "HR Document"
}, {
  value: "marketing",
  label: "Marketing Material"
}, {
  value: "other",
  label: "Other"
}];
interface TeamMember {
  id: string;
  full_name: string;
}
interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: FileList, options: {
    fileCategory: string;
    isRestricted: boolean;
    requiresSignature: boolean;
    assignedUsers: string[];
    folderId: string | null;
  }) => Promise<void>;
  onCreateFolder?: (name: string) => Promise<{
    id: string;
    name: string;
  } | null>;
  teamMembers: TeamMember[];
  folders: {
    id: string;
    name: string;
  }[];
  currentFolderId: string | null;
  initialFiles?: FileList | null;
  onClearInitialFiles?: () => void;
}
export function FileUploadDialog({
  open,
  onOpenChange,
  onUpload,
  onCreateFolder,
  teamMembers,
  folders,
  currentFolderId,
  initialFiles,
  onClearInitialFiles
}: FileUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [fileCategory, setFileCategory] = useState("general");
  const [isRestricted, setIsRestricted] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(currentFolderId);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Set initial files when dialog opens with pre-selected files
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0) {
      setSelectedFiles(initialFiles);
    }
  }, [open, initialFiles]);

  // Update folder when currentFolderId changes
  useEffect(() => {
    if (open) {
      setFolderId(currentFolderId);
    }
  }, [open, currentFolderId]);
  const resetForm = () => {
    setSelectedFiles(null);
    setFileCategory("general");
    setIsRestricted(false);
    setAssignedUsers([]);
    setFolderId(currentFolderId);
    setShowNewFolderInput(false);
    setNewFolderName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const handleClose = () => {
    resetForm();
    onClearInitialFiles?.();
    onOpenChange(false);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    }
  };
  const handleUpload = async () => {
    if (!selectedFiles) return;
    setIsUploading(true);
    try {
      await onUpload(selectedFiles, {
        fileCategory,
        isRestricted,
        requiresSignature: false,
        assignedUsers,
        folderId
      });
      handleClose();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };
  const toggleAssignedUser = (userId: string) => {
    setAssignedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !onCreateFolder) return;
    setIsCreatingFolder(true);
    try {
      const newFolder = await onCreateFolder(newFolderName.trim());
      if (newFolder) {
        setFolderId(newFolder.id);
        setShowNewFolderInput(false);
        setNewFolderName("");
      }
    } catch (error) {
      console.error("Failed to create folder:", error);
    } finally {
      setIsCreatingFolder(false);
    }
  };
  return <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-teal" />
            Upload Files
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* File Selection */}
          <div className="space-y-2">
            <Label>Select Files</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-brand-teal/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
              {selectedFiles ? <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedFiles.length} file(s) selected</p>
                  <div className="flex flex-wrap gap-1 justify-center max-h-20 overflow-y-auto">
                    {Array.from(selectedFiles).map((file, idx) => <Badge key={idx} variant="secondary" className="text-xs">
                        {file.name}
                      </Badge>)}
                  </div>
                </div> : <p className="text-sm text-muted-foreground">
                  Click to select files or drag and drop
                </p>}
            </div>
          </div>

          {/* Folder Selection */}
          <div className="space-y-2">
            <Label>Destination Folder</Label>
            <div className="flex gap-2">
              <Select value={folderId || "root"} onValueChange={value => setFolderId(value === "root" ? null : value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">My Files (No folder)</SelectItem>
                  {folders.map(folder => <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {onCreateFolder && <Button type="button" variant="outline" size="icon" onClick={() => setShowNewFolderInput(!showNewFolderInput)} title="Create new folder">
                  <FolderPlus className="h-4 w-4" />
                </Button>}
            </div>
            
            {/* New Folder Input */}
            {showNewFolderInput && onCreateFolder && <div className="flex gap-2 pt-2">
                <Input placeholder="New folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateFolder();
              }
            }} />
                <Button type="button" size="sm" onClick={handleCreateFolder} disabled={!newFolderName.trim() || isCreatingFolder} className="bg-brand-teal hover:bg-brand-teal/90">
                  {isCreatingFolder ? "Creating..." : "Create"}
                </Button>
              </div>}
          </div>

          {/* File Category */}
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={fileCategory} onValueChange={setFileCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {FILE_CATEGORIES.map(cat => <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Access Restriction */}
          

          {/* Assign Users - Only show when NOT restricted */}
          {!isRestricted && <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">Assign To (for review)</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Assign this document to team members for review.
              </p>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {teamMembers.length > 0 ? teamMembers.map(member => <label key={member.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                      <Checkbox checked={assignedUsers.includes(member.id)} onCheckedChange={() => toggleAssignedUser(member.id)} />
                      <span>{member.full_name}</span>
                    </label>) : <p className="text-xs text-muted-foreground">No team members available</p>}
              </div>
              {assignedUsers.length > 0 && <div className="flex flex-wrap gap-1 pt-1">
                  {assignedUsers.map(userId => {
              const member = teamMembers.find(m => m.id === userId);
              return <Badge key={userId} variant="secondary" className="text-xs gap-1">
                        {member?.full_name}
                        <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => toggleAssignedUser(userId)} />
                      </Badge>;
            })}
                </div>}
            </div>}

        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFiles || isUploading} className="bg-brand-teal hover:bg-brand-teal/90">
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}