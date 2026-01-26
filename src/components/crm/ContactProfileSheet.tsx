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

export interface CRMContact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  mobile: string | null;
  phone: string | null;
  company_name: string;
  address: string | null;
  enquiry_source: string | null;
  additional_info: string | null;
  notes: string | null;
  status: string | null;
}

interface ContactProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: CRMContact | null;
  onSave: (contact: Partial<CRMContact> & { id: string }) => Promise<void>;
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

export function ContactProfileSheet({
  open,
  onOpenChange,
  contact,
  onSave,
}: ContactProfileSheetProps) {
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        email: contact.email || "",
        mobile: contact.mobile || contact.phone || "",
        company_name: contact.company_name || "",
        address: contact.address || "",
        enquiry_source: contact.enquiry_source || "",
        additional_info: contact.additional_info || "",
        notes: contact.notes || "",
        status: contact.status || "active",
      });
    }
  }, [contact]);

  const handleSave = async () => {
    if (!contact) return;

    setIsSaving(true);
    try {
      await onSave({
        id: contact.id,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email,
        mobile: formData.mobile || null,
        company_name: formData.company_name,
        address: formData.address || null,
        enquiry_source: formData.enquiry_source || null,
        additional_info: formData.additional_info || null,
        notes: formData.notes || null,
        status: formData.status || "active",
      });
      toast.success("Contact updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update contact");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center justify-between">
            <span>Contact Profile</span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) =>
                  setFormData({ ...formData, first_name: e.target.value })
                }
                placeholder="First name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) =>
                  setFormData({ ...formData, last_name: e.target.value })
                }
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile</Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) =>
                setFormData({ ...formData, mobile: e.target.value })
              }
              placeholder="+44 123 456 7890"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Company</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) =>
                setFormData({ ...formData, company_name: e.target.value })
              }
              placeholder="Company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
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
              <Label htmlFor="enquiry_source">Enquiry Source</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="additional_info">Additional Information</Label>
            <Textarea
              id="additional_info"
              value={formData.additional_info}
              onChange={(e) =>
                setFormData({ ...formData, additional_info: e.target.value })
              }
              placeholder="Any additional information"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Internal notes"
              rows={3}
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
              disabled={isSaving}
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
