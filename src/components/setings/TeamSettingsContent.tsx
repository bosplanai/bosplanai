import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ExternalLink } from "lucide-react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";

const TeamSettingsContent = () => {
  const { navigateOrg } = useOrgNavigation();

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card 
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => navigateOrg("/settings/team")}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
            <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            Invite, manage, and remove team members from your organisation. Click to open the full team management page.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default TeamSettingsContent;
