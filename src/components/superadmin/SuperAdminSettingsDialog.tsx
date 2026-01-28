import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Mail, Lock, Eye, EyeOff, FileText, Loader2, MessageSquare, Trash2, Building2, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FeedbackEntry {
  id: string;
  created_at: string;
  name: string;
  organisation: string;
  email: string;
  feedback: string;
}

interface SuperAdminSettingsDialogProps {
  currentEmail: string;
}

const SuperAdminSettingsDialog = ({ currentEmail }: SuperAdminSettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Terms and Conditions state
  const [termsContent, setTermsContent] = useState("");
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsSaving, setTermsSaving] = useState(false);

  // Privacy Policy state
  const [privacyContent, setPrivacyContent] = useState("");
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);

  // User Feedback state
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTermsContent();
      fetchPrivacyContent();
      fetchFeedbackEntries();
    }
  }, [open]);

  const fetchFeedbackEntries = async () => {
    setFeedbackLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_usage_logs")
        .select("id, created_at, page_path")
        .eq("feature_name", "beta_feedback")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsedEntries: FeedbackEntry[] = (data || []).map((entry) => {
        let parsed = { name: "", organisation: "", email: "", feedback: "" };
        try {
          if (entry.page_path) {
            parsed = JSON.parse(entry.page_path);
          }
        } catch {
          // Invalid JSON, use defaults
        }
        return {
          id: entry.id,
          created_at: entry.created_at,
          name: parsed.name || "Unknown",
          organisation: parsed.organisation || "N/A",
          email: parsed.email || "N/A",
          feedback: parsed.feedback || "No feedback provided",
        };
      });

      setFeedbackEntries(parsedEntries);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback entries");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("feature_usage_logs")
        .delete()
        .eq("id", feedbackToDelete);

      if (error) throw error;

      setFeedbackEntries((prev) => prev.filter((f) => f.id !== feedbackToDelete));
      toast.success("Feedback entry deleted");
    } catch (error: any) {
      toast.error("Failed to delete feedback entry");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    }
  };

  const fetchTermsContent = async () => {
    setTermsLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "terms_and_conditions")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setTermsContent(data?.setting_value || "");
    } catch (error: any) {
      console.error("Error fetching terms:", error);
    } finally {
      setTermsLoading(false);
    }
  };

  const fetchPrivacyContent = async () => {
    setPrivacyLoading(true);
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "privacy_policy")
        .single();

      if (error && error.code !== "PGRST116") throw error;
      setPrivacyContent(data?.setting_value || "");
    } catch (error: any) {
      console.error("Error fetching privacy policy:", error);
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleTermsSave = async () => {
    setTermsSaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { 
            setting_key: "terms_and_conditions", 
            setting_value: termsContent,
            updated_at: new Date().toISOString()
          },
          { onConflict: "setting_key" }
        );

      if (error) throw error;
      toast.success("Terms and conditions saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save terms and conditions");
    } finally {
      setTermsSaving(false);
    }
  };

  const handlePrivacySave = async () => {
    setPrivacySaving(true);
    try {
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { 
            setting_key: "privacy_policy", 
            setting_value: privacyContent,
            updated_at: new Date().toISOString()
          },
          { onConflict: "setting_key" }
        );

      if (error) throw error;
      toast.success("Privacy policy saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save privacy policy");
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!newEmail.trim()) {
      toast.error("Please enter a new email address");
      return;
    }

    if (newEmail === currentEmail) {
      toast.error("New email must be different from current email");
      return;
    }

    setEmailLoading(true);
    try {
      // Use edge function to bypass rate limits
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("update-super-admin-email", {
        body: { newEmail: newEmail.trim() },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to update email");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success("Email updated successfully!");
      setNewEmail("");
      
      // Refresh the session to get the updated email
      await supabase.auth.refreshSession();
    } catch (error: any) {
      toast.error(error.message || "Failed to update email");
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-white">Super Admin Settings</DialogTitle>
          <DialogDescription className="text-slate-400">
            Manage your account and platform settings
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 mt-4">
            {/* Terms and Conditions Section */}
            <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FileText className="w-4 h-4" />
                General Terms and Conditions
              </div>
              <p className="text-xs text-slate-400">
                This content will be displayed on the public /terms-and-conditions page.
              </p>
              {termsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <Textarea
                    value={termsContent}
                    onChange={(e) => setTermsContent(e.target.value)}
                    placeholder="Enter your terms and conditions here..."
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 min-h-[200px] resize-y"
                  />
                  <Button
                    onClick={handleTermsSave}
                    disabled={termsSaving}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {termsSaving ? "Saving..." : "Save Terms and Conditions"}
                  </Button>
                </>
              )}
            </div>

            {/* Privacy Policy Section */}
            <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FileText className="w-4 h-4" />
                Privacy Policy
              </div>
              <p className="text-xs text-slate-400">
                This content will be displayed on the public /privacy-policy page.
              </p>
              {privacyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <>
                  <Textarea
                    value={privacyContent}
                    onChange={(e) => setPrivacyContent(e.target.value)}
                    placeholder="Enter your privacy policy here..."
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 min-h-[200px] resize-y"
                  />
                  <Button
                    onClick={handlePrivacySave}
                    disabled={privacySaving}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {privacySaving ? "Saving..." : "Save Privacy Policy"}
                  </Button>
                </>
              )}
            </div>

            {/* Email Update Section */}
            <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Mail className="w-4 h-4" />
                Update Email
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 text-xs">Current Email</Label>
                <Input
                  value={currentEmail}
                  disabled
                  className="bg-slate-700/50 border-slate-600 text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">New Email</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter new email address"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                onClick={handleEmailUpdate}
                disabled={emailLoading || !newEmail.trim()}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {emailLoading ? "Updating..." : "Update Email"}
              </Button>
            </div>

            {/* Password Update Section */}
            <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Lock className="w-4 h-4" />
                Update Password
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                onClick={handlePasswordUpdate}
                disabled={passwordLoading || !newPassword || !confirmPassword}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                {passwordLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>

            {/* User Feedback Section */}
            <div className="space-y-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <MessageSquare className="w-4 h-4" />
                  User Feedback
                </div>
                <span className="text-xs text-slate-400">
                  {feedbackEntries.length} submission{feedbackEntries.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Beta testing feedback submissions from users.
              </p>
              
              {feedbackLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : feedbackEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No feedback submissions yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {feedbackEntries.map((entry) => (
                    <Card key={entry.id} className="bg-slate-700/50 border-slate-600 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <User className="w-3.5 h-3.5" />
                              <span className="font-medium">{entry.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>{entry.organisation}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Mail className="w-3 h-3" />
                            <a href={`mailto:${entry.email}`} className="hover:text-amber-400 transition-colors">
                              {entry.email}
                            </a>
                          </div>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap mt-2 bg-slate-800/50 p-2 rounded">
                            {entry.feedback}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm")}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                          onClick={() => {
                            setFeedbackToDelete(entry.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Feedback</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this feedback entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFeedback}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};

export default SuperAdminSettingsDialog;
