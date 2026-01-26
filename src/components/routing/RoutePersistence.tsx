import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LAST_PATH_KEY = "bosplan:last_path";

function getNavigationType(): PerformanceNavigationTiming["type"] | null {
  try {
    const entry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return entry?.type ?? null;
  } catch {
    return null;
  }
}

/**
 * Ensures a browser refresh keeps the user on the same page.
 * This is especially important in environments that always load the SPA at `/`.
 */
export function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.pathname, location.search, location.hash]
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.setItem(LAST_PATH_KEY, currentPath);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentPath]);

  useEffect(() => {
    // Only restore on a true refresh (reload), not on normal navigation.
    const navType = getNavigationType();
    if (navType !== "reload") return;

    const lastPath = sessionStorage.getItem(LAST_PATH_KEY);
    if (!lastPath) return;

    // If the hosting environment always loads at `/` on refresh,
    // restore the last in-app path (unless it already was `/`).
    if (location.pathname === "/" && lastPath !== "/") {
      navigate(lastPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
