import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface CreateActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (activityData: {
    subject: string;
    status: string;
    priority: string;
    type: string;
    due_date: string;
    customer_id: string;
    assigned_to: string;
    description: string;
  }) => Promise<void>;
}

const statusOptions = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "waiting", label: "Waiting" },
  { value: "deferred", label: "Deferred" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

const typeOptions = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
  { value: "follow_up", label: "Follow Up" },
  { value: "other", label: "Other" },
];

export function CreateActivityDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateActivityDialogProps) {
  const { customers } = useCustomers();
  const { members } = useTeamMembers();
  
  const [formData, setFormData] = useState({
    subject: "",
    status: "not_started",
    priority: "normal",
    type: "",
    due_date: "",
    customer_id: "",
    assigned_to: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setFormData({
      subject: "",
      status: "not_started",
      priority: "normal",
      type: "",
      due_date: "",
      customer_id: "",
      assigned_to: "",
      description: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(formData);
      toast.success("Activity created successfully");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create activity");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Activity</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="create_subject">Subject *</Label>
            <Input
              id="create_subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Activity subject"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="create_status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="create_priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="create_type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="create_due_date">Due Date</Label>
              <Input
                id="create_due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          </div>

          {/* Related Contact */}
          <div className="space-y-2">
            <Label htmlFor="create_customer_id">Related To</Label>
            <Select
              value={formData.customer_id || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, customer_id: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name} ({customer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="create_assigned_to">Assigned To</Label>
            <Select
              value={formData.assigned_to || "none"}
              onValueChange={(value) =>
                setFormData({ ...formData, assigned_to: value === "none" ? "" : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign to team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.user_id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="create_description">Description</Label>
            <Textarea
              id="create_description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Activity details and notes"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !formData.subject.trim()}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isCreating ? "Creating..." : "Create Activity"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
