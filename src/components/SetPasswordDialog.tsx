import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long");

const SetPasswordDialog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if we need to show the password dialog from URL param
  useEffect(() => {
    const setPasswordParam = searchParams.get("set_password");
    if (setPasswordParam === "true") {
      setIsOpen(true);
    }
  }, [searchParams]);

  // Listen for PASSWORD_RECOVERY event from Supabase Auth (this triggers when user clicks email link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // User clicked the password recovery link - show dialog immediately
        setIsOpen(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle hash fragment from password reset email link
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      // Parse the hash to extract the access token
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      
      if (accessToken) {
        // Set the session from the recovery link tokens
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        }).then(({ error }) => {
          if (!error) {
            // Clear the hash from URL
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
            // Open the password dialog
            setIsOpen(true);
          }
        });
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      toast({
        title: "Password set successfully!",
        description: "You can now access your dashboard.",
      });

      // Remove the query param and close dialog after a short delay
      setTimeout(() => {
        setIsOpen(false);
        // Remove set_password param from URL
        searchParams.delete("set_password");
        setSearchParams(searchParams, { replace: true });
        // Navigate to clean dashboard
        navigate("/", { replace: true });
      }, 1500);
    } catch (err: any) {
      console.error("Error setting password:", err);
      setError(err.message || "Failed to set password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (success) {
      setIsOpen(false);
      searchParams.delete("set_password");
      setSearchParams(searchParams, { replace: true });
    }
    // Don't allow closing without setting password if not successful
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-2 mx-auto">
            {success ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <Lock className="w-6 h-6 text-primary" />
            )}
          </div>
          <DialogTitle className="text-center">
            {success ? "Password Set!" : "Set Your Password"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {success
              ? "Your account is ready. Redirecting to dashboard..."
              : "Create a secure password to complete your account setup."}
          </DialogDescription>
        </DialogHeader>

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="text-xs text-muted-foreground">
              Password must be at least 8 characters long.
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? "Setting password..." : "Set Password"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SetPasswordDialog;
