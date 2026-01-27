import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

// Map routes to feature names and categories
const FEATURE_MAP: Record<string, { name: string; category: string }> = {
  "/": { name: "Dashboard", category: "Core" },
  "/projects": { name: "Projects", category: "Project Management" },
  "/calendar": { name: "Calendar", category: "Core" },
  "/drive": { name: "Drive", category: "File Management" },
  "/dataroom": { name: "Data Room", category: "File Management" },
  "/policies": { name: "Policies", category: "Compliance" },
  "/templates": { name: "Templates", category: "Content" },
  "/taskflow": { name: "Task Flow", category: "Project Management" },
  "/taskpopulate": { name: "Task Populate", category: "AI Features" },
  "/product-management": { name: "Product Management", category: "Project Management" },
  "/team-members": { name: "Team Members", category: "Settings" },
  "/settings": { name: "Settings", category: "Settings" },
  "/settings/account": { name: "Account Settings", category: "Settings" },
  "/settings/organization": { name: "Organization Settings", category: "Settings" },
  "/settings/billing": { name: "Billing", category: "Settings" },
  "/settings/appearance": { name: "Appearance", category: "Settings" },
  "/magic-merge": { name: "Magic Merge", category: "AI Features" },
  "/merge-history": { name: "Merge History", category: "AI Features" },
};

// Get feature info from a path, handling dynamic routes
const getFeatureFromPath = (pathname: string): { name: string; category: string } | null => {
  // Check exact match first
  if (FEATURE_MAP[pathname]) {
    return FEATURE_MAP[pathname];
  }

  // Handle dynamic routes
  if (pathname.startsWith("/shared/")) {
    return { name: "Shared File", category: "File Management" };
  }

  // Check for partial matches (settings sub-routes, etc.)
  for (const [route, feature] of Object.entries(FEATURE_MAP)) {
    if (pathname.startsWith(route) && route !== "/") {
      return feature;
    }
  }

  return null;
};

export const useFeatureTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const lastTrackedPath = useRef<string>("");

  useEffect(() => {
    // Don't track if user is not logged in
    if (!user) return;

    // Don't track super admin routes
    if (location.pathname.startsWith("/superadmin")) return;

    // Don't track auth routes
    if (location.pathname === "/auth" || location.pathname === "/welcome") return;

    // Don't track the same path twice in a row
    if (location.pathname === lastTrackedPath.current) return;

    const feature = getFeatureFromPath(location.pathname);
    if (!feature) return;

    lastTrackedPath.current = location.pathname;

    // Log the feature usage
    const logUsage = async () => {
      try {
        await (supabase.from("feature_usage_logs" as any) as any).insert({
          organization_id: organization?.id || null,
          user_id: user.id,
          feature_name: feature.name,
          feature_category: feature.category,
          page_path: location.pathname,
        });
      } catch (error) {
        // Silently fail - we don't want tracking errors to affect user experience
        console.error("Failed to log feature usage:", error);
      }
    };

    logUsage();
  }, [location.pathname, user, organization?.id]);
};

export default useFeatureTracking;
