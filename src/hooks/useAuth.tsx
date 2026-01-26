import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour in milliseconds

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSigningOutRef = useRef(false);

  // Check and cancel any pending account deletion when user logs in
  const checkAndCancelDeletion = async () => {
    try {
      // Ensure we have a fresh session before making the call
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        console.log("[AUTH] No valid session for deletion check");
        return;
      }

      const { data, error } = await supabase.functions.invoke("cancel-account-deletion");
      
      // Handle both function errors and response errors
      let errorMessage: string | null = null;
      if (error) {
        errorMessage = error.message;
        const ctxBody = (error as any)?.context?.body;
        if (typeof ctxBody === "string") {
          try {
            const parsed = JSON.parse(ctxBody);
            if (parsed?.error) errorMessage = parsed.error;
          } catch { /* ignore */ }
        }
      }
      if (data?.error) {
        errorMessage = data.error;
      }

      if (errorMessage) {
        console.error("[AUTH] Error checking deletion status:", errorMessage);
        return;
      }

      if (data?.message && data.message !== "No scheduled deletion to cancel") {
        toast({
          title: "Welcome back!",
          description: data.message,
        });
      }
    } catch (err) {
      console.error("[AUTH] Error in cancel deletion check:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    const applySession = (nextSession: Session | null, isInitial = false) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      // Only set loading to false after the initial check is complete
      if (isInitial) {
        initialCheckDone = true;
        setLoading(false);
      } else if (initialCheckDone) {
        // For subsequent auth changes, loading is already false
        setLoading(false);
      }
    };

    const validateAndApplySession = async (nextSession: Session | null, checkDeletion = false, isInitial = false) => {
      if (!nextSession) {
        applySession(null, isInitial);
        return;
      }

      // Validate session against the backend. This prevents "Session not found" / "Invalid JWT"
      // situations where a stale local session exists but has been revoked server-side.
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          console.warn("[AUTH] Invalid session detected, clearing local auth state", error);
          try {
            await supabase.auth.signOut();
          } catch {
            // ignore
          }
          applySession(null, isInitial);
          return;
        }

        // Check for and cancel any pending deletions when user signs in
        // Delay slightly to ensure session is fully established
        if (checkDeletion && data.user) {
          setTimeout(() => {
            checkAndCancelDeletion();
          }, 500);
        }
      } catch (e) {
        console.warn("[AUTH] Failed to validate session, clearing local auth state", e);
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        applySession(null, isInitial);
        return;
      }

      applySession(nextSession, isInitial);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Check for deletion cancellation on sign in events
      const shouldCheckDeletion = event === "SIGNED_IN";
      // Auth state changes after initial load are not the initial check
      validateAndApplySession(nextSession, shouldCheckDeletion, false);
    });

    // Initial session check - mark as initial
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => validateAndApplySession(initialSession, false, true));

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = useCallback(async () => {
    // Prevent multiple simultaneous signouts
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;
    
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      // Even if signOut fails, clear local state
      console.error("Sign out error:", error);
    } finally {
      // Always clear local state to ensure user is logged out
      setSession(null);
      setUser(null);
      isSigningOutRef.current = false;
    }
  }, []);

  // Inactivity timeout logic
  const resetInactivityTimer = useCallback(() => {
    if (!user) return; // Don't set timer if not logged in
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    inactivityTimerRef.current = setTimeout(() => {
      if (user && !isSigningOutRef.current) {
        toast({
          title: "Session expired",
          description: "You have been logged out due to inactivity.",
        });
        signOut();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [user, signOut, toast]);

  // Set up activity listeners for inactivity timeout
  useEffect(() => {
    if (!user) {
      // Clear timer if user logs out
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

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
  }, [user, resetInactivityTimer]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
