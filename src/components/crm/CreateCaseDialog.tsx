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

interface CreateCaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (caseData: {
    subject: string;
    status: string;
    priority: string;
    type: string;
    case_origin: string;
    product_name: string;
    email: string;
    phone: string;
    reported_by: string;
    customer_id: string;
    assigned_to: string;
    description: string;
  }) => Promise<void>;
}

const statusOptions = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "escalated", label: "Escalated" },
  { value: "closed", label: "Closed" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const typeOptions = [
  { value: "question", label: "Question" },
  { value: "problem", label: "Problem" },
  { value: "feature_request", label: "Feature Request" },
  { value: "complaint", label: "Complaint" },
  { value: "other", label: "Other" },
];

const originOptions = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "web", label: "Web" },
  { value: "chat", label: "Chat" },
  { value: "social_media", label: "Social Media" },
  { value: "other", label: "Other" },
];

export function CreateCaseDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateCaseDialogProps) {
  const { customers } = useCustomers();
  const { members } = useTeamMembers();
  
  const [formData, setFormData] = useState({
    subject: "",
    status: "new",
    priority: "medium",
    type: "",
    case_origin: "",
    product_name: "",
    email: "",
    phone: "",
    reported_by: "",
    customer_id: "",
    assigned_to: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setFormData({
      subject: "",
      status: "new",
      priority: "medium",
      type: "",
      case_origin: "",
      product_name: "",
      email: "",
      phone: "",
      reported_by: "",
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
      toast.success("Case created successfully");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create case");
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
          <DialogTitle>Create New Case</DialogTitle>
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
              placeholder="Case subject"
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

            {/* Case Origin */}
            <div className="space-y-2">
              <Label htmlFor="create_case_origin">Case Origin</Label>
              <Select
                value={formData.case_origin}
                onValueChange={(value) =>
                  setFormData({ ...formData, case_origin: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select origin" />
                </SelectTrigger>
                <SelectContent>
                  {originOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Related Contact */}
          <div className="space-y-2">
            <Label htmlFor="create_customer_id">Related Contact</Label>
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

          {/* Case Owner */}
          <div className="space-y-2">
            <Label htmlFor="create_assigned_to">Case Owner</Label>
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

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="create_product_name">Product Name</Label>
            <Input
              id="create_product_name"
              value={formData.product_name}
              onChange={(e) =>
                setFormData({ ...formData, product_name: e.target.value })
              }
              placeholder="Related product"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="create_email">Email</Label>
              <Input
                id="create_email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Contact email"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="create_phone">Phone</Label>
              <Input
                id="create_phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Contact phone"
              />
            </div>
          </div>

          {/* Reported By */}
          <div className="space-y-2">
            <Label htmlFor="create_reported_by">Reported By</Label>
            <Input
              id="create_reported_by"
              value={formData.reported_by}
              onChange={(e) =>
                setFormData({ ...formData, reported_by: e.target.value })
              }
              placeholder="Reporter name"
            />
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
              placeholder="Case details and notes"
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
              {isCreating ? "Creating..." : "Create Case"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
