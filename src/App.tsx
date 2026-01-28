import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RoutePersistence } from "@/components/routing/RoutePersistence";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrganizationProvider, useOrganization } from "@/hooks/useOrganization";
import { UserRoleProvider, useUserRole } from "@/hooks/useUserRole";
import { UserOrganizationsProvider } from "@/contexts/UserOrganizationsContext";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { SparkleProvider, useSparkle } from "@/contexts/SparkleContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import SparkleAnimation from "@/components/SparkleAnimation";
import FeatureTracker from "@/components/FeatureTracker";
import Calendar from "./pages/Calendar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import ProductManagement from "./pages/ProductManagement";
import Settings from "./pages/Settings";
import AppearanceSettings from "./pages/AppearanceSettings";
import TeamMembers from "./pages/TeamMembers";
import AccessDenied from "./pages/AccessDenied";
import NotFound from "./pages/NotFound";
import Dataroom from "./pages/Dataroom";
import Drive from "./pages/Drive";
import PaymentSuccess from "./pages/PaymentSuccess";
import SignNda from "./pages/SignNda";
import DataRoomInvite from "./pages/DataRoomInvite";
import GuestDataRoom from "./pages/GuestDataRoom";
import SharedFile from "./pages/SharedFile";
import MagicMergeTool from "./pages/MagicMergeTool";
import MergeHistory from "./pages/MergeHistory";
import TaskFlow from "./pages/TaskFlow";
import TaskPopulate from "./pages/TaskPopulate";
import Templates from "./pages/Templates";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminAuth from "./pages/SuperAdminAuth";
import CustomerList from "./pages/superadmin/CustomerList";
import AccountStatus from "./pages/superadmin/AccountStatus";
import CreateSpecialistPlan from "./pages/superadmin/CreateSpecialistPlan";
import ManageRegistrationLinks from "./pages/superadmin/ManageRegistrationLinks";
import ManageAIUsage from "./pages/superadmin/ManageAIUsage";
import CustomerActivity from "./pages/superadmin/CustomerActivity";
import ManageVirtualAssistants from "./pages/superadmin/ManageVirtualAssistants";
import Policies from "./pages/Policies";
import SpecialistSignup from "./pages/SpecialistSignup";
import TermsAndConditions from "./pages/TermsAndConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Onboarding from "./pages/Onboarding";
import Tools from "./pages/Tools";
import Bosdrive from "./pages/Bosdrive";
import ProjectManagementExplainer from "./pages/ProjectManagement.explainer";
import CalendarExplainer from "./pages/CalendarExplainer";
import Pricing from "./pages/Pricing";
import VirtualAssistants from "./pages/VirtualAssistants";
import AcceptInvite from "./pages/AcceptInvite";
import FeedbackForm from "./pages/FeedbackForm";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

// Org slug validation wrapper - validates URL slug matches active org
const OrgSlugValidator = ({ children }: { children: React.ReactNode }) => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { organization, loading } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || !organization) return;

    // If the slug in URL doesn't match the active org, redirect to correct slug
    // IMPORTANT: Preserve query string (e.g., ?storage_purchase=success&session_id=...)
    if (orgSlug && orgSlug !== organization.slug) {
      const pathAfterSlug = location.pathname.replace(`/${orgSlug}`, "");
      const newPath = `/${organization.slug}${pathAfterSlug}${location.search}`;
      navigate(newPath, { replace: true });
    }
  }, [orgSlug, organization, loading, navigate, location.pathname, location.search]);

  return <>{children}</>;
};

// Root redirect - sends authenticated users to their org-prefixed URL
// Preserves query string for post-checkout verification flows
const RootRedirect = () => {
  const { user, loading: authLoading } = useAuth();
  const { organization, loading: orgLoading } = useOrganization();
  const location = useLocation();

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (organization) {
    // Preserve the current path and query string when redirecting to org-prefixed URL
    // e.g., /drive?storage_purchase=success&session_id=... -> /{orgSlug}/drive?storage_purchase=success&session_id=...
    const targetPath = `/${organization.slug}${location.pathname}${location.search}`;
    return <Navigate to={targetPath} replace />;
  }

  return <Navigate to="/auth" replace />;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  skipOnboardingCheck?: boolean;
}

const ProtectedRoute = ({ children, skipOnboardingCheck = false }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, organization, loading: orgLoading } = useOrganization();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isViewerRole, setIsViewerRole] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || !organization || skipOnboardingCheck) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        // Fetch both onboarding status and user role in parallel
        const [profileResult, roleResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("onboarding_completed")
            .eq("id", user.id)
            .single(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("organization_id", organization.id)
            .single(),
        ]);
        
        setOnboardingCompleted(profileResult.data?.onboarding_completed ?? false);
        // DB roles are: admin | moderator | user | super_admin
        // UI "viewer" maps to DB "user"
        setIsViewerRole(roleResult.data?.role === "user");
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        setOnboardingCompleted(true); // Default to completed on error
      } finally {
        setCheckingOnboarding(false);
      }
    };

    // Reset checking state when dependencies change to ensure we re-evaluate
    if (user && profile && organization) {
      setCheckingOnboarding(true);
      checkOnboarding();
    } else if (!authLoading && !orgLoading) {
      // Only stop checking if we're done loading and still missing data
      setCheckingOnboarding(false);
    }
  }, [user, profile, organization, skipOnboardingCheck, authLoading, orgLoading]);

  if (authLoading || orgLoading || checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  // If user exists but no profile, they need to complete registration
  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  // If user has no organization, redirect to complete setup
  if (!organization) {
    return <Navigate to="/auth" replace />;
  }

  // Check if the organization is suspended
  if (organization.is_suspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-4 p-8 bg-card border border-border rounded-lg text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Account Suspended</h2>
          <p className="text-muted-foreground mb-4">
            Your organisation's access has been suspended. Please contact support for more information.
          </p>
          <p className="text-sm text-muted-foreground">
            Organisation: {organization.name}
          </p>
        </div>
      </div>
    );
  }

  // Check onboarding completion (only for non-skipped routes and non-viewer roles)
  // Viewers (Team accounts) cannot create tasks, so they skip TaskPopulate onboarding
  if (!skipOnboardingCheck && onboardingCompleted === false && !isViewerRole) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Admin-only route - redirects to access denied if not admin
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, organization, loading: orgLoading } = useOrganization();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (authLoading || orgLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (!profile || !organization) {
    return <Navigate to="/auth" replace />;
  }

  // Check for admin role
  if (!isAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

// Member-level route - allows admin and member roles, denies viewers
const MemberRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, organization, loading: orgLoading } = useOrganization();
  const { isAdmin, role, loading: roleLoading } = useUserRole();

  if (authLoading || orgLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (!profile || !organization) {
    return <Navigate to="/auth" replace />;
  }

  // Allow admin or member roles
  if (!isAdmin && role !== "member") {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

const SparkleWrapper = () => {
  const { isSparkleActive, sparkleContainerRef, handleComplete } = useSparkle();
  return (
    <SparkleAnimation
      isActive={isSparkleActive}
      onComplete={handleComplete}
      containerRef={sparkleContainerRef}
    />
  );
};

const AppRoutes = () => (
  <BrowserRouter>
    <RoutePersistence />
    <OrganizationProvider>
      <UserOrganizationsProvider>
        <UserRoleProvider>
          <CalendarProvider>
            <SparkleProvider>
              <AppearanceProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <FeatureTracker />
                  <SparkleWrapper />
                <Routes>
                {/* Public routes - no org prefix */}
                <Route path="/welcome" element={<Landing />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/sign-nda" element={<SignNda />} />
                <Route path="/data-room-invite" element={<DataRoomInvite />} />
                <Route path="/guest-dataroom" element={<GuestDataRoom />} />
                <Route path="/shared/:token" element={<SharedFile />} />
                <Route path="/register/:referralCode" element={<SpecialistSignup />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/bosdrive" element={<Bosdrive />} />
                <Route path="/projects2" element={<ProjectManagementExplainer />} />
                <Route path="/calendar2" element={<CalendarExplainer />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/accept-invite" element={<AcceptInvite />} />
                <Route path="/feedback-form" element={<FeedbackForm />} />
                
                {/* Super Admin Routes - no org prefix */}
                <Route path="/superadmin/login" element={<SuperAdminAuth />} />
                <Route path="/superadmin" element={<SuperAdminDashboard />} />
                <Route path="/superadmin/customers" element={<CustomerList />} />
                <Route path="/superadmin/account-status" element={<AccountStatus />} />
                <Route path="/superadmin/specialist-plans/create" element={<CreateSpecialistPlan />} />
                <Route path="/superadmin/registration-links" element={<ManageRegistrationLinks />} />
                <Route path="/superadmin/ai-usage" element={<ManageAIUsage />} />
                <Route path="/superadmin/customer-activity" element={<CustomerActivity />} />
                <Route path="/superadmin/virtual-assistants" element={<ManageVirtualAssistants />} />
                <Route path="/superadmin/*" element={<SuperAdminDashboard />} />

                {/* Root redirect - sends to org-prefixed URL */}
                <Route path="/" element={<RootRedirect />} />

                {/* Onboarding - uses org prefix but skips onboarding check */}
                <Route
                  path="/:orgSlug/onboarding"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute skipOnboardingCheck>
                        <Onboarding />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                {/* Legacy onboarding route - redirect to org-prefixed */}
                <Route
                  path="/onboarding"
                  element={
                    <ProtectedRoute skipOnboardingCheck>
                      <Onboarding />
                    </ProtectedRoute>
                  }
                />

                {/* Org-prefixed protected routes */}
                <Route
                  path="/:orgSlug"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <Index />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/calendar"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <Calendar />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/projects"
                  element={
                    <OrgSlugValidator>
                      <AdminRoute>
                        <ProductManagement />
                      </AdminRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/magic-merge"
                  element={
                    <OrgSlugValidator>
                      <MemberRoute>
                        <MagicMergeTool />
                      </MemberRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/magic-merge/history"
                  element={
                    <OrgSlugValidator>
                      <MemberRoute>
                        <MergeHistory />
                      </MemberRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/taskflow"
                  element={
                    <OrgSlugValidator>
                      <AdminRoute>
                        <TaskFlow />
                      </AdminRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/taskpopulate"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <TaskPopulate />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/templates"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <Templates />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/settings"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/settings/appearance"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <AppearanceSettings />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/team-members"
                  element={
                    <OrgSlugValidator>
                      <AdminRoute>
                        <TeamMembers />
                      </AdminRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/dataroom"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <Dataroom />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/drive"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <Drive />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/policies"
                  element={
                    <OrgSlugValidator>
                      <AdminRoute>
                        <Policies />
                      </AdminRoute>
                    </OrgSlugValidator>
                  }
                />
                <Route
                  path="/:orgSlug/virtual-assistants"
                  element={
                    <OrgSlugValidator>
                      <ProtectedRoute>
                        <VirtualAssistants />
                      </ProtectedRoute>
                    </OrgSlugValidator>
                  }
                />

                {/* Legacy routes without org prefix - redirect to org-prefixed versions */}
                <Route path="/calendar" element={<RootRedirect />} />
                <Route path="/projects" element={<RootRedirect />} />
                <Route path="/magic-merge" element={<RootRedirect />} />
                <Route path="/magic-merge/history" element={<RootRedirect />} />
                <Route path="/taskflow" element={<RootRedirect />} />
                <Route path="/taskpopulate" element={<RootRedirect />} />
                <Route path="/templates" element={<RootRedirect />} />
                <Route path="/settings" element={<RootRedirect />} />
                <Route path="/settings/appearance" element={<RootRedirect />} />
                <Route path="/team-members" element={<RootRedirect />} />
                <Route path="/dataroom" element={<RootRedirect />} />
                <Route path="/drive" element={<RootRedirect />} />
                <Route path="/policies" element={<RootRedirect />} />
                <Route path="/virtual-assistants" element={<RootRedirect />} />

                <Route path="*" element={<NotFound />} />
                </Routes>
              </TooltipProvider>
            </AppearanceProvider>
          </SparkleProvider>
        </CalendarProvider>
      </UserRoleProvider>
    </UserOrganizationsProvider>
  </OrganizationProvider>
</BrowserRouter>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
