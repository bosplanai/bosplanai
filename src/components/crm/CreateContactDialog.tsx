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

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (contact: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    company_name: string;
    address: string;
    enquiry_source: string;
    additional_info: string;
    notes: string;
    status: string;
  }) => Promise<void>;
}

const enquirySources = [
  "Website",
  "Referral",
  "Social Media",
  "Email Campaign",
  "Phone Inquiry",
  "Walk-in",
  "Event",
  "Other",
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "closed", label: "Closed" },
];

export function CreateContactDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateContactDialogProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    company_name: "",
    address: "",
    enquiry_source: "",
    additional_info: "",
    notes: "",
    status: "active",
  });
  const [isCreating, setIsCreating] = useState(false);

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      mobile: "",
      company_name: "",
      address: "",
      enquiry_source: "",
      additional_info: "",
      notes: "",
      status: "active",
    });
  };

  const handleCreate = async () => {
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!formData.first_name.trim() && !formData.last_name.trim()) {
      toast.error("At least first or last name is required");
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(formData);
      toast.success("Contact created successfully");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to create contact");
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
          <DialogTitle>Create New Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create_first_name">First Name *</Label>
              <Input
                id="create_first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_last_name">Last Name</Label>
              <Input
                id="create_last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_email">Email *</Label>
            <Input
              id="create_email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_mobile">Mobile</Label>
            <Input
              id="create_mobile"
              value={formData.mobile}
              onChange={(e) =>
                setFormData({ ...formData, mobile: e.target.value })
              }
              placeholder="+44 123 456 7890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_company_name">Company</Label>
            <Input
              id="create_company_name"
              value={formData.company_name}
              onChange={(e) =>
                setFormData({ ...formData, company_name: e.target.value })
              }
              placeholder="Company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_address">Address</Label>
            <Textarea
              id="create_address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="Full address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="create_enquiry_source">Enquiry Source</Label>
              <Select
                value={formData.enquiry_source}
                onValueChange={(value) =>
                  setFormData({ ...formData, enquiry_source: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {enquirySources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_additional_info">Additional Information</Label>
            <Textarea
              id="create_additional_info"
              value={formData.additional_info}
              onChange={(e) =>
                setFormData({ ...formData, additional_info: e.target.value })
              }
              placeholder="Any additional information"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create_notes">Notes</Label>
            <Textarea
              id="create_notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Internal notes"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex-1 bg-brand-teal hover:bg-brand-teal/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {isCreating ? "Creating..." : "Create Contact"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
