import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useUserOrganizations, UserOrganization } from "@/contexts/UserOrganizationsContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, LogOut, Crown, Users, Eye, Check, Loader2, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateOrganizationDialog from "@/components/CreateOrganizationDialog";
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
const OrganizationMemberships = () => {
  const { navigate } = useOrgNavigation();
  const {
    organizations,
    loading,
    refetch,
    setActiveOrganization,
    activeOrgId
  } = useUserOrganizations();
  const {
    organization: currentOrg,
    refetch: refetchOrg
  } = useOrganization();
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<UserOrganization | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if user is admin in any org (can create new orgs)
  const canCreateOrg = organizations.some(o => o.role === "admin");
  const handleSwitchOrg = async (org: UserOrganization) => {
    if (org.id === currentOrg?.id) return;
    await setActiveOrganization(org.id);
    await refetchOrg();
    toast({
      title: "Switched organisation",
      description: `Now viewing ${org.name}`
    });
  };
  const handleLeaveOrg = async (org: UserOrganization) => {
    if (!user) return;

    // Prevent leaving if user is the only admin
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
      // Delete user role for this organization
      const {
        error: roleError
      } = await supabase.from("user_roles").delete().eq("user_id", user.id).eq("organization_id", org.id);
      if (roleError) throw roleError;
      toast({
        title: "Left organisation",
        description: `You have left ${org.name}`
      });
      await refetch();

      // If user left current org, switch to another org or redirect to welcome
      if (org.id === currentOrg?.id) {
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
      const {
        error
      } = await supabase.from("organizations").update({
        name: newOrgName.trim()
      }).eq("id", selectedOrg.id);
      if (error) throw error;
      toast({
        title: "Organisation renamed",
        description: `Organisation renamed to "${newOrgName.trim()}"`
      });
      await refetch();
      if (selectedOrg.id === currentOrg?.id) {
        await refetchOrg();
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
      const {
        error
      } = await supabase.from("organizations").delete().eq("id", selectedOrg.id);
      if (error) throw error;
      toast({
        title: "Organisation deleted",
        description: `${selectedOrg.name} has been deleted`
      });
      await refetch();

      // If deleted current org, switch to another or redirect
      if (selectedOrg.id === currentOrg?.id) {
        const remainingOrgs = organizations.filter(o => o.id !== selectedOrg.id);
        if (remainingOrgs.length > 0) {
          await setActiveOrganization(remainingOrgs[0].id);
          await refetchOrg();
        } else {
          navigate("/welcome");
        }
      }
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to delete organisation",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2 mb-6 rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Organisations</h1>
              <p className="text-muted-foreground mt-1.5">View and manage your organisations or departments.</p>
            </div>
            {canCreateOrg && <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 rounded-xl transition-all duration-200 btn-smooth">
                <Plus className="w-4 h-4" />
                New Organisation
              </Button>}
          </div>
        </div>

        <div className="space-y-4">
          {organizations.length === 0 ? <div className="bg-card border border-border/40 rounded-2xl p-10 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                <Building2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No Organisations</h3>
              <p className="text-sm text-muted-foreground mb-5">
                You are not a member of any organisations yet.
              </p>
              <Button onClick={() => navigate("/welcome")} className="rounded-xl btn-smooth">
                Create or Join an Organisation
              </Button>
            </div> : organizations.map(org => {
          const RoleIcon = roleIcons[org.role];
          const isCurrentOrg = org.id === currentOrg?.id;
          const isLeaving = leavingOrgId === org.id;
          const isAdmin = org.role === "admin";
          return <div key={org.id} className={cn("bg-card border rounded-2xl p-5 transition-all duration-300 ease-out hover:shadow-md", isCurrentOrg ? "border-primary/40 ring-1 ring-primary/15 shadow-sm" : "border-border/40 hover:border-border/60")}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Avatar className="w-14 h-14 shrink-0 rounded-xl">
                        <AvatarImage src={org.logo_url || undefined} alt={org.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg rounded-xl">
                          {org.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">
                            {org.name}
                          </h3>
                          {isCurrentOrg && <Badge variant="default" className="bg-primary/10 text-primary border-0 rounded-full">
                              Current
                            </Badge>}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="secondary" className={cn("capitalize gap-1 rounded-full", org.role === "admin" && "bg-amber-500/10 text-amber-600", org.role === "member" && "bg-blue-500/10 text-blue-600", org.role === "viewer" && "bg-muted text-muted-foreground")}>
                            <RoleIcon className="w-3 h-3" />
                            {roleLabels[org.role]}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isCurrentOrg && <Button variant="outline" size="sm" onClick={() => handleSwitchOrg(org)} className="gap-1.5 rounded-xl border-border/60 hover:bg-secondary/80 transition-all duration-200 btn-smooth">
                          <Check className="w-3.5 h-3.5" />
                          Switch
                        </Button>}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl hover:bg-secondary/80 transition-all duration-200">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-border/60 shadow-lg">
                          {isAdmin && <>
                              <DropdownMenuItem onClick={() => openRenameDialog(org)} className="rounded-lg">
                                <Pencil className="w-4 h-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openDeleteDialog(org)} className="text-destructive focus:text-destructive rounded-lg">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>}
                          {!isAdmin && <DropdownMenuItem onClick={() => handleLeaveOrg(org)} disabled={isLeaving} className="text-destructive focus:text-destructive rounded-lg">
                              {isLeaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                              Leave Organisation
                            </DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>;
        })}
        </div>

        {organizations.length > 0 && <div className="mt-8 p-5 bg-muted/30 rounded-2xl border border-border/30">
            <p className="text-sm text-muted-foreground">Tip: You can quickly switch between organisations or departments using the organisation switcher in the header. <strong className="text-foreground">Tip:</strong> You can quickly switch between organisations using the 
              organisation switcher in the header, or use this page to manage your memberships.
            </p>
          </div>}
      </div>

      <CreateOrganizationDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Organisation</DialogTitle>
            <DialogDescription>
              Enter a new name for {selectedOrg?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">Organisation Name</Label>
              <Input id="newName" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="Enter new name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !newOrgName.trim()}>
              {isRenaming ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Renaming...
                </> : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedOrg?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organisation 
              and all associated data including tasks, projects, team members, and files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </> : "Delete Organisation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default OrganizationMemberships;