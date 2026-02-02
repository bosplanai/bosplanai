import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

interface TaskReassignmentReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskTitle: string;
  newAssigneeName: string;
  onConfirm: (reason: string) => void;
}

export function TaskReassignmentReasonDialog({
  open,
  onOpenChange,
  taskTitle,
  newAssigneeName,
  onConfirm,
}: TaskReassignmentReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    
    setSaving(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-brand-teal" />
            Reassignment Reason
          </DialogTitle>
          <DialogDescription>
            Please provide a reason for reassigning "{taskTitle}" to {newAssigneeName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label htmlFor="reassignment-reason" className="text-sm font-medium">
            Reason for reassignment <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reassignment-reason"
            placeholder="Enter your reason for reassigning this task..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 min-h-[100px]"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            This reason will be visible to the task creator and the new assignee.
          </p>
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={saving || !reason.trim()}
          >
            {saving ? "Reassigning..." : "Confirm Reassignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
