import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { CRMCase } from "@/hooks/useCases";
import { useCustomers } from "@/hooks/useCustomers";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface CaseProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: CRMCase | null;
  onSave: (caseData: Partial<CRMCase> & { id: string }) => Promise<void>;
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

export function CaseProfileSheet({
  open,
  onOpenChange,
  caseData,
  onSave,
}: CaseProfileSheetProps) {
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (caseData) {
      setFormData({
        subject: caseData.subject || "",
        status: caseData.status || "new",
        priority: caseData.priority || "medium",
        type: caseData.type || "",
        case_origin: caseData.case_origin || "",
        product_name: caseData.product_name || "",
        email: caseData.email || "",
        phone: caseData.phone || "",
        reported_by: caseData.reported_by || "",
        customer_id: caseData.customer_id || "",
        assigned_to: caseData.assigned_to || "",
        description: caseData.description || "",
      });
    }
  }, [caseData]);

  const handleSave = async () => {
    if (!caseData) return;

    setIsSaving(true);
    try {
      await onSave({
        id: caseData.id,
        subject: formData.subject,
        status: formData.status,
        priority: formData.priority,
        type: formData.type || null,
        case_origin: formData.case_origin || null,
        product_name: formData.product_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        reported_by: formData.reported_by || null,
        customer_id: formData.customer_id || null,
        assigned_to: formData.assigned_to || null,
        description: formData.description || null,
      });
      toast.success("Case updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update case");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center justify-between">
            <span>Case Details</span>
            {caseData && (
              <span className="text-sm font-normal text-muted-foreground">
                {caseData.case_number}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
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
              <Label htmlFor="status">Status</Label>
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
              <Label htmlFor="priority">Priority</Label>
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
              <Label htmlFor="type">Type</Label>
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
              <Label htmlFor="case_origin">Case Origin</Label>
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
            <Label htmlFor="customer_id">Related Contact</Label>
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

          {/* Case Owner / Assigned To */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">Case Owner</Label>
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
            <Label htmlFor="product_name">Product Name</Label>
            <Input
              id="product_name"
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
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
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
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
            <Label htmlFor="reported_by">Reported By</Label>
            <Input
              id="reported_by"
              value={formData.reported_by}
              onChange={(e) =>
                setFormData({ ...formData, reported_by: e.target.value })
              }
              placeholder="Reporter name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Case details and notes"
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formData.subject.trim()}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
