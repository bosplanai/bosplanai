import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "./useOrganization";

/**
 * Hook that provides org-prefixed navigation
 * Automatically prepends the organization slug to paths
 */
export const useOrgNavigation = () => {
  const navigate = useNavigate();
  const { organization } = useOrganization();

  /**
   * Navigate to an org-prefixed path
   * @param path - The path to navigate to (without org prefix)
   * @param options - React Router navigate options
   */
  const navigateOrg = useCallback(
    (path: string, options?: { replace?: boolean; state?: unknown }) => {
      if (!organization?.slug) {
        // Fallback to regular navigation if no org
        navigate(path, options);
        return;
      }
      
      // Handle root path
      const cleanPath = path === "/" ? "" : path;
      const orgPath = `/${organization.slug}${cleanPath}`;
      navigate(orgPath, options);
    },
    [navigate, organization?.slug]
  );

  /**
   * Get an org-prefixed path without navigating
   * Useful for links and hrefs
   */
  const getOrgPath = useCallback(
    (path: string): string => {
      if (!organization?.slug) {
        return path;
      }
      const cleanPath = path === "/" ? "" : path;
      return `/${organization.slug}${cleanPath}`;
    },
    [organization?.slug]
  );

  return {
    navigate: navigateOrg, // Alias for convenience
    navigateOrg,
    getOrgPath,
    orgSlug: organization?.slug || null,
  };
};
