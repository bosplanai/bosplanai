// @ts-nocheck
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, User, FolderOpen, Calendar, AlertCircle, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "member" | "viewer";

interface OrgTeamMember {
  user_id: string;
  full_name: string;
  job_role: string;
  role: AppRole;
}

interface DeclinedTaskReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
  onSuccess?: () => void;
}

interface TaskDetails {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  category: string;
  decline_reason: string | null;
  organization_id: string;
  project?: { id: string; title: string } | null;
  created_at: string;
}

const priorityConfig = {
  high: { label: "High", className: "bg-priority-high/10 text-priority-high border-priority-high/30" },
  medium: { label: "Medium", className: "bg-priority-medium/10 text-priority-medium border-priority-medium/30" },
  low: { label: "Low", className: "bg-priority-low/10 text-priority-low border-priority-low/30" },
};

export const DeclinedTaskReassignDialog = ({
  open,
  onOpenChange,
  taskId,
  onSuccess,
}: DeclinedTaskReassignDialogProps) => {
  const [task, setTask] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [orgMembers, setOrgMembers] = useState<OrgTeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // IMPORTANT: Available assignees must be from the task's organization, not the currently-selected org.
  // Otherwise reassignment can fail due to org membership constraints.
  const availableAssignees = (() => {
    const list = orgMembers.filter((m) => m.user_id !== user?.id);

    // Match DB rules: non-admins cannot assign tasks to admins.
    if (currentUserRole !== "admin") {
      return list.filter((m) => m.role !== "admin");
    }

    return list;
  })();

  useEffect(() => {
    if (open && taskId) {
      fetchTaskDetails();
    } else {
      setTask(null);
      setSelectedAssignee("");
      setOrgMembers([]);
      setCurrentUserRole(null);
    }
  }, [open, taskId]);

  useEffect(() => {
    if (!open || !task?.organization_id || !user?.id) return;
    fetchOrgMembers(task.organization_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.organization_id, user?.id]);

  const fetchOrgMembers = async (orgId: string) => {
    setMembersLoading(true);
    try {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", orgId);

      if (rolesError) throw rolesError;

      const userIds = (roles || []).map((r) => r.user_id);
      if (userIds.length === 0) {
        setOrgMembers([]);
        setCurrentUserRole(null);
        return;
      }

      const myRole = roles?.find((r) => r.user_id === user?.id);
      setCurrentUserRole((myRole?.role as AppRole) || null);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, job_role")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const members: OrgTeamMember[] = (roles || [])
        .map((r) => {
          const p = profiles?.find((x) => x.id === r.user_id);
          if (!p) return null;
          return {
            user_id: p.id,
            full_name: p.full_name,
            job_role: p.job_role,
            role: r.role as AppRole,
          };
        })
        .filter((m): m is OrgTeamMember => m !== null);

      setOrgMembers(members);
    } catch (error) {
      console.error("Error fetching organization members:", error);
      setOrgMembers([]);
      setCurrentUserRole(null);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchTaskDetails = async () => {
    if (!taskId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          priority,
          due_date,
          category,
          decline_reason,
          organization_id,
          created_at
        `)
        .eq("id", taskId)
        .single();

      if (error) throw error;

      setTask(data as TaskDetails);
    } catch (error: any) {
      // Silently handle missing table/relationship errors
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error fetching task details:", error);
        toast({
          title: "Error",
          description: "Failed to load task details",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async () => {
    if (!task || !selectedAssignee || !organization) return;

    setIsReassigning(true);
    try {
      // Get the new assignee's name for notification
      const assignee = orgMembers.find((m) => m.user_id === selectedAssignee);

      // Safety: if a non-admin somehow selects an admin, fail fast with a clear message.
      if (currentUserRole !== "admin" && assignee?.role === "admin") {
        toast({
          title: "Not allowed",
          description: "Only admins can assign tasks to admins.",
          variant: "destructive",
        });
        return;
      }

      // Update the task with new assignment
      const { error: updateError } = await supabase
        .from("tasks")
        .update({
          assigned_user_id: selectedAssignee,
          assignment_status: selectedAssignee === user?.id ? "accepted" : "pending",
          decline_reason: null,
        })
        .eq("id", task.id);

      if (updateError) throw updateError;

      // Create notification for new assignee
      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: selectedAssignee,
        // Use the task's org (not the currently active org)
        organization_id: task.organization_id,
        type: "task_assigned",
        title: "New Task Request",
        message: `You have been assigned a task: "${task.title}"`,
        reference_id: task.id,
        reference_type: "task",
      });

      if (notificationError) throw notificationError;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task-requests"] });

      toast({
        title: "Task reassigned",
        description: `Task has been sent to ${assignee?.full_name || "the selected team member"}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error reassigning task:", error);
      const message =
        (error as any)?.message ||
        (error as any)?.details ||
        "Failed to reassign task";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsReassigning(false);
    }
  };

  const priorityInfo = task ? priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.medium : priorityConfig.medium;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Task Declined - Reassign
          </DialogTitle>
          <DialogDescription>
            Review the declined task details and reassign to another team member.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading task details...
          </div>
        ) : task ? (
          <div className="space-y-5 mt-2">
            {/* Task Title & Priority */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground text-lg">{task.title}</h3>
                <Badge variant="outline" className={cn("text-xs", priorityInfo.className)}>
                  {priorityInfo.label} Priority
                </Badge>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">
                  {task.description}
                </p>
              </div>
            )}

            {/* Decline Reason */}
            {task.decline_reason && (
              <div className="space-y-1.5">
                <Label className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Decline Reason
                </Label>
                <p className="text-sm text-foreground bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  {task.decline_reason}
                </p>
              </div>
            )}

            {/* Task Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {task.project && (
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="h-4 w-4" />
                  <span>{task.project.title}</span>
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {format(new Date(task.due_date), "MMM d, yyyy")}</span>
                </div>
              )}
            </div>

            {/* Reassignment Section */}
            <div className="border-t pt-4 space-y-3">
              <Label htmlFor="assignee">Reassign to</Label>
              <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {membersLoading ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Loading team members...
                    </div>
                  ) : availableAssignees.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No available team members
                    </div>
                  ) : (
                    availableAssignees.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {member.full_name}
                          {member.job_role && (
                            <span className="text-muted-foreground text-xs">
                              ({member.job_role})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReassign}
                disabled={!selectedAssignee || isReassigning}
                className="gap-2"
              >
                {isReassigning ? (
                  "Reassigning..."
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Reassign Task
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Task not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeclinedTaskReassignDialog;

