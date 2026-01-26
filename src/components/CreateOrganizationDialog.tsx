import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserOrganizations } from "@/contexts/UserOrganizationsContext";
import { useOrganization } from "@/hooks/useOrganization";
import { Loader2, Building2 } from "lucide-react";
import { z } from "zod";

const orgNameSchema = z.string().min(2, "Organisation name must be at least 2 characters").max(100);

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const employeeSizeOptions = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501+", label: "501+ employees" },
];

const CreateOrganizationDialog = ({ open, onOpenChange }: CreateOrganizationDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetch: refetchOrgs, setActiveOrganization } = useUserOrganizations();
  const { refetch: refetchCurrentOrg } = useOrganization();
  
  const [orgName, setOrgName] = useState("");
  const [employeeSize, setEmployeeSize] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setOrgName("");
    setEmployeeSize("");
    setJobRole("");
    setPhoneNumber("");
    setErrors({});
  };

  const handleCreate = async () => {
    if (!user) return;

    setErrors({});
    const newErrors: Record<string, string> = {};

    // Validate fields
    const nameResult = orgNameSchema.safeParse(orgName);
    if (!nameResult.success) {
      newErrors.orgName = nameResult.error.errors[0].message;
    }

    if (!employeeSize) {
      newErrors.employeeSize = "Please select employee size";
    }

    if (!jobRole.trim()) {
      newErrors.jobRole = "Job role is required";
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsCreating(true);
    try {
      const { data: newOrgId, error } = await supabase.rpc("create_additional_organization", {
        _org_name: orgName.trim(),
        _employee_size: employeeSize,
        _job_role: jobRole.trim(),
        _phone_number: phoneNumber.trim(),
      });

      if (error) throw error;

      // First refetch the org list so the new org is available
      await refetchOrgs();
      
      // Then switch to the new organization
      await setActiveOrganization(newOrgId);
      
      // Refetch current org context to load the new org's data
      await refetchCurrentOrg();

      toast({
        title: "Organisation created",
        description: `${orgName} has been created successfully. Switched to new workspace.`,
      });
      
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to create organisation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Create New Organisation
          </DialogTitle>
          <DialogDescription>
            Create a new workspace with its own tasks, projects, team, and settings.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organisation Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="My Company"
              className={errors.orgName ? "border-destructive" : ""}
            />
            {errors.orgName && (
              <p className="text-sm text-destructive">{errors.orgName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeeSize">Company Size</Label>
            <Select value={employeeSize} onValueChange={setEmployeeSize}>
              <SelectTrigger className={errors.employeeSize ? "border-destructive" : ""}>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {employeeSizeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeSize && (
              <p className="text-sm text-destructive">{errors.employeeSize}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobRole">Your Job Role</Label>
            <Input
              id="jobRole"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              placeholder="CEO, Manager, Developer..."
              className={errors.jobRole ? "border-destructive" : ""}
            />
            {errors.jobRole && (
              <p className="text-sm text-destructive">{errors.jobRole}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 234 567 8900"
              className={errors.phoneNumber ? "border-destructive" : ""}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-destructive">{errors.phoneNumber}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Organisation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrganizationDialog;
