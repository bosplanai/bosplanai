import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import bosplanLogo from "@/assets/bosplan-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserOrganizations } from "@/contexts/UserOrganizationsContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, UserPlus, MoreHorizontal, Mail, Shield, User, Eye, Trash2, Clock, Loader2, X, RefreshCw, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, KeyRound, Building2, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import BetaFooter from "@/components/BetaFooter";
import { z } from "zod";
type AppRole = "admin" | "member" | "viewer";
const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be less than 72 characters");
const roleConfig: Record<AppRole, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  admin: {
    label: "Full Access",
    icon: <Shield className="w-3 h-3" />,
    color: "bg-primary/10 text-primary border-primary/20"
  },
  member: {
    label: "Manager",
    icon: <User className="w-3 h-3" />,
    color: "bg-secondary text-secondary-foreground border-border"
  },
  viewer: {
    label: "Team",
    icon: <Eye className="w-3 h-3" />,
    color: "bg-muted text-muted-foreground border-border"
  }
};
const TeamMembers = () => {
  const { navigate } = useOrgNavigation();
  const {
    organization
  } = useOrganization();
  const {
    organizations
  } = useUserOrganizations();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    members,
    invites,
    isAdmin,
    loading,
    sendInvite,
    sendBatchInvite,
    cancelInvite,
    resendInvite,
    updateMemberRole,
    updateMemberProfile,
    removeMember,
    removeInvitedUser,
    createMember,
    bulkCreateMembers,
    resendPasswordReset,
    setMemberPassword,
    addToOrganization
  } = useTeamMembers();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteOrgRoles, setInviteOrgRoles] = useState<Record<string, AppRole>>({});
  const [isSending, setIsSending] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingPasswordId, setResendingPasswordId] = useState<string | null>(null);
  const [removingInviteId, setRemovingInviteId] = useState<string | null>(null);
  const [addingToOrgId, setAddingToOrgId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviteNameError, setInviteNameError] = useState<string | null>(null);

  // Get organizations where user is admin (can invite to)
  const adminOrgs = organizations.filter(org => org.role === "admin");

  // Create member form state
  const [createEmail, setCreateEmail] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createJobRole, setCreateJobRole] = useState("");
  const [createPhoneNumber, setCreatePhoneNumber] = useState("");
  const [createRole, setCreateRole] = useState<AppRole>("member");
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Bulk import state
  interface ParsedMember {
    email: string;
    fullName: string;
    jobRole: string;
    role: AppRole;
    valid: boolean;
    error?: string;
  }
  const [parsedMembers, setParsedMembers] = useState<ParsedMember[]>([]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResults, setBulkResults] = useState<{
    email: string;
    success: boolean;
    error?: string;
  }[] | null>(null);

  // Set password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordMember, setPasswordMember] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  // Edit profile dialog state
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{
    id: string;
    full_name: string;
    job_role: string;
  } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editProfileErrors, setEditProfileErrors] = useState<Record<string, string>>({});
  
  // Get selected org IDs from the roles map
  const getSelectedOrgIds = () => {
    const selectedIds = Object.keys(inviteOrgRoles);
    if (selectedIds.length > 0) return selectedIds;
    if (adminOrgs.length === 1) return [adminOrgs[0].id];
    if (organization) return [organization.id];
    return [];
  };

  const toggleOrgSelection = (orgId: string) => {
    setInviteOrgRoles(prev => {
      if (prev[orgId]) {
        // Remove the org
        const { [orgId]: _, ...rest } = prev;
        return rest;
      } else {
        // Add the org with default role
        return { ...prev, [orgId]: "member" };
      }
    });
  };

  const setOrgRole = (orgId: string, role: AppRole) => {
    setInviteOrgRoles(prev => ({
      ...prev,
      [orgId]: role
    }));
  };

  const handleInvite = async () => {
    setEmailError(null);
    setInviteNameError(null);

    // Validate name
    if (!inviteFirstName.trim() || !inviteLastName.trim()) {
      setInviteNameError("First and last name are required");
      return;
    }

    // Validate email
    const result = emailSchema.safeParse(inviteEmail);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return;
    }

    // Get selected org IDs
    const selectedOrgIds = getSelectedOrgIds();
    
    if (selectedOrgIds.length === 0) {
      setEmailError("Please select at least one organisation");
      return;
    }
    
    const fullName = `${inviteFirstName.trim()} ${inviteLastName.trim()}`;
    setIsSending(true);
    
    try {
      // Build organizations array for batch invite (sends single email)
      // Each org gets its own role from inviteOrgRoles map
      const organizations = selectedOrgIds
        .map(orgId => {
          const targetOrg = adminOrgs.find(o => o.id === orgId);
          if (!targetOrg) return null;
          // Get role for this specific org, fallback to member
          const orgRole = inviteOrgRoles[orgId] || "member";
          return {
            orgId: targetOrg.id,
            orgName: targetOrg.name,
            role: orgRole
          };
        })
        .filter((o): o is { orgId: string; orgName: string; role: AppRole } => o !== null);

      // Use batch invite for multi-org (single email per spec)
      const data = await sendBatchInvite(inviteEmail, fullName, organizations);
      
      // Check results
      const results = data?.results || [];
      const successCount = results.filter((r: any) => r.status !== "error" && r.status !== "already_member").length;
      const alreadyMemberCount = results.filter((r: any) => r.status === "already_member").length;
      const errorResults = results.filter((r: any) => r.status === "error");
      
      if (successCount > 0) {
        const orgNames = results
          .filter((r: any) => r.status !== "error" && r.status !== "already_member")
          .map((r: any) => r.orgName)
          .join(", ");
        
        const addedDirectly = data?.userAddedDirectly;
        toast({
          title: addedDirectly ? "User added" : "Invitation sent",
          description: addedDirectly 
            ? `${fullName} has been added to: ${orgNames}` 
            : `Invite sent to ${fullName} (${inviteEmail}) for: ${orgNames}`
        });
      }
      
      if (alreadyMemberCount > 0) {
        const orgNames = results
          .filter((r: any) => r.status === "already_member")
          .map((r: any) => r.orgName)
          .join(", ");
        toast({
          title: "Already a member",
          description: `${inviteEmail} is already a member of: ${orgNames}`,
          variant: "default"
        });
      }
      
      if (errorResults.length > 0) {
        toast({
          title: "Some invitations failed",
          description: errorResults.map((r: any) => r.orgName).join(", "),
          variant: "destructive"
        });
      }
      
      if (successCount > 0) {
        setInviteDialogOpen(false);
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
        setInviteOrgRoles({});
      }
    } catch (error: any) {
      toast({
        title: "Failed to send invite",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };
  const handleCreateMember = async () => {
    setCreateErrors({});

    // Validate all fields
    const errors: Record<string, string> = {};
    const emailResult = emailSchema.safeParse(createEmail);
    if (!emailResult.success) {
      errors.email = emailResult.error.errors[0].message;
    }
    if (!createFullName.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!createJobRole.trim()) {
      errors.jobRole = "Job role is required";
    }
    if (!createPhoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    }
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }
    setIsCreating(true);
    try {
      await createMember(createEmail, createFullName.trim(), createJobRole.trim(), createPhoneNumber.trim(), createRole);
      toast({
        title: "Team member created",
        description: `${createFullName} has been added and login credentials sent to ${createEmail}`
      });
      setCreateDialogOpen(false);
      setCreateEmail("");
      setCreateFullName("");
      setCreateJobRole("");
      setCreatePhoneNumber("");
      setCreateRole("member");
    } catch (error: any) {
      toast({
        title: "Failed to create member",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  const downloadCsvTemplate = () => {
    const headers = "email,fullName,jobRole,role";
    const exampleRow = "john@example.com,John Doe,Software Engineer,member";
    const content = `${headers}\n${exampleRow}`;
    const blob = new Blob([content], {
      type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "team_members_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const parseCSV = (content: string): ParsedMember[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const emailIdx = headers.indexOf("email");
    const nameIdx = headers.indexOf("fullname");
    const jobIdx = headers.indexOf("jobrole");
    const roleIdx = headers.indexOf("role");
    if (emailIdx === -1 || nameIdx === -1 || jobIdx === -1) {
      setBulkError("CSV must have columns: email, fullName, jobRole, role");
      return [];
    }
    const validRoles: AppRole[] = ["admin", "member", "viewer"];
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      const email = values[emailIdx] || "";
      const fullName = values[nameIdx] || "";
      const jobRole = values[jobIdx] || "";
      const roleValue = (values[roleIdx] || "member").toLowerCase() as AppRole;
      const role = validRoles.includes(roleValue) ? roleValue : "member";
      let valid = true;
      let error = "";
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        valid = false;
        error = "Invalid email";
      } else if (!fullName) {
        valid = false;
        error = "Missing name";
      } else if (!jobRole) {
        valid = false;
        error = "Missing job role";
      }
      return {
        email,
        fullName,
        jobRole,
        role,
        valid,
        error
      };
    }).filter(m => m.email || m.fullName);
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError(null);
    setBulkResults(null);
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setParsedMembers(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const handleBulkCreate = async () => {
    const validMembers = parsedMembers.filter(m => m.valid);
    if (validMembers.length === 0) {
      setBulkError("No valid members to import");
      return;
    }
    setIsBulkCreating(true);
    setBulkResults(null);
    try {
      const result = await bulkCreateMembers(validMembers.map(m => ({
        email: m.email,
        fullName: m.fullName,
        jobRole: m.jobRole,
        role: m.role
      })));
      setBulkResults(result.results);
      toast({
        title: "Bulk import complete",
        description: `${result.successful} of ${result.total} members created successfully`
      });
      if (result.successful === result.total) {
        setTimeout(() => {
          setBulkDialogOpen(false);
          setParsedMembers([]);
          setBulkResults(null);
        }, 2000);
      }
    } catch (error: any) {
      toast({
        title: "Bulk import failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsBulkCreating(false);
    }
  };
  const handleCancelInvite = async (inviteId: string, email: string) => {
    try {
      await cancelInvite(inviteId);
      toast({
        title: "Invitation cancelled",
        description: `Invite to ${email} has been cancelled`
      });
    } catch (error: any) {
      toast({
        title: "Failed to cancel invite",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleRemoveInvitedUser = async (inviteId: string, email: string, status: string, removeFromAllOrgs = false) => {
    const isAccepted = status === "accepted";
    const message = removeFromAllOrgs
      ? `Are you sure you want to remove ${email} from ALL your organisations? They will lose access immediately.`
      : isAccepted 
        ? `Are you sure you want to remove ${email} from this organisation? They will lose access immediately.`
        : `Are you sure you want to cancel the invitation to ${email}?`;
    
    if (!confirm(message)) return;
    
    setRemovingInviteId(inviteId);
    try {
      await removeInvitedUser(inviteId, email, status, removeFromAllOrgs);
      toast({
        title: removeFromAllOrgs 
          ? "User removed from all organisations" 
          : isAccepted 
            ? "User removed" 
            : "Invitation cancelled",
        description: removeFromAllOrgs
          ? `${email} has been removed from all your organisations`
          : isAccepted 
            ? `${email} has been removed from the organisation`
            : `Invite to ${email} has been cancelled`
      });
    } catch (error: any) {
      toast({
        title: isAccepted ? "Failed to remove user" : "Failed to cancel invite",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRemovingInviteId(null);
    }
  };
  const handleResendInvite = async (inviteId: string, email: string) => {
    setResendingId(inviteId);
    try {
      await resendInvite(inviteId);
      toast({
        title: "Invitation resent",
        description: `A new invitation has been sent to ${email}`
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend invite",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResendingId(null);
    }
  };
  
  const handleAddToOrganization = async (email: string, role: AppRole, targetOrgId: string, targetOrgName: string) => {
    setAddingToOrgId(targetOrgId);
    try {
      await addToOrganization(email, role, targetOrgId, targetOrgName);
      toast({
        title: "User added to organisation",
        description: `${email} has been added to ${targetOrgName}`
      });
    } catch (error: any) {
      toast({
        title: "Failed to add user",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAddingToOrgId(null);
    }
  };
  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      await updateMemberRole(userId, newRole);
      toast({
        title: "Role updated",
        description: "Team member role has been updated"
      });
    } catch (error: any) {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the organisation?`)) {
      return;
    }
    try {
      await removeMember(userId);
      toast({
        title: "Member removed",
        description: `${name} has been removed from the organisation`
      });
    } catch (error: any) {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleResendPasswordReset = async (userId: string, fullName: string) => {
    setResendingPasswordId(userId);
    try {
      await resendPasswordReset(userId, fullName);
      toast({
        title: "Password reset email sent",
        description: `A password setup link has been sent to ${fullName}`
      });
    } catch (error: any) {
      toast({
        title: "Failed to send password reset",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResendingPasswordId(null);
    }
  };
  const openPasswordDialog = (memberId: string, memberName: string) => {
    setPasswordMember({
      id: memberId,
      name: memberName
    });
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setPasswordDialogOpen(true);
  };

  const openEditProfileDialog = (member: { user_id: string; full_name: string; job_role: string }) => {
    setEditingMember({
      id: member.user_id,
      full_name: member.full_name,
      job_role: member.job_role
    });
    setEditProfileErrors({});
    setEditProfileDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!editingMember) return;
    
    const errors: Record<string, string> = {};
    if (!editingMember.full_name.trim()) {
      errors.full_name = "Name is required";
    }
    if (!editingMember.job_role.trim()) {
      errors.job_role = "Job role is required";
    }
    if (Object.keys(errors).length > 0) {
      setEditProfileErrors(errors);
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateMemberProfile(editingMember.id, {
        full_name: editingMember.full_name.trim(),
        job_role: editingMember.job_role.trim()
      });
      toast({
        title: "Profile updated",
        description: "Team member profile has been updated"
      });
      setEditProfileDialogOpen(false);
      setEditingMember(null);
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  const handleSetPassword = async () => {
    setPasswordErrors({});
    const errors: Record<string, string> = {};

    // Validate password
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      errors.password = passwordResult.error.errors[0].message;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      errors.confirm = "Passwords do not match";
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    if (!passwordMember) return;
    setIsSettingPassword(true);
    try {
      await setMemberPassword(passwordMember.id, newPassword);
      toast({
        title: "Password updated",
        description: `Password has been set for ${passwordMember.name}`
      });
      setPasswordDialogOpen(false);
      setPasswordMember(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Failed to set password",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSettingPassword(false);
    }
  };
  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>;
  }
  return <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1">
        <div className="max-w-4xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <div className="flex items-center gap-5 mb-6">
            
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">Team Members</h1>
              <p className="text-muted-foreground dark:text-white/70 mt-1.5">
                Manage your organisation's team members and invitations
              </p>
            </div>
            {isAdmin && <div className="flex items-center gap-2">
                {/* Bulk Import Dialog */}
                <Dialog open={bulkDialogOpen} onOpenChange={open => {
              setBulkDialogOpen(open);
              if (!open) {
                setParsedMembers([]);
                setBulkError(null);
                setBulkResults(null);
              }
            }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Upload className="w-4 h-4" />
                      Bulk Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Bulk Import Team Members</DialogTitle>
                      <DialogDescription>
                        Upload a CSV file to add multiple team members at once. Login credentials will be sent to each member via email.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Download Template */}
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">Download Template</p>
                            <p className="text-xs text-muted-foreground">Get the CSV template with correct headers</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadCsvTemplate} className="gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </div>

                      {/* File Upload */}
                      <div className="space-y-2">
                        <Label htmlFor="csvFile">Upload CSV File</Label>
                        <Input id="csvFile" type="file" accept=".csv" onChange={handleFileUpload} disabled={isBulkCreating} />
                        <p className="text-xs text-muted-foreground">
                          Required columns: email, fullName, jobRole, phoneNumber, role (admin/member/viewer)
                        </p>
                      </div>

                      {bulkError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                          {bulkError}
                        </div>}

                      {/* Preview Table */}
                      {parsedMembers.length > 0 && <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm">
                              Preview ({parsedMembers.filter(m => m.valid).length} valid of {parsedMembers.length})
                            </h3>
                            {bulkResults && <Badge variant="outline" className="gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                {bulkResults.filter(r => r.success).length} created
                              </Badge>}
                          </div>
                          <div className="border border-border rounded-lg overflow-hidden">
                            <div className="max-h-60 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-medium">Status</th>
                                    <th className="px-3 py-2 text-left font-medium">Email</th>
                                    <th className="px-3 py-2 text-left font-medium">Name</th>
                                    <th className="px-3 py-2 text-left font-medium">Role</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {parsedMembers.map((member, idx) => {
                              const result = bulkResults?.find(r => r.email === member.email);
                              return <tr key={idx} className={!member.valid ? "bg-destructive/5" : ""}>
                                        <td className="px-3 py-2">
                                          {result ? result.success ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-destructive" /> : member.valid ? <CheckCircle2 className="w-4 h-4 text-muted-foreground" /> : <XCircle className="w-4 h-4 text-destructive" />}
                                        </td>
                                        <td className="px-3 py-2">
                                          <span className={!member.valid ? "text-destructive" : ""}>
                                            {member.email || "-"}
                                          </span>
                                          {(member.error || result?.error) && <p className="text-xs text-destructive">
                                              {result?.error || member.error}
                                            </p>}
                                        </td>
                                        <td className="px-3 py-2">{member.fullName || "-"}</td>
                                        <td className="px-3 py-2">
                                          <Badge variant="outline" className="text-xs capitalize">
                                            {member.role}
                                          </Badge>
                                        </td>
                                      </tr>;
                            })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={isBulkCreating}>
                        Cancel
                      </Button>
                      <Button onClick={handleBulkCreate} disabled={isBulkCreating || parsedMembers.filter(m => m.valid).length === 0}>
                        {isBulkCreating ? <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </> : <>
                            <Upload className="w-4 h-4 mr-2" />
                            Import {parsedMembers.filter(m => m.valid).length} Members
                          </>}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Invite Member Dialog */}
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 dark:text-black">
                      <Mail className="w-4 h-4" />
                      Invite Member
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation email to add someone to your organisation
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Organization selector with per-org role - show checkboxes for multi-select */}
                      {adminOrgs.length > 0 && <div className="space-y-3">
                          <Label>Organisation{adminOrgs.length > 1 ? 's' : ''}</Label>
                          <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-border p-3">
                            {adminOrgs.map(org => {
                              const isSelected = getSelectedOrgIds().includes(org.id);
                              const currentRole = inviteOrgRoles[org.id] || "member";
                              return (
                                <div 
                                  key={org.id} 
                                  className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                    isSelected ? "bg-primary/10" : "hover:bg-muted"
                                  }`}
                                >
                                  <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                    <input 
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleOrgSelection(org.id)}
                                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0"
                                    />
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                                      <span className="text-sm font-medium truncate">{org.name}</span>
                                    </div>
                                  </label>
                                  {isSelected && (
                                    <Select 
                                      value={currentRole} 
                                      onValueChange={(v) => setOrgRole(org.id, v as AppRole)}
                                    >
                                      <SelectTrigger className="w-auto min-w-[100px] h-8 text-xs shrink-0">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">
                                          <div className="flex items-center gap-2">
                                            <Shield className="w-3 h-3" />
                                            <span>Full Access</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="member">
                                          <div className="flex items-center gap-2">
                                            <User className="w-3 h-3" />
                                            <span>Manager</span>
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="viewer">
                                          <div className="flex items-center gap-2">
                                            <Eye className="w-3 h-3" />
                                            <span>Team</span>
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {adminOrgs.length > 1 
                              ? "Select one or more organisations and choose an access level for each." 
                              : "The user will be invited to this organisation."
                            }
                          </p>
                        </div>}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="inviteFirstName">First Name</Label>
                          <Input 
                            id="inviteFirstName" 
                            type="text" 
                            placeholder="John" 
                            value={inviteFirstName} 
                            onChange={e => {
                              setInviteFirstName(e.target.value);
                              setInviteNameError(null);
                            }} 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="inviteLastName">Last Name</Label>
                          <Input 
                            id="inviteLastName" 
                            type="text" 
                            placeholder="Doe" 
                            value={inviteLastName} 
                            onChange={e => {
                              setInviteLastName(e.target.value);
                              setInviteNameError(null);
                            }} 
                          />
                        </div>
                      </div>
                      {inviteNameError && <p className="text-sm text-destructive">{inviteNameError}</p>}
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" placeholder="colleague@example.com" value={inviteEmail} onChange={e => {
                      setInviteEmail(e.target.value);
                      setEmailError(null);
                    }} />
                        {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleInvite} disabled={isSending}>
                        {isSending ? <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </> : <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Invite
                          </>}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Profile Dialog */}
                <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Team Member</DialogTitle>
                      <DialogDescription>
                        Update team member's name and job role
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="editFullName">Full Name</Label>
                        <Input
                          id="editFullName"
                          value={editingMember?.full_name || ""}
                          onChange={(e) => setEditingMember(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                        />
                        {editProfileErrors.full_name && (
                          <p className="text-sm text-destructive">{editProfileErrors.full_name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="editJobRole">Job Role</Label>
                        <Input
                          id="editJobRole"
                          value={editingMember?.job_role || ""}
                          onChange={(e) => setEditingMember(prev => prev ? { ...prev, job_role: e.target.value } : null)}
                        />
                        {editProfileErrors.job_role && (
                          <p className="text-sm text-destructive">{editProfileErrors.job_role}</p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditProfileDialogOpen(false)} disabled={isUpdatingProfile}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
                        {isUpdatingProfile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>}
          </div>
        </div>

        {/* Team Members List */}
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">
              Members ({members.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {members.map(member => {
            const isCurrentUser = member.user_id === user?.id;
            const config = roleConfig[member.role];
            return <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.full_name}</span>
                        {isCurrentUser && <Badge variant="outline" className="text-xs">
                            You
                          </Badge>}
                      </div>
                      {member.email && (
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {member.job_role} • <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`gap-1 ${config.color}`}>
                      {config.icon}
                      {config.label}
                    </Badge>
                    {isAdmin && !isCurrentUser && (() => {
                      // Use the member's email from the hook (fetched via edge function)
                      const memberEmail = member.email;
                      
                      // Get all orgs this member is already in
                      const emailLower = memberEmail?.toLowerCase();
                      const existingOrgIds = emailLower 
                        ? invites
                            .filter(i => i.email.toLowerCase() === emailLower)
                            .map(i => i.organization_id)
                        : [];
                      
                      // Include current org in existing list
                      if (organization?.id && !existingOrgIds.includes(organization.id)) {
                        existingOrgIds.push(organization.id);
                      }
                      
                      // Other orgs this member can be added to
                      const otherOrgsForMember = memberEmail 
                        ? adminOrgs.filter(org => !existingOrgIds.includes(org.id))
                        : [];
                      
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "admin")} disabled={member.role === "admin"}>
                              <Shield className="w-4 h-4 mr-2" />
                              Full Access
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "member")} disabled={member.role === "member"}>
                              <User className="w-4 h-4 mr-2" />
                              Manager
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "viewer")} disabled={member.role === "viewer"}>
                              <Eye className="w-4 h-4 mr-2" />
                              Team
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditProfileDialog(member)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {/* Add to other organizations */}
                            {memberEmail && otherOrgsForMember.length > 0 && (
                              <>
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                  Add to Organisation
                                </div>
                                {otherOrgsForMember.map(org => (
                                  <DropdownMenuItem
                                    key={org.id}
                                    onClick={() => handleAddToOrganization(memberEmail, member.role, org.id, org.name)}
                                    disabled={addingToOrgId === org.id}
                                  >
                                    {addingToOrgId === org.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Building2 className="w-4 h-4 mr-2" />
                                    )}
                                    {org.name}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleResendPasswordReset(member.user_id, member.full_name)} disabled={resendingPasswordId === member.user_id}>
                              {resendingPasswordId === member.user_id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                              Resend Password Setup
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordDialog(member.user_id, member.full_name)}>
                              <KeyRound className="w-4 h-4 mr-2" />
                              Set Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleRemoveMember(member.user_id, member.full_name)} className="text-destructive focus:text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove from Organisation
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </div>
                </div>;
          })}
          </div>
        </div>

        {/* Invitations List - Always visible */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">
              Invitations ({(() => {
                // Group by email and count unique users
                const uniqueEmails = new Set(invites.map(i => i.email.toLowerCase()));
                return uniqueEmails.size;
              })()})
            </h2>
          </div>
          {invites.length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No pending or recent invitations</p>
              {isAdmin && (
                <p className="text-xs mt-1">Use the "Invite Member" button above to add team members</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {(() => {
                // Group invites by email
                const groupedInvites = invites.reduce((acc, invite) => {
                  const email = invite.email.toLowerCase();
                  if (!acc[email]) {
                    acc[email] = [];
                  }
                  acc[email].push(invite);
                  return acc;
                }, {} as Record<string, typeof invites>);

                return Object.entries(groupedInvites).map(([email, userInvites]) => {
                  // Determine overall status - if any is accepted, show accepted
                  const hasAccepted = userInvites.some(i => i.status === "accepted");
                  const allExpired = userInvites.every(i => {
                    const expiresAt = new Date(i.expires_at);
                    return i.status === "pending" && expiresAt < new Date();
                  });
                  const hasPending = userInvites.some(i => {
                    const expiresAt = new Date(i.expires_at);
                    return i.status === "pending" && expiresAt >= new Date();
                  });

                  // Get the most recent invite for display purposes
                  const latestInvite = userInvites.sort((a, b) => 
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )[0];
                  const createdAt = new Date(latestInvite.created_at);

                  // Get organizations this user is part of
                  const userOrgs = userInvites.map(i => ({
                    id: i.organization_id,
                    name: i.organization_name || "Unknown",
                    inviteId: i.id,
                    status: i.status,
                    role: i.role,
                    expires_at: i.expires_at,
                  }));

                  // Get orgs user is NOT yet part of
                  const userOrgIds = userOrgs.map(o => o.id);
                  const otherOrgs = adminOrgs.filter(org => !userOrgIds.includes(org.id));

                  // Determine the primary role (use the highest role)
                  const roleOrder: Record<AppRole, number> = { admin: 3, member: 2, viewer: 1 };
                  const primaryRole = userInvites.reduce((highest, invite) => 
                    roleOrder[invite.role] > roleOrder[highest] ? invite.role : highest
                  , userInvites[0].role);
                  const config = roleConfig[primaryRole];

                  return (
                    <div key={email} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className={hasAccepted ? "bg-primary/10 text-primary" : allExpired ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}>
                            {hasAccepted ? <CheckCircle2 className="w-4 h-4" /> : allExpired ? <XCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <span className="font-medium">{email}</span>
                          {/* Organization badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {userOrgs.map((org, idx) => {
                              const orgExpiresAt = new Date(org.expires_at);
                              const isOrgExpired = org.status === "pending" && orgExpiresAt < new Date();
                              const isOrgAccepted = org.status === "accepted";
                              
                              return (
                                <Badge 
                                  key={org.inviteId} 
                                  variant="outline" 
                                  className={`text-xs gap-1 ${
                                    isOrgAccepted 
                                      ? "bg-primary/5 text-primary/80 border-primary/20" 
                                      : isOrgExpired 
                                        ? "bg-destructive/5 text-destructive/80 border-destructive/20" 
                                        : "bg-muted text-muted-foreground border-border"
                                  }`}
                                >
                                  <Building2 className="w-3 h-3" />
                                  {org.name}
                                  {isOrgAccepted && <CheckCircle2 className="w-3 h-3" />}
                                  {isOrgExpired && <XCircle className="w-3 h-3" />}
                                </Badge>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {hasAccepted ? (
                              <span className="text-primary flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Accepted
                              </span>
                            ) : allExpired ? (
                              <span className="text-destructive flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                All invites expired
                              </span>
                            ) : hasPending ? (
                              <span className="text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            ) : null}
                            <span className="text-muted-foreground/60">•</span>
                            <span>Sent {createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={`gap-1 ${
                            hasAccepted 
                              ? "bg-primary/10 text-primary border-primary/20" 
                              : allExpired 
                                ? "bg-destructive/10 text-destructive border-destructive/20" 
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {hasAccepted ? <CheckCircle2 className="w-3 h-3" /> : allExpired ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {hasAccepted ? "Accepted" : allExpired ? "Expired" : "Pending"}
                        </Badge>
                        <Badge variant="outline" className={`gap-1 ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </Badge>
                        {/* Show prominent resend button for expired invites */}
                        {isAdmin && allExpired && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleResendInvite(latestInvite.id, email)}
                            disabled={resendingId === latestInvite.id}
                            className="gap-1"
                          >
                            {resendingId === latestInvite.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            Resend
                          </Button>
                        )}
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={removingInviteId !== null || addingToOrgId !== null}>
                                {userInvites.some(i => removingInviteId === i.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-72">
                              {/* Resend options for pending/expired invites */}
                              {!hasAccepted && userOrgs.length > 0 && (
                                <>
                                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                    Resend Invitation
                                  </div>
                                  {userOrgs.map(org => {
                                    const orgExpiresAt = new Date(org.expires_at);
                                    const isOrgExpired = org.status === "pending" && orgExpiresAt < new Date();
                                    return (
                                      <DropdownMenuItem 
                                        key={org.inviteId}
                                        onClick={() => handleResendInvite(org.inviteId, email)} 
                                        disabled={resendingId === org.inviteId}
                                      >
                                        {resendingId === org.inviteId ? (
                                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                          <RefreshCw className="w-4 h-4 mr-2" />
                                        )}
                                        {org.name}
                                        {isOrgExpired && <span className="ml-auto text-xs text-destructive">(Expired)</span>}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              
                              {/* Add to other organizations */}
                              {hasAccepted && otherOrgs.length > 0 && (
                                <>
                                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                    Add to Organisation
                                  </div>
                                  {otherOrgs.map(org => (
                                    <DropdownMenuItem
                                      key={org.id}
                                      onClick={() => handleAddToOrganization(email, primaryRole, org.id, org.name)}
                                      disabled={addingToOrgId === org.id}
                                    >
                                      {addingToOrgId === org.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      ) : (
                                        <Building2 className="w-4 h-4 mr-2" />
                                      )}
                                      {org.name}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              
                              {/* Remove from specific organizations */}
                              {userOrgs.length > 1 && (
                                <>
                                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                                    Remove from Organisation
                                  </div>
                                  {userOrgs.map(org => (
                                    <DropdownMenuItem
                                      key={org.inviteId}
                                      onClick={() => handleRemoveInvitedUser(org.inviteId, email, org.status, false)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      {org.name}
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              
                              {/* Single org removal or remove all */}
                              {userOrgs.length === 1 ? (
                                <DropdownMenuItem 
                                  onClick={() => handleRemoveInvitedUser(userOrgs[0].inviteId, email, userOrgs[0].status, false)} 
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {hasAccepted ? "Remove User" : "Cancel Invitation"}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  onClick={() => handleRemoveInvitedUser(userOrgs[0].inviteId, email, userOrgs[0].status, true)} 
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove from ALL Organisations
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Set Password Dialog */}
        <Dialog open={passwordDialogOpen} onOpenChange={open => {
                  setPasswordDialogOpen(open);
                  if (!open) {
                    setPasswordMember(null);
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordErrors({});
                  }
                }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Password</DialogTitle>
              <DialogDescription>
                Set a new password for {passwordMember?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" placeholder="Enter new password" value={newPassword} onChange={e => {
                          setNewPassword(e.target.value);
                          setPasswordErrors(prev => ({
                            ...prev,
                            password: ""
                          }));
                        }} />
                {passwordErrors.password && <p className="text-sm text-destructive">{passwordErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => {
                          setConfirmPassword(e.target.value);
                          setPasswordErrors(prev => ({
                            ...prev,
                            confirm: ""
                          }));
                        }} />
                {passwordErrors.confirm && <p className="text-sm text-destructive">{passwordErrors.confirm}</p>}
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>At least 8 characters</li>
                  <li>Maximum 72 characters</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetPassword} disabled={isSettingPassword}>
                {isSettingPassword ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting...
                  </> : <>
                    <KeyRound className="w-4 h-4 mr-2" />
                    Set Password
                  </>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <BetaFooter />
    </div>;
};
export default TeamMembers;