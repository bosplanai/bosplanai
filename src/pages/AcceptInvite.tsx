import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, User, Eye, CheckCircle2, XCircle, Mail, Building2 } from "lucide-react";
import { z } from "zod";
import bosplanLogo from "@/assets/bosplan-logo.png";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters");

interface InviteData {
  id: string;
  email: string;
  role: string;
  organization_id: string;
  token: string;
  expires_at: string;
  status: string;
  org_name: string;
  org_slug: string;
  invited_by_name: string | null;
}

const roleConfig: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  admin: {
    label: "Full Access",
    icon: <Shield className="w-5 h-5 text-primary" />,
    description: "Full platform access including user management, all boards, and settings"
  },
  member: {
    label: "Manager",
    icon: <User className="w-5 h-5 text-primary" />,
    description: "Can create and manage tasks on the Product Management board and access tools"
  },
  viewer: {
    label: "Team",
    icon: <Eye className="w-5 h-5 text-muted-foreground" />,
    description: "Can view and complete assigned tasks, access Data Room and Drive"
  }
};

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [allPendingInvites, setAllPendingInvites] = useState<InviteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError("No invitation token provided");
        setLoading(false);
        return;
      }

      try {
        // Get the specific invite by token
        const { data, error: rpcError } = await supabase.rpc("get_invite_by_token", {
          _token: token
        });

        if (rpcError) throw rpcError;

        const inviteRow = Array.isArray(data) ? data[0] : data;
        
        if (!inviteRow) {
          setError("This invitation is invalid, has expired, or has already been used.");
          setLoading(false);
          return;
        }

        setInviteData(inviteRow as InviteData);

        // Get all pending invites for this email to show multi-org summary
        const { data: allInvites } = await supabase.rpc("get_pending_invites_by_email", {
          _email: inviteRow.email
        });

        if (allInvites && Array.isArray(allInvites)) {
          setAllPendingInvites(allInvites as InviteData[]);
        } else {
          setAllPendingInvites([inviteRow as InviteData]);
        }
      } catch (err: any) {
        console.error("Error fetching invite:", err);
        setError("Failed to load invitation. Please try again or contact support.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }

    if (!jobRole.trim()) {
      errors.jobRole = "Job role is required";
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    } else if (phoneNumber.trim().length < 7) {
      errors.phoneNumber = "Phone number must be at least 7 digits";
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      errors.password = passwordResult.error.errors[0].message;
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !inviteData || !token) return;

    setSubmitting(true);

    let stage: "create_user" | "sign_in" | "accept_invite" = "create_user";

    try {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      // Create the user via Admin API edge function
      const { data: createData, error: createError } = await supabase.functions.invoke("create-invited-user", {
        body: {
          email: inviteData.email,
          password,
          inviteToken: token
        }
      });

      let responseBody: any = createData;
      if (createError) {
        const ctxBody = (createError as any)?.context?.body;
        if (typeof ctxBody === "string") {
          try {
            responseBody = JSON.parse(ctxBody);
          } catch {
            // keep fallback
          }
        } else if (ctxBody && typeof ctxBody === "object") {
          responseBody = ctxBody;
        }
      }

      // Handle case where user already exists - redirect to login
      if (responseBody?.code === "USER_EXISTS" || (createError as any)?.context?.status === 409) {
        toast({
          title: "Account already exists",
          description: "Please sign in with your existing password to join this organization.",
        });
        navigate(
          `/auth?mode=login&email=${encodeURIComponent(inviteData.email)}&invite=${token}&returnUrl=${encodeURIComponent(
            `/${inviteData.org_slug}`
          )}`
        );
        return;
      }

      if (responseBody && responseBody.success === false) {
        const message =
          responseBody?.error ||
          (responseBody?.code === "INVITE_INVALID"
            ? "This invitation is invalid, has expired, or has already been used."
            : "Failed to create your account. Please try again.");

        toast({
          title: "Unable to continue",
          description: message,
          variant: "destructive",
        });
        if (responseBody?.code === "INVITE_INVALID") {
          setError(message);
        }
        return;
      }

      if (createError && !responseBody?.success) {
        console.error("Error creating user:", createError);
        throw new Error(
          responseBody?.error ||
            createError.message ||
            "Failed to create your account. Please try again."
        );
      }

      if (!responseBody?.success || !responseBody?.userId) {
        throw new Error(responseBody?.error || "Failed to create user account");
      }

      const userId = responseBody.userId;

      // Sign the user in
      stage = "sign_in";
      let signInData: any = null;
      let signInError: any = null;
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const res = await supabase.auth.signInWithPassword({
          email: inviteData.email,
          password,
        });
        signInData = res.data;
        signInError = res.error;
        if (!signInError && signInData?.session) break;
        await sleep(300 * attempt);
      }
      
      if (signInError) {
        console.error("Sign-in error after user creation:", signInError);
        throw signInError;
      }

      if (!signInData.session) {
        throw new Error("Failed to establish session");
      }

      // Accept all pending invites for this user
      stage = "accept_invite";
      
      if (allPendingInvites.length > 1) {
        // Accept all pending invites
        const { data: result, error: acceptError } = await supabase.rpc("accept_all_pending_invites", {
          _user_id: userId,
          _email: inviteData.email
        });

        const resultObj = result as {
          success: boolean;
          accepted_count?: number;
          first_org_slug?: string;
        } | null;

        if (acceptError || !resultObj?.success) {
          throw new Error(acceptError?.message || "Failed to accept invitations");
        }

        toast({
          title: "Welcome to the team!",
          description: `You've joined ${resultObj.accepted_count} organization${resultObj.accepted_count !== 1 ? 's' : ''}. Use the organization switcher to navigate between them.`
        });

        // Redirect to first org
        navigate(`/${resultObj.first_org_slug || inviteData.org_slug}`);
      } else {
        // Accept single invite
        const { data: result, error: acceptError } = await supabase.rpc("accept_invite", {
          _token: token,
          _user_id: userId,
          _full_name: fullName.trim(),
          _job_role: jobRole.trim(),
          _phone_number: phoneNumber.trim()
        });

        const resultObj = result as {
          success: boolean;
          error?: string;
          organization_slug?: string;
          organization_name?: string;
          role?: string;
        } | null;

        if (acceptError || !resultObj?.success) {
          throw new Error(resultObj?.error || acceptError?.message || "Failed to accept invitation");
        }

        toast({
          title: "Welcome to the team!",
          description: `You've joined ${inviteData.org_name} as ${roleConfig[inviteData.role]?.label || inviteData.role}`
        });

        navigate(`/${inviteData.org_slug}`);
      }
    } catch (err: any) {
      console.error("Error accepting invite:", err);
      toast({
        title: "Failed to complete registration",
        description: `(${stage}) ${err?.message || "An error occurred. Please try again."}`,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="w-16 h-16 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{error || "This invitation link is no longer valid."}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/auth")} variant="outline">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleInfo = roleConfig[inviteData.role] || roleConfig.viewer;
  const hasMultipleInvites = allPendingInvites.length > 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <img 
            src={bosplanLogo} 
            alt="BosPlan" 
            className="h-10 mx-auto"
          />
          <div className="space-y-2">
            <CardTitle className="text-2xl">You're Invited! 🎉</CardTitle>
            <CardDescription className="text-base">
              {inviteData.invited_by_name ? (
                <>{inviteData.invited_by_name} has invited you to join</>
              ) : (
                <>You've been invited to join</>
              )}
            </CardDescription>
          </div>
          
          {/* Organization info - show multi-org table if multiple invites */}
          {hasMultipleInvites ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">You're invited to join {allPendingInvites.length} organizations:</p>
              <div className="space-y-2">
                {allPendingInvites.map((invite) => {
                  const inviteRoleInfo = roleConfig[invite.role] || roleConfig.viewer;
                  return (
                    <div 
                      key={invite.id} 
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <span className="font-medium">{invite.org_name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {inviteRoleInfo.icon}
                        <span>{inviteRoleInfo.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2 border-t">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{inviteData.email}</span>
              </div>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="font-semibold text-lg">{inviteData.org_name}</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span className="text-sm">{inviteData.email}</span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 border-t">
                {roleInfo.icon}
                <div className="text-left">
                  <p className="font-medium">{roleInfo.label}</p>
                  <p className="text-xs text-muted-foreground">{roleInfo.description}</p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                disabled={submitting}
              />
              {formErrors.fullName && (
                <p className="text-sm text-destructive">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobRole">Job Role *</Label>
              <Input
                id="jobRole"
                value={jobRole}
                onChange={(e) => setJobRole(e.target.value)}
                placeholder="e.g. Project Manager"
                disabled={submitting}
              />
              {formErrors.jobRole && (
                <p className="text-sm text-destructive">{formErrors.jobRole}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={submitting}
              />
              {formErrors.phoneNumber && (
                <p className="text-sm text-destructive">{formErrors.phoneNumber}</p>
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">Create your login password</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    disabled={submitting}
                  />
                  {formErrors.password && (
                    <p className="text-sm text-destructive">{formErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    disabled={submitting}
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-sm text-destructive">{formErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={submitting}
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Accept Invitation{hasMultipleInvites ? 's' : ''} & Create Account
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Already have an account?{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs"
                onClick={() => navigate(`/auth?mode=login&email=${encodeURIComponent(inviteData.email)}&invite=${token}`)}
                type="button"
              >
                Sign in instead
              </Button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
