import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";

export interface SubdomainInfo {
  orgSlug: string | null;
  baseUrl: string;
  isOrgRoute: boolean;
}

/**
 * Hook to extract organization slug from path-based routing
 * URLs follow the pattern: /:orgSlug/page (e.g., /northern100/dashboard)
 */
export const useSubdomain = (): SubdomainInfo => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  
  return useMemo(() => ({
    orgSlug: orgSlug || null,
    baseUrl: window.location.origin,
    isOrgRoute: !!orgSlug,
  }), [orgSlug]);
};

/**
 * Generate a URL for a given org slug and path
 */
export const getOrgUrl = (slug: string, path: string = ""): string => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/${slug}${cleanPath ? `/${cleanPath}` : ""}`;
};

/**
 * Generate slug from organization name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
};

/**
 * Validate slug format
 */
export const isValidSlug = (slug: string): boolean => {
  // Must be 3-50 characters, only lowercase letters, numbers, and hyphens
  // Cannot start or end with hyphen
  const slugRegex = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
  return slugRegex.test(slug) || (slug.length >= 2 && /^[a-z0-9]{2,50}$/.test(slug));
};
