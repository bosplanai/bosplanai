import ProductManagementBoard from "@/components/ProductManagementBoard";
import BetaFooter from "@/components/BetaFooter";
import SideNavigation from "@/components/SideNavigation";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import MobileHeaderMenu from "@/components/MobileHeaderMenu";
import HeaderLogo from "@/components/HeaderLogo";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeft, FolderKanban } from "lucide-react";
import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";

const ProductManagement = () => {
  const { user, signOut } = useAuth();
  const { profile } = useOrganization();
  const [activeSideItem, setActiveSideItem] = useState("projects");
  const { navigate } = useOrgNavigation();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-card border-b border-border px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <HeaderLogo />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/")}
                  className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange/70 flex items-center justify-center shadow-sm">
                    <FolderKanban className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-semibold text-foreground">Project Management</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage and track your projects</p>
                  </div>
                </div>
              </div>

              {user && (
                <>
                  {/* Desktop: All controls */}
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <OrganizationSwitcher />
                    <span className="text-sm text-muted-foreground font-medium truncate max-w-[150px]">
                      {profile?.full_name || user.email}
                    </span>
                    <NotificationBell />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth text-sm"
                      onClick={signOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                  {/* Mobile: Notification + Burger menu */}
                  <div className="flex md:hidden items-center gap-1.5 self-end">
                    <NotificationBell />
                    <MobileHeaderMenu />
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <ProductManagementBoard />
          </main>
        </div>
        <SideNavigation activeItem={activeSideItem} onItemClick={setActiveSideItem} />
      </div>
      <BetaFooter />
    </div>
  );
};

export default ProductManagement;