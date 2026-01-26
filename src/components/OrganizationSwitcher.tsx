import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUserOrganizations, UserOrganization } from "@/contexts/UserOrganizationsContext";
import { useOrganization } from "@/hooks/useOrganization";
import CreateOrganizationDialog from "./CreateOrganizationDialog";

const OrganizationSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { organizations, loading, setActiveOrganization } = useUserOrganizations();
  const { organization: currentOrg, refetch } = useOrganization();
  const navigate = useNavigate();

  const handleSelectOrg = async (org: UserOrganization) => {
    if (org.id === currentOrg?.id) {
      setOpen(false);
      return;
    }
    // Set the active organization and refetch data
    await setActiveOrganization(org.id);
    await refetch();
    setOpen(false);
    // Navigate to the new org's root URL
    if (org.slug) {
      navigate(`/${org.slug}`);
    }
  };

  const handleCreateClick = () => {
    setOpen(false);
    setCreateDialogOpen(true);
  };

  // Get current user's role in the current org to check if they can create orgs
  const currentOrgRole = organizations.find(o => o.id === currentOrg?.id)?.role;
  const canCreateOrg = currentOrgRole === "admin";

  // Get the current org data for display
  const currentOrgData = organizations.find(o => o.id === currentOrg?.id) || (currentOrg ? {
    id: currentOrg.id,
    name: currentOrg.name,
    slug: currentOrg.slug,
    logo_url: currentOrg.logo_url,
    role: "admin" as const,
  } : null);

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <div className="w-24 h-4 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!currentOrgData) {
    return null;
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between gap-2 min-w-[200px] bg-white hover:bg-white/90 dark:bg-[#1D2128] dark:hover:bg-[#1D2128]/90"
            style={{ borderColor: '#DF4C33' }}
          >
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentOrgData.logo_url || undefined} alt={currentOrgData.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {currentOrgData.name?.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[120px]">{currentOrgData.name || "Select organisation"}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search organisations..." />
            <CommandList>
              <CommandEmpty>No organisation found.</CommandEmpty>
              <CommandGroup heading="Your Organisations">
                {organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={org.name}
                    onSelect={() => handleSelectOrg(org)}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage src={org.logo_url || undefined} alt={org.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {org.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium">{org.name}</span>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px] w-fit capitalize",
                            org.role === "admin" && "bg-primary/10 text-primary",
                            org.role === "member" && "bg-muted",
                            org.role === "viewer" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {org.role === "admin" ? "Full Access" : org.role}
                        </Badge>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        org.id === currentOrg?.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              {canCreateOrg && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateClick}
                      className="cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Organisation
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CreateOrganizationDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </>
  );
};

export default OrganizationSwitcher;
