import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Building2, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SideNavigation from "@/components/SideNavigation";
import BetaFooter from "@/components/BetaFooter";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";

// Import content components
import AccountSettingsContent from "@/components/settings/AccountSettingsContent";
import OrganizationSettingsContent from "@/components/settings/OrganizationSettingsContent";
import BillingSettingsContent from "@/components/settings/BillingSettingsContent";

const Settings = () => {
  const { navigateOrg } = useOrgNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useUserRole();
  
  // Get initial tab from URL or default to "account"
  const initialTab = searchParams.get("tab") || "account";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  // Sync tab with URL changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const tabs = [
    { id: "account", label: "Account", icon: User, adminOnly: false },
    { id: "organization", label: "Organisation", icon: Building2, adminOnly: true },
    { id: "team", label: "Team", icon: Users, adminOnly: true, isLink: true },
    { id: "billing", label: "Billing", icon: CreditCard, adminOnly: true },
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div className="flex h-screen bg-background pb-20 md:pb-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateOrg("/")}
                className="mb-3 sm:mb-4 -ml-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account and organisation settings
              </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full h-auto flex-wrap justify-start gap-1 bg-muted/50 p-1 rounded-xl mb-6">
                {visibleTabs.map((tab) => {
                  const Icon = tab.icon;
                  if (tab.isLink) {
                    return (
                      <Button
                        key={tab.id}
                        variant="ghost"
                        onClick={() => navigateOrg("/team-members")}
                        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-background"
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </Button>
                    );
                  }
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              <TabsContent value="account" className="mt-0">
                <AccountSettingsContent />
              </TabsContent>

              {isAdmin && (
                <>
                  <TabsContent value="organization" className="mt-0">
                    <OrganizationSettingsContent />
                  </TabsContent>

                  <TabsContent value="billing" className="mt-0">
                    <BillingSettingsContent />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </div>
      <SideNavigation activeItem="settings" />
      <BetaFooter />
    </div>
  );
};

export default Settings;
