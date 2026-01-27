import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import SetPasswordDialog from "@/components/SetPasswordDialog";
import MathCaptcha from "@/components/MathCaptcha";
const employeeSizeOptions = [{
  value: "1-10",
  label: "1-10 employees"
}, {
  value: "11-50",
  label: "11-50 employees"
}, {
  value: "51-200",
  label: "51-200 employees"
}, {
  value: "201-500",
  label: "201-500 employees"
}, {
  value: "500+",
  label: "500+ employees"
}];
const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  organizationName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100),
  employeeSize: z.string().min(1, "Please select employee size"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  jobRole: z.string().trim().min(2, "Job role must be at least 2 characters").max(100),
  phoneNumber: z.string().trim().min(7, "Phone number must be at least 7 digits").max(20)
});
const inviteSignUpSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  jobRole: z.string().trim().min(2, "Job role must be at least 2 characters").max(100),
  phoneNumber: z.string().trim().min(7, "Phone number must be at least 7 digits").max(20)
});
interface InviteData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  token: string;
  expires_at: string;
  organization: {
    name: string;
    slug: string;
  };
}
const Auth = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const checkoutSuccess = searchParams.get("checkout_success");
  const sessionId = searchParams.get("session_id");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [employeeSize, setEmployeeSize] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // Invite-related state
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Checkout session state
  const [checkoutLoading, setCheckoutLoading] = useState(!!sessionId);
  const {
    signIn,
    user
  } = useAuth();
  const {
    organization,
    refetch
  } = useOrganization();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Fetch checkout session data when coming from Stripe payment
  useEffect(() => {
    const fetchCheckoutData = async () => {
      if (!sessionId) return;
      setCheckoutLoading(true);
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke("verify-checkout-session", {
          body: {
            sessionId
          }
        });
        if (error) throw error;

        // Pre-fill form with checkout data
        if (data?.email) setEmail(data.email);
        if (data?.organizationName) setOrganizationName(data.organizationName);
        if (data?.fullName) setFullName(data.fullName);
        if (data?.employeeSize) setEmployeeSize(data.employeeSize);
        if (data?.jobRole) setJobRole(data.jobRole);
        if (data?.phoneNumber) setPhoneNumber(data.phoneNumber);

        // Switch to signup mode
        setIsLogin(false);
        toast({
          title: "Payment confirmed!",
          description: "Complete your registration below."
        });
      } catch (err) {
        console.error("Error fetching checkout session:", err);
      } finally {
        setCheckoutLoading(false);
      }
    };
    fetchCheckoutData();
  }, [sessionId, toast]);

  // Fetch invite data when token is present using secure RPC function
  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteToken) return;
      setInviteLoading(true);
      try {
        // Use the secure RPC function that only returns invite data for the specific token
        const {
          data,
          error
        } = await supabase.rpc("get_invite_by_token", {
          _token: inviteToken
        });
        if (error) throw error;

        // The RPC returns an array, get the first (and only) result
        const inviteRow = Array.isArray(data) ? data[0] : data;
        if (!inviteRow) {
          setInviteError("This invitation is invalid or has already been used.");
          return;
        }
        const expiresAt = new Date(inviteRow.expires_at);
        if (expiresAt < new Date()) {
          setInviteError("This invitation has expired.");
          return;
        }
        setInviteData({
          id: inviteRow.id,
          email: inviteRow.email,
          role: inviteRow.role,
          organization_id: inviteRow.organization_id,
          token: inviteRow.token,
          expires_at: inviteRow.expires_at,
          organization: {
            name: inviteRow.org_name,
            slug: inviteRow.org_slug
          }
        });
        setEmail(inviteRow.email);
        setIsLogin(false); // Default to signup for invites
      } catch (error: any) {
        console.error("Error fetching invite:", error);
        setInviteError("Failed to load invitation details.");
      } finally {
        setInviteLoading(false);
      }
    };
    fetchInvite();
  }, [inviteToken]);
  const returnUrl = searchParams.get("returnUrl");
  
  useEffect(() => {
    if (user && organization) {
      // Avoid bouncing through "/" (which can trigger RootRedirect -> /welcome during auth/org sync).
      // If a returnUrl was provided, honor it; otherwise send the user to their org Tasks page.
      navigate(returnUrl || `/${organization.slug}`, { replace: true });
    }
  }, [user, organization, navigate, returnUrl]);
  const loginSchema = z.object({
    email: z.string().trim().min(1, "Email is required").email("Invalid email address").max(255),
    password: z.string().min(1, "Password is required").max(100)
  });

  const validateForm = () => {
    try {
      if (isLogin) {
        // Validate login fields
        loginSchema.parse({ email, password });
      } else if (inviteData) {
        // Simplified validation for invite signup
        inviteSignUpSchema.parse({
          email,
          password,
          fullName,
          jobRole,
          phoneNumber
        });
      } else {
        signUpSchema.parse({
          email,
          password,
          organizationName,
          employeeSize,
          fullName,
          jobRole,
          phoneNumber
        });
      }
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };
  const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };
  const handleInviteSignUp = async () => {
    if (!inviteData) return;

    // Sign up user
    const redirectUrl = `${window.location.origin}/`;
    const {
      data: authData,
      error: authError
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (authError) {
      if (authError.message.includes("already registered")) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in to accept the invitation.",
          variant: "destructive"
        });
        setIsLogin(true);
      } else {
        toast({
          title: "Sign up failed",
          description: authError.message,
          variant: "destructive"
        });
      }
      return;
    }
    if (authData.user && authData.session) {
      // Accept the invite using the database function
      const {
        data: result,
        error: acceptError
      } = await supabase.rpc("accept_invite", {
        _token: inviteData.token,
        _user_id: authData.user.id,
        _full_name: fullName.trim(),
        _job_role: jobRole.trim(),
        _phone_number: phoneNumber.trim()
      });
      const resultObj = result as {
        success: boolean;
        error?: string;
        organization_id?: string;
        role?: string;
      } | null;
      if (acceptError || !resultObj?.success) {
        toast({
          title: "Failed to join organization",
          description: resultObj?.error || acceptError?.message || "An error occurred",
          variant: "destructive"
        });
        return;
      }

      // Mark onboarding as complete for invited users (they join existing org)
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", authData.user.id);

      // Send welcome email for invite signup (fire and forget)
      supabase.functions.invoke("send-welcome-email", {
        body: {
          organizationName: inviteData.organization.name,
          fullName: fullName.trim()
        }
      }).catch(err => console.error("Welcome email error:", err));

      toast({
        title: "Welcome to the team!",
        description: `You've joined ${inviteData.organization.name} as a ${inviteData.role}`
      });

      // Navigate directly to Tasks page (skip onboarding for invited users)
      navigate(`/${inviteData.organization.slug}`);
    }
  };
  const handleRegularSignUp = async () => {
    // Sign up user first (before creating org, as RLS requires authentication)
    const redirectUrl = `${window.location.origin}/`;
    const {
      data: authData,
      error: authError
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (authError) {
      if (authError.message.includes("already registered")) {
        toast({
          title: "Account exists",
          description: "This email is already registered. Please sign in.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sign up failed",
          description: authError.message,
          variant: "destructive"
        });
      }
      return;
    }
    if (authData.user && authData.session) {
      try {
        const {
          data: orgId,
          error: createError
        } = await supabase.rpc("create_organization_and_profile", {
          _user_id: authData.user.id,
          _org_name: organizationName.trim(),
          _employee_size: employeeSize,
          _full_name: fullName.trim(),
          _job_role: jobRole.trim(),
          _phone_number: phoneNumber.trim()
        });
        if (createError) {
          console.error("Organization/profile creation error:", createError);
          toast({
            title: "Registration failed",
            description: createError.message || "Failed to complete signup. Please try again.",
            variant: "destructive"
          });
          return;
        }

        // Send welcome email (fire and forget - don't block the flow)
        supabase.functions.invoke("send-welcome-email", {
          body: {
            organizationName: organizationName.trim(),
            fullName: fullName.trim()
          }
        }).catch(err => console.error("Welcome email error:", err));

        toast({
          title: "Account created!",
          description: `Your organization "${organizationName}" is ready.`
        });

        // Generate the org slug and navigate directly to onboarding
        const orgSlug = organizationName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        
        // Fetch the actual org slug from database to ensure accuracy
        const { data: orgData } = await supabase
          .from("organizations")
          .select("slug")
          .eq("id", orgId)
          .single();
        
        const finalSlug = orgData?.slug || orgSlug;
        navigate(`/${finalSlug}/onboarding`);
      } catch (error: any) {
        console.error("Unexpected registration error:", error);
        toast({
          title: "Registration failed",
          description: error.message || "Failed to complete signup. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handlePaidSignUp = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase.functions.invoke("complete-paid-signup", {
        body: {
          sessionId,
          password,
          organizationName: organizationName.trim(),
          employeeSize,
          fullName: fullName.trim(),
          jobRole: jobRole.trim(),
          phoneNumber: phoneNumber.trim(),
        },
      });

      // Supabase functions can return a transport error OR an error inside the JSON body
      let errorMessage: string | null = null;
      if (error) {
        errorMessage = error.message;
        const ctxBody = (error as any)?.context?.body;
        if (typeof ctxBody === "string") {
          try {
            const parsed = JSON.parse(ctxBody);
            if (parsed?.error) errorMessage = parsed.error;
          } catch {
            // ignore
          }
        }
      }
      if ((data as any)?.error) {
        errorMessage = (data as any).error;
      }

      if (errorMessage) {
        toast({
          title: "Registration failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Now sign in (the edge function creates a confirmed user)
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        toast({
          title: "Login failed",
          description: signInError.message,
          variant: "destructive",
        });
        return;
      }

      // Send welcome email (fire and forget - don't block the flow)
      supabase.functions
        .invoke("send-welcome-email", {
          body: {
            organizationName: organizationName.trim(),
            fullName: fullName.trim(),
          },
        })
        .catch((err) => console.error("Welcome email error:", err));

      // Navigate directly to onboarding using the returned org slug
      const orgSlug = (data as any)?.organization_slug;
      if (orgSlug) {
        navigate(`/${orgSlug}/onboarding`, { replace: true });
      } else {
        // Fallback: resolve org slug from DB (avoid navigating to "/" which can land on /welcome)
        await refetch();

        try {
          const { data: userRes } = await supabase.auth.getUser();
          const uid = userRes?.user?.id;
          if (uid) {
            const { data: profileRow } = await supabase
              .from("profiles")
              .select("organization_id")
              .eq("id", uid)
              .maybeSingle();

            if (profileRow?.organization_id) {
              const { data: orgRow } = await supabase
                .from("organizations")
                .select("slug")
                .eq("id", profileRow.organization_id)
                .maybeSingle();

              if (orgRow?.slug) {
                navigate(`/${orgRow.slug}/onboarding`, { replace: true });
                return;
              }
            }
          }
        } catch {
          // ignore and fall through to safe default
        }

        // Safe default: stay in-app; RootRedirect will send authed users to /auth if org isn't ready.
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      console.error("Paid signup error:", err);
      toast({
        title: "Registration failed",
        description: err?.message || "Failed to complete signup. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) {
      toast({
        title: "Verification required",
        description: "Please complete the human verification to continue.",
        variant: "destructive"
      });
      return;
    }
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (isLogin) {
        const {
          error
        } = await signIn(email, password);
        if (error) {
          toast({
            title: "Login failed",
            description: error.message,
            variant: "destructive"
          });
        } else if (inviteData) {
          // User logged in with existing account - try to accept invite
          const {
            data: session
          } = await supabase.auth.getSession();
          if (session.session?.user) {
            const {
              data: result,
              error: acceptError
            } = await supabase.rpc("accept_invite", {
              _token: inviteData.token,
              _user_id: session.session.user.id,
              _full_name: "Team Member",
              _job_role: "Team Member",
              _phone_number: ""
            });
            const resultObj = result as {
              success: boolean;
              error?: string;
            } | null;
            if (!acceptError && resultObj?.success) {
              toast({
                title: "Welcome to the team!",
                description: `You've joined ${inviteData.organization.name}`
              });
              await refetch();
            }
          }
        }
      } else {
        if (inviteData) {
          await handleInviteSignUp();
        } else {
          // If we have a Stripe checkout session, finalize signup server-side and then sign in.
          if (sessionId) {
            await handlePaidSignUp();
          } else {
            await handleRegularSignUp();
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state for invite or checkout
  if (inviteLoading || checkoutLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">
            {inviteLoading ? "Loading invitation..." : "Loading your details..."}
          </p>
        </div>
      </div>;
  }

  // Error state for invite
  if (inviteError) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-4">
            <Users className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6">{inviteError}</p>
          <Button onClick={() => navigate("/auth")}>
            Go to Login
          </Button>
        </div>
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            {inviteData ? <Users className="w-8 h-8 text-primary" /> : <ClipboardList className="w-8 h-8 text-primary" />}
          </div>
          {inviteData ? <>
              <h1 className="text-2xl font-bold text-foreground">Join {inviteData.organization.name}</h1>
              <p className="text-muted-foreground mt-2">
                You've been invited to join as a <span className="font-medium capitalize">{inviteData.role}</span>
              </p>
            </> : <>
              <h1 className="text-2xl font-bold text-foreground">Welcome Back!</h1>
              <p className="text-muted-foreground mt-2">
                {isLogin ? "Sign in to continue" : "Create your organization account"}
              </p>
            </>}
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
          {!isLogin && !inviteData && <>
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organisation Name *</Label>
                <Input id="organizationName" placeholder="Enter Organization Name" value={organizationName} onChange={e => setOrganizationName(e.target.value)} required={!isLogin && !inviteData} />
                {errors.organizationName && <p className="text-xs text-destructive">{errors.organizationName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeSize">Employee Size *</Label>
                <Select value={employeeSize} onValueChange={setEmployeeSize} required={!isLogin && !inviteData}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeSizeOptions.map(option => <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.employeeSize && <p className="text-xs text-destructive">{errors.employeeSize}</p>}
              </div>
            </>}

          {!isLogin && <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input id="fullName" placeholder="Enter Your Full Name" value={fullName} onChange={e => setFullName(e.target.value)} required={!isLogin} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobRole">Job Role *</Label>
                <Input id="jobRole" placeholder="Enter Your Job Role" value={jobRole} onChange={e => setJobRole(e.target.value)} required={!isLogin} />
                {errors.jobRole && <p className="text-xs text-destructive">{errors.jobRole}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input id="phoneNumber" type="tel" placeholder="Enter Your Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required={!isLogin} />
                {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber}</p>}
              </div>
            </>}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!inviteData && !isLogin} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password *</Label>
              {isLogin && <button type="button" onClick={async () => {
              if (!email) {
                toast({
                  title: "Email required",
                  description: "Please enter your email address first",
                  variant: "destructive"
                });
                return;
              }
              try {
                const {
                  error
                } = await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/auth`
                });
                if (error) throw error;
                toast({
                  title: "Check your email",
                  description: "We've sent you a password reset link"
                });
              } catch (err: any) {
                toast({
                  title: "Error",
                  description: err.message || "Failed to send reset email",
                  variant: "destructive"
                });
              }
            }} className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>}
            </div>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <MathCaptcha onVerified={setCaptchaVerified} isVerified={captchaVerified} />

          <Button type="submit" className="w-full" disabled={loading || !captchaVerified}>
            {loading ? <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </> : isLogin ? "Sign In" : inviteData ? "Accept Invitation" : "Create Account"}
          </Button>

          
        </form>
      </div>
      <SetPasswordDialog />
    </div>;
};
export default Auth;