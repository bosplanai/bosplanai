import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, User, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  full_name: string;
  job_role: string;
  estimatedWorkload: number;
}

interface TaskReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: { id: string; title: string; assigned_user_id: string | null } | null;
  teamMembers: TeamMember[];
  onReassign: (taskId: string, newUserId: string | null) => Promise<void>;
}

export function TaskReassignDialog({
  open,
  onOpenChange,
  task,
  teamMembers,
  onReassign,
}: TaskReassignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Sort by workload (least busy first) for smart suggestions
  const sortedMembers = [...teamMembers].sort((a, b) => a.estimatedWorkload - b.estimatedWorkload);
  const suggestedMember = sortedMembers[0];

  const handleReassign = async () => {
    if (!task || selectedUserId === undefined) return;
    
    setSaving(true);
    try {
      await onReassign(task.id, selectedUserId);
      const assigneeName = teamMembers.find(m => m.id === selectedUserId)?.full_name;
      
      if (selectedUserId) {
        // Reassigning to someone - task enters pending approval state
        toast({
          title: "Task sent for approval",
          description: `This task has been sent to ${assigneeName}. They must accept it before it's added to their dashboard.`,
        });
      } else {
        toast({
          title: "Task unassigned",
          description: "Task is now unassigned",
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reassign task.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getWorkloadColor = (workload: number) => {
    if (workload <= 50) return "text-brand-green";
    if (workload <= 80) return "text-brand-orange";
    return "text-destructive";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-brand-teal" />
            Reassign Task
          </DialogTitle>
          <DialogDescription>
            {task?.title ? `Choose a new assignee for "${task.title}"` : "Choose a new assignee"}
          </DialogDescription>
        </DialogHeader>
        
        {suggestedMember && suggestedMember.id !== task?.assigned_user_id && (
          <div className="bg-brand-green/10 border border-brand-green/30 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-brand-green flex items-center gap-2">
              <User className="w-4 h-4" />
              Suggested: {suggestedMember.full_name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Currently at {suggestedMember.estimatedWorkload}% capacity - lowest workload
            </p>
          </div>
        )}
        
        <div className="py-4">
          <RadioGroup
            value={selectedUserId ?? "unassigned"}
            onValueChange={(value) => setSelectedUserId(value === "unassigned" ? null : value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="unassigned" id="unassigned" />
              <Label htmlFor="unassigned" className="flex-1 cursor-pointer">
                <span className="text-muted-foreground">Unassigned</span>
              </Label>
            </div>
            
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                  member.id === task?.assigned_user_id
                    ? "border-brand-teal bg-brand-teal/5"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value={member.id} id={member.id} />
                <Label htmlFor={member.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {member.full_name}
                        {member.id === task?.assigned_user_id && (
                          <span className="text-xs text-muted-foreground ml-2">(current)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.job_role}</p>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-sm font-medium", getWorkloadColor(member.estimatedWorkload))}>
                        {member.estimatedWorkload}%
                      </span>
                      {member.estimatedWorkload > 100 && (
                        <AlertTriangle className="w-3.5 h-3.5 text-destructive inline ml-1" />
                      )}
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReassign} disabled={saving}>
            {saving ? "Reassigning..." : "Reassign Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
