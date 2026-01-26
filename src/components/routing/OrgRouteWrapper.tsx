import { useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useSubdomain } from "@/hooks/useSubdomain";

/**
 * Wrapper component that handles organization-based routing
 * - Redirects authenticated users to their org-prefixed URLs
 * - Validates org slug matches the active organization
 */
const OrgRouteWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const { orgSlug } = useSubdomain();

  useEffect(() => {
    // Wait for loading to complete
    if (authLoading || orgLoading) return;

    // If not authenticated, don't interfere with routing
    if (!user || !organization) return;

    const currentPath = location.pathname;
    const currentSearch = location.search;
    const currentHash = location.hash;
    const expectedPrefix = `/${organization.slug}`;

    // If we're on an org route, validate the slug matches
    if (orgSlug) {
      if (orgSlug !== organization.slug) {
        // Slug mismatch - redirect to correct org path
        const pathWithoutSlug = currentPath.replace(`/${orgSlug}`, "");
        // Preserve query/hash (e.g., Stripe return params)
        const newPath = `${expectedPrefix}${pathWithoutSlug || ""}${currentSearch}${currentHash}`;
        navigate(newPath, { replace: true });
      }
      return;
    }

    // Check if we're on a protected route that should have org prefix
    const protectedPaths = [
      "/",
      "/calendar",
      "/projects",
      "/magic-merge",
      "/taskflow",
      "/taskpopulate",
      "/templates",
      "/settings",
      "/dataroom",
      "/drive",
      "/policies",
      "/virtual-assistants",
    ];

    const isProtectedRoute = protectedPaths.some(
      (path) => currentPath === path || currentPath.startsWith(`${path}/`)
    );

    if (isProtectedRoute) {
      // Redirect to org-prefixed URL
      // Preserve query/hash (e.g., Stripe return params)
      const newPath = `${expectedPrefix}${currentPath}${currentSearch}${currentHash}`;
      navigate(newPath, { replace: true });
    }
  }, [user, organization, orgSlug, location.pathname, location.search, location.hash, authLoading, orgLoading, navigate]);

  return <Outlet />;
};

export default OrgRouteWrapper;
