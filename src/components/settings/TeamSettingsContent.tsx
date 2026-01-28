import { useState } from "react";
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
import { UserPlus, MoreHorizontal, Mail, Shield, User, Eye, Trash2, Clock, Loader2, X, RefreshCw, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, KeyRound, Building2, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";

type AppRole = "admin" | "member" | "viewer";
const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be less than 72 characters");

const roleConfig: Record<AppRole, { label: string; icon: React.ReactNode; color: string }> = {
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

const TeamSettingsContent = () => {
  const { organization } = useOrganization();
  const { organizations } = useUserOrganizations();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    members,
    invites,
    isAdmin,
    loading,
    sendInvite,
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
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("member");
  const [inviteOrgIds, setInviteOrgIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isBulkCreating, setIsBulkCreating] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendingPasswordId, setResendingPasswordId] = useState<string | null>(null);
  const [removingInviteId, setRemovingInviteId] = useState<string | null>(null);
  const [addingToOrgId, setAddingToOrgId] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [inviteNameError, setInviteNameError] = useState<string | null>(null);

  const adminOrgs = organizations.filter(org => org.role === "admin");

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
  const [bulkResults, setBulkResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordMember, setPasswordMember] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<{ id: string; full_name: string; job_role: string } | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [editProfileErrors, setEditProfileErrors] = useState<Record<string, string>>({});

  const getSelectedOrgIds = () => {
    if (inviteOrgIds.length > 0) return inviteOrgIds;
    if (adminOrgs.length === 1) return [adminOrgs[0].id];
    if (organization) return [organization.id];
    return [];
  };

  const toggleOrgSelection = (orgId: string) => {
    setInviteOrgIds(prev => prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]);
  };

  const handleInvite = async () => {
    setEmailError(null);
    setInviteNameError(null);

    if (!inviteFirstName.trim() || !inviteLastName.trim()) {
      setInviteNameError("First and last name are required");
      return;
    }

    const result = emailSchema.safeParse(inviteEmail);
    if (!result.success) {
      setEmailError(result.error.errors[0].message);
      return;
    }

    const selectedOrgIds = getSelectedOrgIds();
    if (selectedOrgIds.length === 0) {
      setEmailError("Please select at least one organisation");
      return;
    }

    const fullName = `${inviteFirstName.trim()} ${inviteLastName.trim()}`;
    setIsSending(true);

    try {
      const results: { success: boolean; orgName: string; error?: string }[] = [];
      for (const orgId of selectedOrgIds) {
        const targetOrg = adminOrgs.find(o => o.id === orgId);
        if (!targetOrg) continue;
        try {
          await sendInvite(inviteEmail, inviteRole, orgId, targetOrg.name, fullName);
          results.push({ success: true, orgName: targetOrg.name });
        } catch (error: any) {
          results.push({ success: false, orgName: targetOrg.name, error: error.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedResults = results.filter(r => !r.success);

      if (successCount > 0) {
        const orgNames = results.filter(r => r.success).map(r => r.orgName).join(", ");
        toast({
          title: successCount === selectedOrgIds.length ? "Invitations sent" : "Some invitations sent",
          description: `Invite sent to ${fullName} (${inviteEmail}) for: ${orgNames}`
        });
      }

      if (failedResults.length > 0) {
        toast({
          title: "Some invitations failed",
          description: failedResults.map(r => `${r.orgName}: ${r.error}`).join("; "),
          variant: "destructive"
        });
      }

      if (successCount > 0) {
        setInviteDialogOpen(false);
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
        setInviteRole("member");
        setInviteOrgIds([]);
      }
    } catch (error: any) {
      toast({ title: "Failed to send invite", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = "email,fullName,jobRole,role";
    const exampleRow = "john@example.com,John Doe,Software Engineer,member";
    const content = `${headers}\n${exampleRow}`;
    const blob = new Blob([content], { type: "text/csv" });
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
      return { email, fullName, jobRole, role, valid, error };
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
      toast({ title: "Bulk import failed", description: error.message, variant: "destructive" });
    } finally {
      setIsBulkCreating(false);
    }
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    try {
      await cancelInvite(inviteId);
      toast({ title: "Invitation cancelled", description: `Invite to ${email} has been cancelled` });
    } catch (error: any) {
      toast({ title: "Failed to cancel invite", description: error.message, variant: "destructive" });
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
        title: removeFromAllOrgs ? "User removed from all organisations" : isAccepted ? "User removed" : "Invitation cancelled",
        description: removeFromAllOrgs
          ? `${email} has been removed from all your organisations`
          : isAccepted ? `${email} has been removed from the organisation` : `Invite to ${email} has been cancelled`
      });
    } catch (error: any) {
      toast({ title: isAccepted ? "Failed to remove user" : "Failed to cancel invite", description: error.message, variant: "destructive" });
    } finally {
      setRemovingInviteId(null);
    }
  };

  const handleResendInvite = async (inviteId: string, email: string) => {
    setResendingId(inviteId);
    try {
      await resendInvite(inviteId);
      toast({ title: "Invitation resent", description: `A new invitation has been sent to ${email}` });
    } catch (error: any) {
      toast({ title: "Failed to resend invite", description: error.message, variant: "destructive" });
    } finally {
      setResendingId(null);
    }
  };

  const handleAddToOrganization = async (email: string, role: AppRole, targetOrgId: string, targetOrgName: string) => {
    setAddingToOrgId(targetOrgId);
    try {
      await addToOrganization(email, role, targetOrgId, targetOrgName);
      toast({ title: "User added to organisation", description: `${email} has been added to ${targetOrgName}` });
    } catch (error: any) {
      toast({ title: "Failed to add user", description: error.message, variant: "destructive" });
    } finally {
      setAddingToOrgId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    try {
      await updateMemberRole(userId, newRole);
      toast({ title: "Role updated", description: "Team member role has been updated" });
    } catch (error: any) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the organisation?`)) return;
    try {
      await removeMember(userId);
      toast({ title: "Member removed", description: `${name} has been removed from the organisation` });
    } catch (error: any) {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    }
  };

  const handleResendPasswordReset = async (userId: string, fullName: string, email: string) => {
    setResendingPasswordId(userId);
    try {
      await resendPasswordReset(userId, fullName);
      toast({ title: "Password reset sent", description: `A password reset link has been sent to ${email}` });
    } catch (error: any) {
      toast({ title: "Failed to send reset", description: error.message, variant: "destructive" });
    } finally {
      setResendingPasswordId(null);
    }
  };

  const openPasswordDialog = (userId: string, name: string) => {
    setPasswordMember({ id: userId, name });
    setNewPassword("");
    setConfirmPassword("");
    setPasswordErrors({});
    setPasswordDialogOpen(true);
  };

  const handleSetPassword = async () => {
    if (!passwordMember) return;
    setPasswordErrors({});
    const errors: Record<string, string> = {};
    const passwordResult = passwordSchema.safeParse(newPassword);
    if (!passwordResult.success) {
      errors.password = passwordResult.error.errors[0].message;
    }
    if (newPassword !== confirmPassword) {
      errors.confirm = "Passwords do not match";
    }
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setIsSettingPassword(true);
    try {
      await setMemberPassword(passwordMember.id, newPassword);
      toast({ title: "Password set", description: `Password has been set for ${passwordMember.name}` });
      setPasswordDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Failed to set password", description: error.message, variant: "destructive" });
    } finally {
      setIsSettingPassword(false);
    }
  };

  const openEditProfileDialog = (member: { id: string; full_name: string; job_role: string }) => {
    setEditingMember({ ...member });
    setEditProfileErrors({});
    setEditProfileDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (!editingMember) return;
    setEditProfileErrors({});
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
      toast({ title: "Profile updated", description: `${editingMember.full_name}'s profile has been updated` });
      setEditProfileDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const currentOrgInvites = invites.filter(i => i.organization_id === organization?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
          <p className="text-sm text-muted-foreground">Manage your organisation's team members and invitations</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Team Members</DialogTitle>
                <DialogDescription>Upload a CSV file to add multiple team members at once.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="sm" onClick={downloadCsvTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Upload CSV</span>
                    </div>
                    <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  </Label>
                </div>
                {bulkError && <p className="text-sm text-destructive">{bulkError}</p>}
                {parsedMembers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Preview ({parsedMembers.filter(m => m.valid).length} valid)</p>
                      <Progress value={(parsedMembers.filter(m => m.valid).length / parsedMembers.length) * 100} className="w-32" />
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="p-2 text-left">Email</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">Role</th>
                            <th className="p-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedMembers.map((m, i) => (
                            <tr key={i} className={m.valid ? "" : "bg-destructive/10"}>
                              <td className="p-2">{m.email}</td>
                              <td className="p-2">{m.fullName}</td>
                              <td className="p-2">{roleConfig[m.role]?.label || m.role}</td>
                              <td className="p-2">
                                {bulkResults ? (
                                  bulkResults.find(r => r.email === m.email)?.success ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <span className="text-destructive text-xs">{bulkResults.find(r => r.email === m.email)?.error}</span>
                                  )
                                ) : m.valid ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <span className="text-destructive text-xs">{m.error}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setBulkDialogOpen(false); setParsedMembers([]); setBulkResults(null); }}>Cancel</Button>
                <Button onClick={handleBulkCreate} disabled={isBulkCreating || parsedMembers.filter(m => m.valid).length === 0}>
                  {isBulkCreating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : `Import ${parsedMembers.filter(m => m.valid).length} Members`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>Send an email invitation to add someone to your organisation.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" value={inviteFirstName} onChange={(e) => { setInviteFirstName(e.target.value); setInviteNameError(null); }} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" value={inviteLastName} onChange={(e) => { setInviteLastName(e.target.value); setInviteNameError(null); }} />
                  </div>
                </div>
                {inviteNameError && <p className="text-sm text-destructive">{inviteNameError}</p>}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setEmailError(null); }} />
                  {emailError && <p className="text-sm text-destructive">{emailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v: AppRole) => setInviteRole(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="w-4 h-4" />Full Access</div></SelectItem>
                      <SelectItem value="member"><div className="flex items-center gap-2"><User className="w-4 h-4" />Manager</div></SelectItem>
                      <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="w-4 h-4" />Team</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {adminOrgs.length > 1 && (
                  <div className="space-y-2">
                    <Label>Organisations</Label>
                    <div className="space-y-2 border rounded-md p-3 max-h-32 overflow-y-auto">
                      {adminOrgs.map(org => (
                        <div key={org.id} className="flex items-center gap-2">
                          <Checkbox id={`org-${org.id}`} checked={getSelectedOrgIds().includes(org.id)} onCheckedChange={() => toggleOrgSelection(org.id)} />
                          <label htmlFor={`org-${org.id}`} className="text-sm cursor-pointer flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{org.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={isSending}>
                  {isSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Mail className="w-4 h-4 mr-2" />Send Invite</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Members ({members.length})</h3>
        <div className="space-y-3">
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(member.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{member.full_name}</p>
                    {member.user_id === user?.id && <Badge variant="outline" className="text-xs">You</Badge>}
                  </div>
                  {member.email && <p className="text-sm text-muted-foreground">{member.email}</p>}
                  <p className="text-xs text-muted-foreground">{member.job_role} • {roleConfig[member.role]?.label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${roleConfig[member.role]?.color}`}>
                  {roleConfig[member.role]?.icon}
                  <span className="ml-1">{roleConfig[member.role]?.label}</span>
                </Badge>
                {isAdmin && member.user_id !== user?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditProfileDialog(member)}><Pencil className="w-4 h-4 mr-2" />Edit Profile</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "admin")} disabled={member.role === "admin"}><Shield className="w-4 h-4 mr-2" />Set as Full Access</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "member")} disabled={member.role === "member"}><User className="w-4 h-4 mr-2" />Set as Manager</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "viewer")} disabled={member.role === "viewer"}><Eye className="w-4 h-4 mr-2" />Set as Team</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openPasswordDialog(member.user_id, member.full_name)}><KeyRound className="w-4 h-4 mr-2" />Set Password</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleResendPasswordReset(member.user_id, member.full_name, member.email)} disabled={resendingPasswordId === member.user_id}>
                        {resendingPasswordId === member.user_id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Send Password Reset
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleRemoveMember(member.user_id, member.full_name)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Remove</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invitations List */}
      {currentOrgInvites.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Invitations ({currentOrgInvites.length})</h3>
          <div className="space-y-3">
            {currentOrgInvites.map(invite => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{invite.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3 h-3" />
                      <span>{invite.organization_name}</span>
                      <Badge variant={invite.status === "accepted" ? "default" : "secondary"} className="text-xs capitalize">
                        {invite.status}
                      </Badge>
                      <span>•</span>
                      <span>Sent {new Date(invite.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${roleConfig[invite.role]?.color}`}>
                    {roleConfig[invite.role]?.icon}
                    <span className="ml-1">{roleConfig[invite.role]?.label}</span>
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {invite.status === "pending" && (
                        <DropdownMenuItem onClick={() => handleResendInvite(invite.id, invite.email)} disabled={resendingId === invite.id}>
                          {resendingId === invite.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Resend Invite
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleRemoveInvitedUser(invite.id, invite.email, invite.status)} className="text-destructive" disabled={removingInviteId === invite.id}>
                        {removingInviteId === invite.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        {invite.status === "accepted" ? "Remove User" : "Cancel Invite"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Set Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>Set a new password for {passwordMember?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" placeholder="Enter new password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordErrors(prev => ({ ...prev, password: "" })); }} />
              {passwordErrors.password && <p className="text-sm text-destructive">{passwordErrors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordErrors(prev => ({ ...prev, confirm: "" })); }} />
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
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSetPassword} disabled={isSettingPassword}>
              {isSettingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Setting...</> : <><KeyRound className="w-4 h-4 mr-2" />Set Password</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update team member details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFullName">Full Name</Label>
              <Input id="editFullName" value={editingMember?.full_name || ""} onChange={e => setEditingMember(prev => prev ? { ...prev, full_name: e.target.value } : null)} />
              {editProfileErrors.full_name && <p className="text-sm text-destructive">{editProfileErrors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editJobRole">Job Role</Label>
              <Input id="editJobRole" value={editingMember?.job_role || ""} onChange={e => setEditingMember(prev => prev ? { ...prev, job_role: e.target.value } : null)} />
              {editProfileErrors.job_role && <p className="text-sm text-destructive">{editProfileErrors.job_role}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamSettingsContent;
