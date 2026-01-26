import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkingHours {
  user_id: string;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  saturday_hours: number;
  sunday_hours: number;
}

interface WorkingHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: { id: string; full_name: string } | null;
  currentHours?: WorkingHours;
  onSave: (userId: string, hours: Partial<WorkingHours>) => Promise<void>;
}

const DAYS = [
  { key: "monday_hours", label: "Monday" },
  { key: "tuesday_hours", label: "Tuesday" },
  { key: "wednesday_hours", label: "Wednesday" },
  { key: "thursday_hours", label: "Thursday" },
  { key: "friday_hours", label: "Friday" },
  { key: "saturday_hours", label: "Saturday" },
  { key: "sunday_hours", label: "Sunday" },
] as const;

export function WorkingHoursDialog({
  open,
  onOpenChange,
  member,
  currentHours,
  onSave,
}: WorkingHoursDialogProps) {
  const [hours, setHours] = useState<Record<string, number>>({
    monday_hours: 8,
    tuesday_hours: 8,
    wednesday_hours: 8,
    thursday_hours: 8,
    friday_hours: 8,
    saturday_hours: 0,
    sunday_hours: 0,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentHours) {
      setHours({
        monday_hours: Number(currentHours.monday_hours),
        tuesday_hours: Number(currentHours.tuesday_hours),
        wednesday_hours: Number(currentHours.wednesday_hours),
        thursday_hours: Number(currentHours.thursday_hours),
        friday_hours: Number(currentHours.friday_hours),
        saturday_hours: Number(currentHours.saturday_hours),
        sunday_hours: Number(currentHours.sunday_hours),
      });
    } else {
      setHours({
        monday_hours: 8,
        tuesday_hours: 8,
        wednesday_hours: 8,
        thursday_hours: 8,
        friday_hours: 8,
        saturday_hours: 0,
        sunday_hours: 0,
      });
    }
  }, [currentHours, open]);

  const totalHours = Object.values(hours).reduce((sum, h) => sum + h, 0);

  const handleSave = async () => {
    if (!member) return;
    
    setSaving(true);
    try {
      await onSave(member.id, hours);
      toast({
        title: "Working hours updated",
        description: `${member.full_name}'s schedule has been saved.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save working hours.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSetStandard = () => {
    setHours({
      monday_hours: 8,
      tuesday_hours: 8,
      wednesday_hours: 8,
      thursday_hours: 8,
      friday_hours: 8,
      saturday_hours: 0,
      sunday_hours: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-teal" />
            Set Working Hours
          </DialogTitle>
          <DialogDescription>
            {member ? `Configure weekly working hours for ${member.full_name}` : "Configure working hours"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            {DAYS.map(day => (
              <div key={day.key} className="flex items-center justify-between gap-4">
                <Label className="w-24 text-sm">{day.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={hours[day.key]}
                    onChange={(e) => setHours(prev => ({
                      ...prev,
                      [day.key]: Math.max(0, Math.min(24, parseFloat(e.target.value) || 0)),
                    }))}
                    className="w-20 text-center"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="text-sm">
              <span className="text-muted-foreground">Total: </span>
              <span className="font-semibold">{totalHours} hours/week</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSetStandard}>
              Reset to Standard
            </Button>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Hours"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
