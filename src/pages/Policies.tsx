import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDatabase } from "@/components/policies/PolicyDatabase";
import SideNavigation from "@/components/SideNavigation";
import BetaFooter from "@/components/BetaFooter";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { NotificationBell } from "@/components/NotificationBell";

const Policies = () => {
  const { navigate } = useOrgNavigation();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col">
          <header className="flex items-center justify-between px-8 py-4 border-b border-border">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/templates")}
                className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <OrganizationSwitcher />
            </div>
            <NotificationBell />
          </header>
          <main className="flex-1 p-8">
            <PolicyDatabase />
          </main>
        </div>
        <SideNavigation />
      </div>
      <BetaFooter />
    </div>
  );
};

export default Policies;
