import { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  UserPlus,
  FolderKanban,
  Clock,
  AlertCircle,
} from "lucide-react";
import { TaskRequest } from "@/hooks/useTaskRequests";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  full_name: string;
}

interface TaskRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: TaskRequest | null;
  teamMembers: TeamMember[];
  currentUserId: string | undefined;
  onAccept: (taskId: string) => Promise<boolean>;
  onDecline: (taskId: string, reason: string) => Promise<boolean>;
  onReassign: (taskId: string, newAssigneeId: string, reason: string) => Promise<boolean>;
}

const priorityConfig = {
  high: { label: "High", className: "bg-priority-high/10 text-priority-high border-priority-high/30" },
  medium: { label: "Medium", className: "bg-priority-medium/10 text-priority-medium border-priority-medium/30" },
  low: { label: "Low", className: "bg-priority-low/10 text-priority-low border-priority-low/30" },
};

type ActionMode = "none" | "decline" | "reassign";

const TaskRequestSheet = ({
  open,
  onOpenChange,
  request,
  teamMembers,
  currentUserId,
  onAccept,
  onDecline,
  onReassign,
}: TaskRequestSheetProps) => {
  const [actionMode, setActionMode] = useState<ActionMode>("none");
  const [reason, setReason] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const resetState = () => {
    setActionMode("none");
    setReason("");
    setSelectedAssignee("");
    setIsProcessing(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const handleAccept = async () => {
    if (!request) return;
    setIsProcessing(true);
    const success = await onAccept(request.task_id);
    if (success) {
      handleOpenChange(false);
    }
    setIsProcessing(false);
  };

  const handleDecline = async () => {
    if (!request) return;
    setIsProcessing(true);
    const success = await onDecline(request.task_id, reason);
    if (success) {
      handleOpenChange(false);
    }
    setIsProcessing(false);
  };

  const handleReassign = async () => {
    if (!request || !selectedAssignee) return;
    setIsProcessing(true);
    const success = await onReassign(request.task_id, selectedAssignee, reason);
    if (success) {
      handleOpenChange(false);
    }
    setIsProcessing(false);
  };

  if (!request) return null;

  const priorityInfo = priorityConfig[request.priority] || priorityConfig.medium;
  const availableTeamMembers = teamMembers.filter((m) => m.id !== currentUserId);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <SheetTitle>Task Request</SheetTitle>
          </div>
        <SheetDescription>
          {request.assigned_by_user?.full_name || request.created_by_user?.full_name || "Someone"} has requested you to take on this task
        </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Task Details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{request.title}</h3>
              <Badge className={cn("mt-2", priorityInfo.className)} variant="outline">
                {priorityInfo.label} Priority
              </Badge>
            </div>

            {request.description && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-sm">Description</Label>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                  {request.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {request.due_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Due: {format(new Date(request.due_date), "PPP")}</span>
                </div>
              )}
              {request.project && (
                <div className="flex items-center gap-2 text-sm">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{request.project.title}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Requested {format(new Date(request.created_at), "PPp")}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {actionMode === "none" && (
            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={handleAccept}
                disabled={isProcessing}
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept Task
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActionMode("decline")}
                  disabled={isProcessing}
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setActionMode("reassign")}
                  disabled={isProcessing || availableTeamMembers.length === 0}
                >
                  <UserPlus className="h-4 w-4" />
                  Reassign
                </Button>
              </div>
            </div>
          )}

          {/* Decline Form */}
          {actionMode === "decline" && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="decline-reason">
                  Reason for declining <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="decline-reason"
                  placeholder="Please explain why you cannot take on this task..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setActionMode("none");
                    setReason("");
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={handleDecline}
                  disabled={isProcessing || !reason.trim()}
                >
                  <XCircle className="h-4 w-4" />
                  Confirm Decline
                </Button>
              </div>
            </div>
          )}

          {/* Reassign Form */}
          {actionMode === "reassign" && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>
                  Select new assignee <span className="text-destructive">*</span>
                </Label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a team member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTeamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reassign-reason">
                  Reason for reassignment <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="reassign-reason"
                  placeholder="Please explain why you're reassigning this task..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setActionMode("none");
                    setReason("");
                    setSelectedAssignee("");
                  }}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleReassign}
                  disabled={isProcessing || !reason.trim() || !selectedAssignee}
                >
                  <UserPlus className="h-4 w-4" />
                  Confirm Reassign
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskRequestSheet;
