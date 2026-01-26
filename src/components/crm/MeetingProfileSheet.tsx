import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomers } from "@/hooks/useCustomers";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { toast } from "sonner";
import { CRMMeeting } from "@/hooks/useMeetings";
import { format } from "date-fns";

interface MeetingProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingData: CRMMeeting | null;
  onSave: (meeting: Partial<CRMMeeting> & { id: string }) => Promise<void>;
}

const statusOptions = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rescheduled", label: "Rescheduled" },
];

export const MeetingProfileSheet = ({ open, onOpenChange, meetingData, onSave }: MeetingProfileSheetProps) => {
  const { customers } = useCustomers();
  const { members: teamMembers } = useTeamMembers();
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    meeting_venue: "",
    customer_id: "",
    assigned_to: "",
    status: "scheduled",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (meetingData) {
      setFormData({
        title: meetingData.title || "",
        description: meetingData.description || "",
        start_time: meetingData.start_time ? format(new Date(meetingData.start_time), "yyyy-MM-dd'T'HH:mm") : "",
        end_time: meetingData.end_time ? format(new Date(meetingData.end_time), "yyyy-MM-dd'T'HH:mm") : "",
        meeting_venue: meetingData.meeting_venue || "",
        customer_id: meetingData.customer_id || "",
        assigned_to: meetingData.assigned_to || "",
        status: meetingData.status || "scheduled",
      });
    }
  }, [meetingData]);

  const handleSave = async () => {
    if (!meetingData) return;
    
    setIsSaving(true);
    try {
      await onSave({
        id: meetingData.id,
        title: formData.title,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        meeting_venue: formData.meeting_venue || null,
        customer_id: formData.customer_id || null,
        assigned_to: formData.assigned_to || null,
        status: formData.status,
      });
      toast.success("Meeting updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving meeting:", error);
      toast.error("Failed to save meeting");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Meeting Details</SheetTitle>
        </SheetHeader>
        
        <div className="grid gap-4 py-4">
          {meetingData && (
            <div className="text-sm text-muted-foreground">
              Meeting #{meetingData.meeting_number}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter meeting title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start_time">From</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end_time">To</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="meeting_venue">Meeting Venue</Label>
            <Input
              id="meeting_venue"
              value={formData.meeting_venue}
              onChange={(e) => setFormData({ ...formData, meeting_venue: e.target.value })}
              placeholder="e.g., Client location, Office, Virtual"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customer_id">Related Contact</Label>
            <Select value={formData.customer_id} onValueChange={(value) => setFormData({ ...formData, customer_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a contact" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name} - {customer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="assigned_to">Assigned To</Label>
            <Select value={formData.assigned_to} onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter meeting description..."
              rows={4}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
