import { useState } from "react";
import { Menu, LogOut, Settings, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useUserOrganizations, UserOrganization } from "@/contexts/UserOrganizationsContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import CreateOrganizationDialog from "./CreateOrganizationDialog";
import { Separator } from "./ui/separator";

const MobileHeaderMenu = () => {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { organizations, loading, setActiveOrganization } = useUserOrganizations();
  const { organization: currentOrg, profile, refetch } = useOrganization();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSelectOrg = async (org: UserOrganization) => {
    if (org.id === currentOrg?.id) {
      setOpen(false);
      return;
    }
    await setActiveOrganization(org.id);
    await refetch();
    setOpen(false);
    
    if (org.slug) {
      const currentPath = location.pathname;
      const currentOrgSlug = currentOrg?.slug;
      let subPath = "";
      
      if (currentOrgSlug && currentPath.startsWith(`/${currentOrgSlug}`)) {
        subPath = currentPath.slice(`/${currentOrgSlug}`.length);
      }
      
      navigate(`/${org.slug}${subPath}`);
    }
  };

  const handleSettingsClick = () => {
    setOpen(false);
    if (currentOrg?.slug) {
      navigate(`/${currentOrg.slug}/settings`);
    }
  };

  const handleSignOut = () => {
    setOpen(false);
    signOut();
  };

  const currentOrgRole = organizations.find(o => o.id === currentOrg?.id)?.role;
  const canCreateOrg = currentOrgRole === "admin";

  const currentOrgData = organizations.find(o => o.id === currentOrg?.id) || (currentOrg ? {
    id: currentOrg.id,
    name: currentOrg.name,
    slug: currentOrg.slug,
    logo_url: currentOrg.logo_url,
    role: "admin" as const,
  } : null);

  if (loading || !user) {
    return null;
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl hover:bg-secondary/80 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-left">Menu</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-col h-full">
            {/* Current User */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {profile?.full_name?.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Organizations Section */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Organizations
                  </span>
                </div>
                <div className="space-y-1">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSelectOrg(org)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                        org.id === currentOrg?.id
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={org.logo_url || undefined} alt={org.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {org.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium truncate">{org.name}</p>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] capitalize mt-0.5",
                            org.role === "admin" && "bg-primary/10 text-primary",
                            org.role === "member" && "bg-muted",
                            org.role === "viewer" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {org.role === "admin" ? "Full Access" : org.role}
                        </Badge>
                      </div>
                      {org.id === currentOrg?.id && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-border p-4 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11"
                onClick={handleSettingsClick}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <CreateOrganizationDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </>
  );
};

export default MobileHeaderMenu;
