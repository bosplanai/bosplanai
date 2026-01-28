import { Settings, Users, BarChart3 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  requiresAdmin?: boolean;
}

const tabs: Tab[] = [
  { id: "product", label: "Product Management", icon: Settings },
  { id: "operational", label: "Operational Management", icon: Users, requiresAdmin: true },
  { id: "strategic", label: "Strategic Management", icon: BarChart3, requiresAdmin: true },
];

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabNavigation = ({ activeTab, onTabChange }: TabNavigationProps) => {
  const { isAdmin, canAccessOperational, canAccessStrategic } = useUserRole();

  // Filter tabs based on actual board access permissions
  // Viewer and Manager only see Product Management (operational and strategic are hidden)
  const visibleTabs = tabs.filter((tab) => {
    if (tab.id === "operational") return canAccessOperational;
    if (tab.id === "strategic") return canAccessStrategic;
    return true; // Product Management is always visible
  });

  // If there's only one visible tab (Product Management for Team/Manager users), don't show the navigation
  if (visibleTabs.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
      {visibleTabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        const variant = isActive ? "tabActive" : "tab";

        // Custom inactive colors per tab
        const inactiveColorClass = !isActive
          ? tab.id === "product"
            ? "bg-brand-orange text-white dark:text-black hover:bg-brand-orange/90"
            : tab.id === "operational"
            ? "bg-brand-teal text-white dark:text-black hover:bg-brand-teal/90"
            : tab.id === "strategic"
            ? "bg-brand-coral text-white dark:text-black hover:bg-brand-coral/90"
            : ""
          : "";

        return (
          <Button
            key={tab.id}
            variant={variant}
            className={cn(
              "px-3 py-2 sm:px-5 sm:py-2.5 h-auto rounded-full transition-all duration-300 ease-out btn-smooth text-xs sm:text-sm",
              isActive && "shadow-md ring-2 ring-brand-coral ring-offset-2",
              inactiveColorClass
            )}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon
              className={cn(
                "w-4 h-4 sm:mr-2 transition-transform duration-200",
                isActive && "scale-110"
              )}
            />
            <span className="hidden sm:inline">{tab.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

export default TabNavigation;
