import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Loader2, Clock, Users, Shield, CheckCircle2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import MathCaptcha from "@/components/MathCaptcha";
import bosplanLogo from "@/assets/bosplan-logo.png";

const employeeSizeOptions = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "500+", label: "500+ employees" },
];

const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  organizationName: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100),
  employeeSize: z.string().min(1, "Please select employee size"),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  jobRole: z.string().trim().min(2, "Job role must be at least 2 characters").max(100),
  phoneNumber: z.string().trim().min(7, "Phone number must be at least 7 digits").max(20),
});

interface PlanInfo {
  link_id: string;
  plan_id: string;
  plan_name: string;
  plan_duration_months: number;
  plan_max_users: number | null;
  plan_terms: string | null;
  is_valid: boolean;
  error_message: string | null;
}

const SpecialistSignup = () => {
  const { referralCode } = useParams<{ referralCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [employeeSize, setEmployeeSize] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const validateCode = async () => {
      if (!referralCode) {
        setError("No referral code provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc("validate_referral_code", {
          code: referralCode,
        });

        if (rpcError) throw rpcError;

        const result = Array.isArray(data) ? data[0] : data;
        
        if (!result || !result.is_valid) {
          setError(result?.error_message || "Invalid referral code");
          setPlanInfo(null);
        } else {
          setPlanInfo(result);
          setError(null);
        }
      } catch (err: any) {
        console.error("Error validating referral code:", err);
        setError("Failed to validate referral code");
      } finally {
        setLoading(false);
      }
    };

    validateCode();
  }, [referralCode]);

  const validateForm = () => {
    try {
      signUpSchema.parse({
        email,
        password,
        organizationName,
        employeeSize,
        fullName,
        jobRole,
        phoneNumber,
      });
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaVerified) {
      toast({
        title: "Verification required",
        description: "Please complete the human verification to continue.",
        variant: "destructive",
      });
      return;
    }

    if (planInfo?.plan_terms && !agreedToTerms) {
      toast({
        title: "Terms required",
        description: "Please agree to the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Sign up user
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: authError.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (authData.user && authData.session) {
        // Complete specialist signup
        const { data: result, error: signupError } = await supabase.rpc("complete_specialist_signup", {
          _user_id: authData.user.id,
          _referral_code: referralCode!,
          _org_name: organizationName.trim(),
          _employee_size: employeeSize,
          _full_name: fullName.trim(),
          _job_role: jobRole.trim(),
          _phone_number: phoneNumber.trim(),
        });

        const resultObj = result as { success: boolean; error?: string; organization_id?: string; plan_name?: string; expires_at?: string } | null;

        if (signupError || !resultObj?.success) {
          toast({
            title: "Registration failed",
            description: resultObj?.error || signupError?.message || "Failed to complete registration",
            variant: "destructive",
          });
          return;
        }

        // Send welcome email (fire and forget)
        supabase.functions.invoke("send-welcome-email", {
          body: {
            organizationName: organizationName.trim(),
            fullName: fullName.trim(),
          },
        }).catch((err) => console.error("Welcome email error:", err));

        toast({
          title: "Welcome to BosPlan!",
          description: `Your organization has been created with ${planInfo?.plan_duration_months} months of free access.`,
        });

        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Validating your registration link...</p>
        </div>
      </div>
    );
  }

  if (error || !planInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Invalid Registration Link</CardTitle>
            <CardDescription>{error || "This link is no longer valid"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={bosplanLogo} alt="BosPlan" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Specialist Registration</h1>
          <p className="text-muted-foreground mt-2">
            You've been invited to join BosPlan with special access
          </p>
        </div>

        {/* Plan Info Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{planInfo.plan_name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {planInfo.plan_duration_months} months free
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {planInfo.plan_max_users ? `${planInfo.plan_max_users} users` : "Unlimited users"}
                  </span>
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Signup Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>Fill in your details to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name *</Label>
                <Input
                  id="organizationName"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Your company name"
                  className={errors.organizationName ? "border-destructive" : ""}
                />
                {errors.organizationName && <p className="text-sm text-destructive">{errors.organizationName}</p>}
              </div>

              {/* Employee Size */}
              <div className="space-y-2">
                <Label>Employee Size *</Label>
                <Select value={employeeSize} onValueChange={setEmployeeSize}>
                  <SelectTrigger className={errors.employeeSize ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeSizeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employeeSize && <p className="text-sm text-destructive">{errors.employeeSize}</p>}
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className={errors.fullName ? "border-destructive" : ""}
                />
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>

              {/* Job Role */}
              <div className="space-y-2">
                <Label htmlFor="jobRole">Job Role *</Label>
                <Input
                  id="jobRole"
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  placeholder="e.g., CEO, Manager"
                  className={errors.jobRole ? "border-destructive" : ""}
                />
                {errors.jobRole && <p className="text-sm text-destructive">{errors.jobRole}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className={errors.phoneNumber ? "border-destructive" : ""}
                />
                {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber}</p>}
              </div>

              {/* Terms */}
              {planInfo.plan_terms && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="text-sm text-foreground font-medium">Terms and Conditions</div>
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {planInfo.plan_terms}
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-border">
                    <Checkbox
                      id="terms"
                      checked={agreedToTerms}
                      onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                    />
                    <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I have read and agree to the above terms and conditions
                    </Label>
                  </div>
                </div>
              )}

              {/* Captcha */}
              <MathCaptcha onVerified={setCaptchaVerified} isVerified={captchaVerified} />

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                  Sign in
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpecialistSignup;
