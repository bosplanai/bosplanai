import { Calendar, Settings, Users, Building, LayoutGrid, CreditCard, Building2, HardDrive, Wand2, Activity, Sparkles, Library, FolderLock, UserCheck, Link as LinkIcon, ExternalLink, FileText, Star, Heart, Bell, Mail, Phone, Globe, HelpCircle, Info, MessageSquare, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  "link": LinkIcon,
  "external-link": ExternalLink,
  "calendar": Calendar,
  "file-text": FileText,
  "users": Users,
  "settings": Settings,
  "star": Star,
  "heart": Heart,
  "bell": Bell,
  "mail": Mail,
  "phone": Phone,
  "globe": Globe,
  "help-circle": HelpCircle,
  "info": Info,
  "message-square": MessageSquare,
  "bookmark": Bookmark,
};

interface CustomButton {
  id: string;
  title: string;
  icon: string;
  url: string;
  is_enabled: boolean;
  position: number;
}

const SideNavigation = ({ activeItem, onItemClick }: SideNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { organization } = useOrganization();
  
  const { role, isAdmin } = useUserRole();

  // Fetch custom buttons
  const { data: customButtons = [] } = useQuery({
    queryKey: ["custom-nav-buttons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_nav_buttons")
        .select("*")
        .eq("is_enabled", true)
        .order("position", { ascending: true });
      
      if (error) {
        console.error("Error fetching custom buttons:", error);
        return [];
      }
      return data as CustomButton[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

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

  // Handle custom button click
  const handleCustomButtonClick = (url: string) => {
    // Check if it's an external URL
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      // Internal navigation
      navigate(url);
    }
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
        
        {/* Custom Buttons */}
        {customButtons.length > 0 && (
          <>
            <div className="w-8 border-t border-border my-2" />
            {customButtons.map((button) => {
              const Icon = iconMap[button.icon] || LinkIcon;
              return (
                <Tooltip key={button.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleCustomButtonClick(button.url)}
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 text-muted-foreground hover:bg-sidebarIcon hover:text-foreground"
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">{button.title}</TooltipContent>
                </Tooltip>
              );
            })}
          </>
        )}
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
          
          {/* Custom Buttons - Mobile */}
          {customButtons.map((button) => {
            const Icon = iconMap[button.icon] || LinkIcon;
            return (
              <button
                key={button.id}
                type="button"
                onClick={() => handleCustomButtonClick(button.url)}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg transition-all duration-200 min-w-[60px] flex-shrink-0 text-muted-foreground"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium truncate max-w-[56px]">{button.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SideNavigation;
