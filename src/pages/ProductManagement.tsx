import ProductManagementBoard from "@/components/ProductManagementBoard";
import BetaFooter from "@/components/BetaFooter";
import SideNavigation from "@/components/SideNavigation";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { LogOut, Users2, Settings, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
const ProductManagement = () => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    profile
  } = useOrganization();
  const [activeSideItem, setActiveSideItem] = useState("projects");
  const {
    navigate
  } = useOrgNavigation();
  const handleBackToDashboard = () => {
    navigate("/");
  };
  return <div className="flex min-h-screen bg-background pb-20 md:pb-0">
      <div className="flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-5 p-4 sm:p-6 md:p-8 bg-card/50">
          <div className="flex items-center gap-3 sm:gap-5">
            <img alt="Bosplan" className="h-8 w-auto cursor-pointer sm:h-10 transition-transform duration-200 hover:scale-105" onClick={() => navigate("/")} src="/lovable-uploads/331c0a1e-d0c3-4807-968f-98d705b0017e.png" />
            <Button variant="ghost" size="icon" onClick={handleBackToDashboard} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          {user && <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <OrganizationSwitcher />
              <span className="hidden sm:inline text-sm text-muted-foreground font-medium truncate max-w-[150px]">
                {profile?.full_name || user.email}
              </span>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/team-members")} title="Team Members">
                <Users2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/settings/organization")} title="Organisation Settings">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth text-xs sm:text-sm" onClick={signOut}>
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>}
        </div>
        <ProductManagementBoard />
      </div>
      <SideNavigation activeItem={activeSideItem} onItemClick={setActiveSideItem} />
      <BetaFooter />
    </div>;
};
export default ProductManagement;