import { Calendar, Settings, Users, Building, LayoutGrid, CreditCard, Building2, HardDrive, Wand2, Activity, Sparkles, Library, FolderLock, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  path?: string;
  requiredRole?: "admin" | "member" | "viewer"; // minimum role required
}

// Define nav items with role requirements
// viewer: Tasks, Calendar, Mail, Drive only
// member: same as viewer
// admin (Full Access): everything
const allNavItems: NavItem[] = [
  { id: "tasks", icon: LayoutGrid, label: "Tasks", path: "" },
  { id: "projects", icon: Building, label: "Projects", path: "/projects", requiredRole: "admin" },
  { id: "calendar", icon: Calendar, label: "Calendar", path: "/calendar" },
  { id: "drive", icon: HardDrive, label: "Bosdrive", path: "/drive" },
  { id: "dataroom", icon: FolderLock, label: "Data Room", path: "/dataroom" },
  { id: "magic-merge", icon: Wand2, label: "Magic Merge", path: "/magic-merge", requiredRole: "member" },
  { id: "taskflow", icon: Activity, label: "TaskFlow", path: "/taskflow", requiredRole: "admin" },
  { id: "taskpopulate", icon: Sparkles, label: "TaskPopulate", path: "/taskpopulate", requiredRole: "member" },
  { id: "virtual-assistants", icon: UserCheck, label: "Remote Assistants", path: "/virtual-assistants", requiredRole: "member" },
];

interface SideNavigationProps {
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
}

const SideNavigation = ({ activeItem, onItemClick }: SideNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organization } = useOrganization();
  
  const { role, isAdmin } = useUserRole();

  // Filter nav items based on user role
  const navItems = allNavItems.filter((item) => {
    if (!item.requiredRole) return true; // No restriction
    if (item.requiredRole === "admin") return isAdmin;
    if (item.requiredRole === "member") return isAdmin || role === "member";
    return true;
  });

  // Generate org-prefixed path
  const getOrgPath = (path: string) => {
    if (!organization?.slug) return path || "/";
    return `/${organization.slug}${path}`;
  };

  const handleClick = (item: NavItem) => {
    onItemClick?.(item.id);
    if (item.path !== undefined) {
      navigate(getOrgPath(item.path));
    }
  };

  const getIsActive = (item: NavItem) => {
    if (item.path !== undefined) {
      const orgPath = getOrgPath(item.path);
      // For root path, check exact match
      if (item.path === "") {
        return location.pathname === orgPath || location.pathname === `/${organization?.slug}`;
      }
      return location.pathname === orgPath || location.pathname.startsWith(`${orgPath}/`);
    }
    return activeItem === item.id;
  };

  return (
    <>
      {/* Desktop: vertical sidebar on the right - fixed position for true sticky behavior */}
      <div className="hidden md:flex w-16 bg-background border-l border-border flex-col items-center py-6 gap-2 fixed top-0 right-0 h-screen z-50">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = getIsActive(item);

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleClick(item)}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200",
                    isActive
                      ? "bg-sidebarIcon text-foreground"
                      : "text-muted-foreground hover:bg-sidebarIcon hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      {/* Spacer to account for fixed sidebar width */}
      <div className="hidden md:block w-16 flex-shrink-0" />

      {/* Mobile: horizontal bottom navigation bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
        <div className="flex items-center gap-1 py-2 px-2 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = getIsActive(item);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] flex-shrink-0",
                  isActive
                    ? "bg-sidebarIcon text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate max-w-[56px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SideNavigation;
