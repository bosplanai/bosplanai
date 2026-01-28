import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, ExternalLink, MoreHorizontal, Trash2, Shield, User, Eye, Loader2 } from "lucide-react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type AppRole = "admin" | "member" | "viewer";

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
  const { navigateOrg } = useOrgNavigation();
  const { members, loading, removeMember, isAdmin } = useTeamMembers();
  const { user } = useAuth();
  const { toast } = useToast();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string } | null>(null);

  const handleRemoveMember = async () => {
    if (!confirmRemove) return;

    setRemovingId(confirmRemove.id);
    try {
      await removeMember(confirmRemove.id);
      toast({
        title: "Member removed",
        description: `${confirmRemove.name} has been removed from the organisation`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick link to full team management */}
      <Card 
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => navigateOrg("/settings/team")}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            Full Team Management
            <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Invite new members, manage roles, and view pending invitations.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Inline team members list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5" />
            Team Members
            <Badge variant="secondary" className="ml-auto">
              {loading ? "..." : members.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Current members in your organisation. Full access users can remove team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team members found.
            </p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const config = roleConfig[member.role as AppRole] || roleConfig.viewer;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(member.full_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {member.full_name}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.job_role || "No role specified"}
                      </p>
                    </div>

                    <Badge variant="outline" className={`${config.color} flex items-center gap-1 shrink-0`}>
                      {config.icon}
                      <span className="hidden sm:inline">{config.label}</span>
                    </Badge>

                    {isAdmin && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            {removingId === member.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-popover border shadow-md z-50">
                          <DropdownMenuItem
                            onClick={() => setConfirmRemove({ id: member.user_id, name: member.full_name })}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove from organisation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove team member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{confirmRemove?.name}</strong> from the organisation? 
              They will lose access immediately and will need to be re-invited to regain access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={!!removingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamSettingsContent;
