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

    try {
      // Create the user account with the password
      // Use data.email_confirm to auto-confirm invited users (no second email verification needed)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            email_confirmed: true, // Mark as pre-confirmed for invited users
          }
        }
      });

      if (signUpError) {
        // If user already exists, try to sign them in
        if (signUpError.message.includes("already registered")) {
          toast({
            title: "Account already exists",
            description: "Please sign in with your existing password to join this organization.",
            variant: "destructive"
          });
          navigate(`/auth?mode=login&email=${encodeURIComponent(inviteData.email)}&invite=${token}`);
          return;
        }
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // If no session was returned (email confirmation required by Supabase settings),
      // sign the user in directly since invited users don't need email confirmation
      let activeSession = authData.session;
      if (!activeSession) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: inviteData.email,
          password,
        });
        
        if (signInError) {
          // If sign-in fails due to email not confirmed, the Supabase project has
          // "Confirm email" enabled. For invited users, we need to work around this.
          if (signInError.message.includes("Email not confirmed")) {
            toast({
              title: "Email confirmation required",
              description: "Please ask your administrator to disable email confirmation for invites, or check your email.",
              variant: "destructive"
            });
            navigate("/auth?mode=login");
            return;
          }
          throw signInError;
        }
        activeSession = signInData.session;
      }

      if (!activeSession) {
        throw new Error("Failed to establish session");
      }

      // Accept the invite using the database function
      const { data: result, error: acceptError } = await supabase.rpc("accept_invite", {
        _token: token,
        _user_id: authData.user.id,
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

      // Send welcome email (fire and forget)
      supabase.functions.invoke("send-welcome-email", {
        body: {
          organizationName: inviteData.org_name,
          fullName: fullName.trim()
        }
      }).catch(err => console.error("Welcome email error:", err));

      toast({
        title: "Welcome to the team!",
        description: `You've joined ${inviteData.org_name} as ${roleConfig[inviteData.role]?.label || inviteData.role}`
      });

      // User is already authenticated - redirect directly to their dashboard/tasks page
      navigate(`/${inviteData.org_slug}/tasks`);
    } catch (err: any) {
      console.error("Error accepting invite:", err);
      toast({
        title: "Failed to complete registration",
        description: err.message || "An error occurred. Please try again.",
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
            <CardTitle className="text-2xl">You're Invited!</CardTitle>
            <CardDescription className="text-base">
              {inviteData.invited_by_name ? (
                <>{inviteData.invited_by_name} has invited you to join</>
              ) : (
                <>You've been invited to join</>
              )}
            </CardDescription>
          </div>
          
          {/* Organization info */}
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
                  Accept Invitation & Create Account
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