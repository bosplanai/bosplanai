import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, HardDrive, Computer } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { usePolicies, PolicyTag, Policy } from "@/hooks/usePolicies";
import { useToast } from "@/hooks/use-toast";
import AttachmentPreview from "@/components/AttachmentPreview";
interface DriveFile {
  id: string;
  name: string;
  file_size?: number;
  mime_type?: string | null;
  file_path?: string;
}

interface PolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: Policy | null;
  driveFiles?: DriveFile[];
  onSelectFile?: () => void;
  onUploadFile?: (file: File) => Promise<{ id: string; name: string; file_size?: number; mime_type?: string; url?: string } | null>;
  getFileUrl?: (filePath: string) => Promise<string | null>;
}

export const PolicyDialog = ({
  open,
  onOpenChange,
  policy,
  driveFiles = [],
  onSelectFile,
  onUploadFile,
  getFileUrl,
}: PolicyDialogProps) => {
  const { tags, createPolicy, updatePolicy, isCreating, isUpdating } = usePolicies();
  const { toast } = useToast();
  const isEditing = !!policy;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size?: number;
    mimeType?: string;
    url?: string;
  } | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [title, setTitle] = useState(policy?.title || "");
  const [description, setDescription] = useState(policy?.description || "");
  const [fileId, setFileId] = useState<string | null>(policy?.file_id || null);
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(
    policy?.effective_date ? new Date(policy.effective_date) : undefined
  );
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    policy?.expiry_date ? new Date(policy.expiry_date) : undefined
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    policy?.tags?.map((t) => t.id) || []
  );
  const [status, setStatus] = useState<"active" | "draft">(
    policy?.status === "draft" ? "draft" : "active"
  );
  const [changeNotes, setChangeNotes] = useState("");

  const handleSubmit = async () => {
    if (!title.trim()) return;

    try {
      if (isEditing && policy) {
        await updatePolicy({
          id: policy.id,
          title,
          description,
          file_id: fileId || undefined,
          effective_date: effectiveDate?.toISOString().split("T")[0],
          expiry_date: expiryDate?.toISOString().split("T")[0],
          status,
          tag_ids: selectedTags,
          change_notes: changeNotes,
        });
      } else {
        await createPolicy({
          title,
          description,
          file_id: fileId || undefined,
          effective_date: effectiveDate?.toISOString().split("T")[0],
          expiry_date: expiryDate?.toISOString().split("T")[0],
          status,
          tag_ids: selectedTags,
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFileId(null);
    setEffectiveDate(undefined);
    setExpiryDate(undefined);
    setSelectedTags([]);
    setStatus("active");
    setChangeNotes("");
    setUploadedFile(null);
    setSelectedFileUrl(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;

    setIsUploading(true);
    try {
      const result = await onUploadFile(file);
      if (result) {
        setFileId(result.id);
        setUploadedFile({
          name: result.name,
          size: result.file_size,
          mimeType: result.mime_type,
          url: result.url,
        });
        setSelectedFileUrl(null);
        toast({
          title: "File uploaded",
          description: `${result.name} has been uploaded successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDriveFileSelect = async (file: DriveFile) => {
    setFileId(file.id);
    setUploadedFile(null);
    
    if (file.file_path && getFileUrl) {
      const url = await getFileUrl(file.file_path);
      setSelectedFileUrl(url);
    }
  };

  const selectedFile = driveFiles.find((f) => f.id === fileId);
  const hasFileSelected = !!(fileId || uploadedFile);

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Policy" : "Add New Policy"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Policy Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Data Protection Policy"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this policy..."
              rows={3}
            />
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <Label>Policy Document</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onSelectFile}
                  >
                    <HardDrive className="w-4 h-4 mr-2" />
                    Select from Drive
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Computer className="w-4 h-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload from Computer"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
                  />
                </div>
                
                {/* File Preview */}
                {hasFileSelected && (
                  <AttachmentPreview
                    fileName={uploadedFile?.name || selectedFile?.name || "File selected"}
                    fileUrl={uploadedFile?.url || selectedFileUrl || ""}
                    mimeType={uploadedFile?.mimeType || selectedFile?.mime_type}
                    fileSize={uploadedFile?.size || selectedFile?.file_size}
                    onRemove={() => {
                      setFileId(null);
                      setUploadedFile(null);
                      setSelectedFileUrl(null);
                    }}
                  />
                )}
              </div>
              
            {/* Dropdown for existing drive files when no file is selected */}
            {driveFiles.length > 0 && !hasFileSelected && (
              <Select 
                value={fileId || ""} 
                onValueChange={(value) => {
                  const file = driveFiles.find(f => f.id === value);
                  if (file) handleDriveFileSelect(file);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Or choose from existing files" />
                </SelectTrigger>
                <SelectContent>
                  {driveFiles.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Effective Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !effectiveDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {effectiveDate ? format(effectiveDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={effectiveDate}
                    onSelect={setEffectiveDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expiryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expiryDate}
                    onSelect={setExpiryDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                    borderColor: tag.color,
                    color: selectedTags.includes(tag.id) ? "white" : tag.color,
                  }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "draft")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Change Notes (only for editing) */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="changeNotes">Change Notes</Label>
              <Textarea
                id="changeNotes"
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isCreating || isUpdating}>
            {isCreating || isUpdating
              ? "Saving..."
              : isEditing
              ? "Save Changes"
              : "Create Policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
