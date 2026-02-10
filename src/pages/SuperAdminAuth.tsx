import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, AlertCircle, ArrowLeft, Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";

type AuthStep = "credentials" | "otp" | "forgot-password" | "reset-sent";

const SuperAdminAuth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<AuthStep>("credentials");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first OTP input when entering OTP step
  useEffect(() => {
    if (authStep === "otp" && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [authStep]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only keep last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pastedData.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData.user) {
        throw new Error("Login failed");
      }

      // Check if user has super_admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .eq("role", "super_admin")
        .limit(1);

      if (roleError) {
        throw new Error("Failed to verify permissions");
      }

      if (!roleData || roleData.length === 0) {
        // Sign out if not a super admin
        await supabase.auth.signOut();
        throw new Error("Access denied. Super admin privileges required.");
      }

      // Store user id for OTP verification
      setPendingUserId(authData.user.id);

      // Send OTP email
      const response = await supabase.functions.invoke("superadmin-send-otp", {
        body: { user_id: authData.user.id, email: authData.user.email },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send verification code");
      }

      // Sign out temporarily - user needs to verify OTP first
      await supabase.auth.signOut();

      toast.success("Verification code sent to your email");
      setAuthStep("otp");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      toast.error(message);
      // Ensure we're signed out if anything failed
      await supabase.auth.signOut();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      setIsLoading(false);
      return;
    }

    try {
      // Verify OTP
      const response = await supabase.functions.invoke("superadmin-verify-otp", {
        body: { user_id: pendingUserId, otp_code: otpCode },
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.data?.error || response.error?.message || "Invalid verification code");
      }

      // OTP verified - now sign in again
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error("Authentication failed. Please try again.");
      }

      toast.success("Welcome, Super Admin!");
      navigate("/superadmin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingUserId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke("superadmin-send-otp", {
        body: { user_id: pendingUserId, email },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send verification code");
      }

      setOtp(["", "", "", "", "", ""]);
      toast.success("New verification code sent");
      otpRefs.current[0]?.focus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to resend code";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!email.trim()) {
        throw new Error("Please enter your email address");
      }

      const response = await supabase.functions.invoke("superadmin-password-reset", {
        body: { email: email.trim() },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send reset email");
      }

      setAuthStep("reset-sent");
      toast.success("Password reset email sent!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send reset email";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setAuthStep("credentials");
    setError(null);
    setOtp(["", "", "", "", "", ""]);
    setPendingUserId(null);
  };

  const renderCredentialsForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-slate-300">Password</Label>
          <button
            type="button"
            onClick={() => setAuthStep("forgot-password")}
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
        />
      </div>
      
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Authenticating...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Continue
          </>
        )}
      </Button>
    </form>
  );

  const renderOtpForm = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-orange-400" />
        </div>
        <p className="text-slate-400 text-sm">
          Enter the 6-digit code sent to<br />
          <span className="text-white font-medium">{email}</span>
        </p>
      </div>
      
      <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => { otpRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-mono bg-slate-700/50 border-slate-600 text-white focus:border-orange-500 focus:ring-orange-500/20"
          />
        ))}
      </div>
      
      <Button
        type="submit"
        disabled={isLoading || otp.join("").length !== 6}
        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Verify & Access Dashboard
          </>
        )}
      </Button>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={handleResendOtp}
          disabled={isLoading}
          className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50"
        >
          <Mail className="w-4 h-4 mr-2" />
          Resend Code
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={handleBackToLogin}
          className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Button>
      </div>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="reset-email" className="text-slate-300">Email Address</Label>
        <Input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          required
          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-orange-500 focus:ring-orange-500/20"
        />
      </div>
      
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            Send Reset Link
          </>
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={handleBackToLogin}
        className="w-full text-slate-400 hover:text-white hover:bg-slate-700/50"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Login
      </Button>
    </form>
  );

  const renderResetSent = () => (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
          <Mail className="w-6 h-6 text-green-500" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-white font-medium">Check your inbox</p>
          <p className="text-slate-400 text-sm">
            If an account exists for {email}, you'll receive a password reset link shortly.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={handleBackToLogin}
        className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Login
      </Button>
    </div>
  );

  const getTitle = () => {
    switch (authStep) {
      case "otp":
        return "Verify Your Identity";
      case "forgot-password":
        return "Reset Password";
      case "reset-sent":
        return "Email Sent";
      default:
        return "Super Admin";
    }
  };

  const getDescription = () => {
    switch (authStep) {
      case "otp":
        return "Two-factor authentication required";
      case "forgot-password":
        return "Enter your email to receive a reset link";
      case "reset-sent":
        return "Check your email for instructions";
      default:
        return "Restricted access. Authorised personnel only.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {getDescription()}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {authStep === "credentials" && renderCredentialsForm()}
          {authStep === "otp" && renderOtpForm()}
          {authStep === "forgot-password" && renderForgotPasswordForm()}
          {authStep === "reset-sent" && renderResetSent()}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminAuth;
