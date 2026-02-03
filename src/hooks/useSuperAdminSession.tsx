import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SUPER_ADMIN_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const useSuperAdminSession = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSigningOutRef = useRef(false);
  const lastActivityRef = useRef<number>(Date.now());

  const signOutSuperAdmin = useCallback(async (showToast = true) => {
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    // Clear timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Super admin sign out error:", error);
    } finally {
      if (showToast) {
        toast({
          title: "Session expired",
          description: "Your super admin session has been terminated due to inactivity.",
          variant: "destructive",
        });
      }
      isSigningOutRef.current = false;
      navigate("/superadmin/login");
    }
  }, [navigate, toast]);

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    inactivityTimerRef.current = setTimeout(() => {
      if (!isSigningOutRef.current) {
        signOutSuperAdmin(true);
      }
    }, SUPER_ADMIN_INACTIVITY_TIMEOUT_MS);
  }, [signOutSuperAdmin]);

  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Initial timer setup
    resetInactivityTimer();

    // Add listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      // Cleanup listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });

      // Clear timer on unmount
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [resetInactivityTimer]);

  // Calculate remaining session time
  const getRemainingTime = useCallback(() => {
    const elapsed = Date.now() - lastActivityRef.current;
    return Math.max(0, SUPER_ADMIN_INACTIVITY_TIMEOUT_MS - elapsed);
  }, []);

  return {
    signOutSuperAdmin,
    resetInactivityTimer,
    getRemainingTime,
    sessionTimeoutMs: SUPER_ADMIN_INACTIVITY_TIMEOUT_MS,
  };
};
