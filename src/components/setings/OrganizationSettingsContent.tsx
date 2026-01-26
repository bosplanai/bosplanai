import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Upload, X, Crown, Users, Eye, Check, Loader2, Plus, MoreHorizontal, Pencil, Trash2, LogOut, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserOrganizations, UserOrganization } from "@/contexts/UserOrganizationsContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import CreateOrganizationDialog from "@/components/CreateOrganizationDialog";
import { format } from "date-fns";

const employeeSizeOptions = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

const roleIcons = {
  admin: Crown,
  member: Users,
  viewer: Eye
};

const roleLabels = {
  admin: "Full Access",
  member: "Member",
  viewer: "Viewer"
};

const OrganizationSettingsContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization, refetch: refetchOrg } = useOrganization();
  const { user } = useAuth();
  const {
    organizations,
    loading: orgsLoading,
    refetch: refetchOrgs,
    setActiveOrganization,
  } = useUserOrganizations();

  // Current org settings state
  const [name, setName] = useState("");
  const [employeeSize, setEmployeeSize] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainError, setSubdomainError] = useState("");
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Organizations list state
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<UserOrganization | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cancelDeletionDialogOpen, setCancelDeletionDialogOpen] = useState(false);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);

  const canCreateOrg = organizations.some(o => o.role === "admin");

  useEffect(() => {
    if (organization) {
      setName(organization.name || "");
      setEmployeeSize(organization.employee_size || "");
      setSubdomain(organization.slug || "");
      setLogoUrl(organization.logo_url);
    }
  }, [organization]);

  // Validate subdomain format
  const validateSubdomain = (value: string): string | null => {
    if (!value.trim()) {
      return "Subdomain cannot be empty";
    }
    if (value.length < 2) {
      return "Subdomain must be at least 2 characters";
    }
    if (value.length > 50) {
      return "Subdomain must be 50 characters or less";
    }
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) && !/^[a-z0-9]{2,}$/.test(value)) {
      return "Only lowercase letters, numbers, and hyphens allowed. Cannot start or end with a hyphen.";
    }
    return null;
  };

  // Check subdomain availability
  const checkSubdomainAvailability = async (value: string): Promise<boolean> => {
    if (value === organization?.slug) return true; // Same as current
    
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", value)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking subdomain:", error);
      return false;
    }
    
    return !data; // Available if no data found
  };

  const handleSubdomainChange = async (value: string) => {
    const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSubdomain(formatted);
    setSubdomainError("");

    if (formatted === organization?.slug) {
      return; // No change
    }

    const validationError = validateSubdomain(formatted);
    if (validationError) {
      setSubdomainError(validationError);
      return;
    }

    setIsCheckingSubdomain(true);
    try {
      const isAvailable = await checkSubdomainAvailability(formatted);
      if (!isAvailable) {
        setSubdomainError("This subdomain is already in use");
      }
    } finally {
      setIsCheckingSubdomain(false);
    }
  };

  // Current org handlers
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${organization.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("organization-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("organization-logos")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", organization.id);

      if (updateError) throw updateError;

      setLogoUrl(urlData.publicUrl);
      await refetchOrg();
      await refetchOrgs();
      
      toast({
        title: "Logo uploaded",
        description: "Your organisation logo has been updated",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!organization) return;

    try {
      const { error } = await supabase
        .from("organizations")
        .update({ logo_url: null })
        .eq("id", organization.id);

      if (error) throw error;

      setLogoUrl(null);
      await refetchOrg();
      await refetchOrgs();
      
      toast({
        title: "Logo removed",
        description: "Your organisation logo has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove logo",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Organisation name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Validate subdomain
    if (subdomain !== organization.slug) {
      const validationError = validateSubdomain(subdomain);
      if (validationError) {
        toast({
          title: "Error",
          description: validationError,
          variant: "destructive",
        });
        return;
      }

      const isAvailable = await checkSubdomainAvailability(subdomain);
      if (!isAvailable) {
        toast({
          title: "Error",
          description: "This subdomain is already in use",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const updateData: { name: string; employee_size: string; slug?: string } = {
        name: name.trim(),
        employee_size: employeeSize,
      };

      // Only update slug if it changed
      if (subdomain !== organization.slug) {
        updateData.slug = subdomain;
      }

      const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", organization.id);

      if (error) throw error;

      await refetchOrg();
      await refetchOrgs();
      
      // If subdomain changed, redirect to new URL
      if (subdomain !== organization.slug) {
        navigate(`/${subdomain}/settings`);
        toast({
          title: "Settings saved",
          description: "Organisation settings and subdomain have been updated",
        });
      } else {
        toast({
          title: "Settings saved",
          description: "Organisation settings have been updated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Organizations list handlers
  const handleSwitchOrg = async (org: UserOrganization) => {
    if (org.id === organization?.id) return;
    await setActiveOrganization(org.id);
    await refetchOrg();
    toast({
      title: "Switched organisation",
      description: `Now viewing ${org.name}`
    });
  };

  const handleLeaveOrg = async (org: UserOrganization) => {
    if (!user) return;

    if (org.role === "admin") {
      toast({
        title: "Cannot leave organisation",
        description: "As an admin, you must transfer ownership or delete the organisation instead.",
        variant: "destructive"
      });
      return;
    }

    setLeavingOrgId(org.id);
    try {
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("organization_id", org.id);
      
      if (roleError) throw roleError;
      
      toast({
        title: "Left organisation",
        description: `You have left ${org.name}`
      });
      await refetchOrgs();

      if (org.id === organization?.id) {
        const remainingOrgs = organizations.filter(o => o.id !== org.id);
        if (remainingOrgs.length > 0) {
          await setActiveOrganization(remainingOrgs[0].id);
          await refetchOrg();
        } else {
          navigate("/welcome");
        }
      }
    } catch (error: any) {
      toast({
        title: "Failed to leave organisation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLeavingOrgId(null);
    }
  };

  const openRenameDialog = (org: UserOrganization) => {
    setSelectedOrg(org);
    setNewOrgName(org.name);
    setRenameDialogOpen(true);
  };

  const handleRename = async () => {
    if (!selectedOrg || !newOrgName.trim()) return;
    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: newOrgName.trim() })
        .eq("id", selectedOrg.id);
      
      if (error) throw error;
      
      toast({
        title: "Organisation renamed",
        description: `Organisation renamed to "${newOrgName.trim()}"`
      });
      await refetchOrgs();
      if (selectedOrg.id === organization?.id) {
        await refetchOrg();
        setName(newOrgName.trim());
      }
      setRenameDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to rename organisation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const openDeleteDialog = (org: UserOrganization) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("schedule-organization-deletion", {
        body: { organizationId: selectedOrg.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: "Deletion scheduled",
        description: data?.message || `${selectedOrg.name} will be deleted in 30 days`,
      });
      await refetchOrgs();
      if (selectedOrg.id === organization?.id) {
        await refetchOrg();
      }
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to schedule deletion",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openCancelDeletionDialog = (org: UserOrganization) => {
    setSelectedOrg(org);
    setCancelDeletionDialogOpen(true);
  };

  const handleCancelDeletion = async () => {
    if (!selectedOrg) return;
    setIsCancellingDeletion(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("cancel-organization-deletion", {
        body: { organizationId: selectedOrg.id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast({
        title: "Deletion cancelled",
        description: data?.message || `${selectedOrg.name} is no longer scheduled for deletion`,
      });
      await refetchOrgs();
      if (selectedOrg.id === organization?.id) {
        await refetchOrg();
      }
      setCancelDeletionDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to cancel deletion",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCancellingDeletion(false);
    }
  };

  if (!organization || orgsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Organisation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Current Organisation
          </CardTitle>
          <CardDescription>
            Manage your current organisation's settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={logoUrl || undefined} alt={organization.name} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {organization.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => document.getElementById("logo-upload")?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploading ? "Uploading..." : "Upload Logo"}
                </Button>
                {logoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG up to 2MB
              </p>
            </div>
          </div>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />

          {/* Organisation Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organisation Name</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organisation name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeSize">Employee Size</Label>
              <Select value={employeeSize} onValueChange={setEmployeeSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee size" />
                </SelectTrigger>
                <SelectContent>
                  {employeeSizeOptions.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size} employees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subdomain">Subdomain</Label>
            <div className="flex items-center gap-2 max-w-sm">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="subdomain"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                placeholder="your-subdomain"
                className={cn(
                  "flex-1",
                  subdomainError && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {isCheckingSubdomain && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
              {!isCheckingSubdomain && subdomain && !subdomainError && subdomain !== organization.slug && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
            {subdomainError ? (
              <p className="text-xs text-destructive">{subdomainError}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your organisation URL will be: <span className="font-medium">{window.location.origin}/{subdomain}</span>
              </p>
            )}
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isCheckingSubdomain || !!subdomainError}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* All Organisations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Organisations</CardTitle>
              <CardDescription>
                View and manage all organisations you belong to
              </CardDescription>
            </div>
            {canCreateOrg && (
              <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2 rounded-xl">
                <Plus className="w-4 h-4" />
                New
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {organizations.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No organisations found</p>
              </div>
            ) : (
              organizations.map(org => {
                const RoleIcon = roleIcons[org.role];
                const isCurrentOrg = org.id === organization?.id;
                const isLeaving = leavingOrgId === org.id;
                const isOrgAdmin = org.role === "admin";
                const isScheduledForDeletion = !!org.scheduled_deletion_at;
                const deletionDate = org.scheduled_deletion_at ? new Date(org.scheduled_deletion_at) : null;

                return (
                  <div
                    key={org.id}
                    className={cn(
                      "border rounded-xl p-4 transition-all duration-200",
                      isScheduledForDeletion && "border-destructive/40 bg-destructive/5",
                      isCurrentOrg && !isScheduledForDeletion && "border-primary/40 bg-primary/5",
                      !isCurrentOrg && !isScheduledForDeletion && "border-border/40 hover:border-border/60"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-10 h-10 shrink-0 rounded-lg">
                          <AvatarImage src={org.logo_url || undefined} alt={org.name} />
                          <AvatarFallback className="bg-primary/10 text-primary rounded-lg">
                            {org.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-foreground truncate">{org.name}</span>
                            {isCurrentOrg && !isScheduledForDeletion && (
                              <Badge variant="default" className="bg-primary/10 text-primary border-0 rounded-full text-xs">
                                Current
                              </Badge>
                            )}
                            {isScheduledForDeletion && (
                              <Badge variant="destructive" className="gap-1 rounded-full text-xs">
                                <Clock className="w-3 h-3" />
                                Scheduled for deletion
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "gap-1 rounded-full text-xs",
                                org.role === "admin" && "bg-amber-500/10 text-amber-600",
                                org.role === "member" && "bg-blue-500/10 text-blue-600",
                                org.role === "viewer" && "bg-muted text-muted-foreground"
                              )}
                            >
                              <RoleIcon className="w-3 h-3" />
                              {roleLabels[org.role]}
                            </Badge>
                            {isScheduledForDeletion && deletionDate && (
                              <span className="text-xs text-destructive">
                                Deletes on {format(deletionDate, "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isScheduledForDeletion && isOrgAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCancelDeletionDialog(org)}
                            className="rounded-lg text-primary border-primary/50 hover:bg-primary/10"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel Deletion
                          </Button>
                        )}
                        {!isCurrentOrg && !isScheduledForDeletion && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSwitchOrg(org)}
                            className="rounded-lg"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Switch
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            {isOrgAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openRenameDialog(org)} className="rounded-lg">
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {isScheduledForDeletion ? (
                                  <DropdownMenuItem
                                    onClick={() => openCancelDeletionDialog(org)}
                                    className="text-primary focus:text-primary rounded-lg"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel Deletion
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => openDeleteDialog(org)}
                                    className="text-destructive focus:text-destructive rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Schedule Deletion
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {!isOrgAdmin && (
                              <DropdownMenuItem
                                onClick={() => handleLeaveOrg(org)}
                                disabled={isLeaving}
                                className="text-destructive focus:text-destructive rounded-lg"
                              >
                                <LogOut className="w-4 h-4 mr-2" />
                                {isLeaving ? "Leaving..." : "Leave"}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) refetchOrgs();
        }}
      />

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Rename Organisation</DialogTitle>
            <DialogDescription>
              Enter a new name for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="renameOrgName">Organisation Name</Label>
              <Input
                id="renameOrgName"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Enter organisation name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !newOrgName.trim()} className="rounded-xl">
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Schedule Organisation Deletion?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will schedule <strong>{selectedOrg?.name}</strong> for deletion in 30 days. 
                After this period, all organisation data will be permanently deleted.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-amber-800 dark:text-amber-200 text-sm">
                <strong>What will be deleted:</strong>
                <ul className="list-disc ml-5 mt-1 space-y-0.5">
                  <li>All projects and tasks</li>
                  <li>Files and documents</li>
                  <li>Team member access</li>
                  <li>Invoices and customer data</li>
                  <li>All other organisation data</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                You can cancel the deletion at any time within the 30-day period.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 rounded-xl"
            >
              {isDeleting ? "Scheduling..." : "Schedule Deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Deletion Confirmation Dialog */}
      <AlertDialog open={cancelDeletionDialogOpen} onOpenChange={setCancelDeletionDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Organisation Deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the scheduled deletion of <strong>{selectedOrg?.name}</strong>. 
              Your organisation and all its data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Keep Scheduled</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelDeletion}
              disabled={isCancellingDeletion}
              className="bg-primary hover:bg-primary/90 rounded-xl"
            >
              {isCancellingDeletion ? "Cancelling..." : "Cancel Deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrganizationSettingsContent;
