import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  ArrowLeft,
  Link as LinkIcon,
  Clock,
  Users,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Trash2,
  Gift,
  Hash,
  Calendar,
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useSpecialistPlans } from "@/hooks/useSpecialistPlans";
import { useRegistrationLinks } from "@/hooks/useRegistrationLinks";
import bosplanLogo from "@/assets/bosplan-logo-superadmin.png";
import { format } from "date-fns";
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

const ManageRegistrationLinks = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { plans, loading: plansLoading } = useSpecialistPlans();
  const { links, loading: linksLoading, createLink, toggleLinkStatus, deleteLink, getSignupUrl } = useRegistrationLinks();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<{ name: string; code: string; url: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<string | null>(null);

  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-white text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-slate-400">
              You do not have super admin privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => navigate("/superadmin")}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePlans = plans.filter(p => p.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedPlanId) return;

    setIsSubmitting(true);
    try {
      const link = await createLink({
        plan_id: selectedPlanId,
        name: name.trim(),
        description: description.trim() || undefined,
        max_uses: null, // Always unlimited
        expires_at: expiresAt || null,
      });

      if (link) {
        const url = getSignupUrl(link.referral_code);
        setCreatedLink({ name: link.name, code: link.referral_code, url });
        // Reset form
        setName("");
        setDescription("");
        setSelectedPlanId("");
        setExpiresAt("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, code: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDeleteConfirm = async () => {
    if (linkToDelete) {
      await deleteLink(linkToDelete);
      setLinkToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={bosplanLogo} alt="BosPlan" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-white">Manage Registration Links</h1>
                <p className="text-sm text-slate-400">Create unique signup links for specialist customers</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={() => navigate("/superadmin")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Link Form */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-purple-400" />
                  Create Registration Link
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Generate a unique signup URL connected to a specialist plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Link Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-200">Link Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Partner Onboarding Q1 2026"
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-200">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Internal notes about this link..."
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[60px]"
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Select Plan */}
                  <div className="space-y-2">
                    <Label className="text-slate-200 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-emerald-400" />
                      Specialist Plan *
                    </Label>
                    {plansLoading ? (
                      <div className="text-slate-400 text-sm">Loading plans...</div>
                    ) : activePlans.length === 0 ? (
                      <div className="text-orange-400 text-sm">
                        No active plans available. <Button variant="link" className="text-purple-400 p-0 h-auto" onClick={() => navigate("/superadmin/specialist-plans/create")}>Create one first</Button>
                      </div>
                    ) : (
                      <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                        <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                          <SelectValue placeholder="Select a specialist plan" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {activePlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id} className="text-white hover:bg-slate-700">
                              <div className="flex items-center gap-2">
                                <span>{plan.name}</span>
                                <span className="text-slate-400 text-xs">({plan.duration_months} months)</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Usage Info */}
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Hash className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">Unlimited Usage</p>
                        <p className="text-sm text-slate-400">
                          This link can be used by unlimited organisations with no restrictions
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt" className="text-slate-200 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      Expiry Date (Optional)
                    </Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!name.trim() || !selectedPlanId || isSubmitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Link...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Create Registration Link
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Success Message */}
            {createdLink && (
              <Card className="mt-6 bg-purple-500/10 border-purple-500/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Link Created Successfully!
                      </h3>
                      <p className="text-slate-300 mb-3">
                        "{createdLink.name}" is ready to share:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-3">
                          <code className="text-sm font-mono text-purple-400 flex-1 truncate">
                            {createdLink.url}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(createdLink.url, createdLink.code)}
                            className="text-slate-400 hover:text-white flex-shrink-0"
                          >
                            {copiedCode === createdLink.code ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">
                          Referral Code: <code className="text-purple-400">{createdLink.code}</code>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Existing Links */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Existing Registration Links</CardTitle>
                <CardDescription className="text-slate-400">
                  {links.length} registration link{links.length !== 1 ? "s" : ""} created
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                {linksLoading ? (
                  <div className="text-center text-slate-400 py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </div>
                ) : links.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    No registration links created yet
                  </div>
                ) : (
                  links.map((link) => (
                    <div
                      key={link.id}
                      className="bg-slate-700/30 rounded-lg p-4 border border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-white text-sm block truncate">
                            {link.name}
                          </span>
                          {link.description && (
                            <p className="text-xs text-slate-400 mt-1 truncate">{link.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant={link.is_active ? "default" : "secondary"}
                            className={link.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-600 text-slate-400"}
                          >
                            {link.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Switch
                            checked={link.is_active}
                            onCheckedChange={(checked) => toggleLinkStatus(link.id, checked)}
                            className="scale-75"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <Gift className="w-3 h-3" />
                        <span className="truncate">{link.plan?.name || "Unknown plan"}</span>
                        <span className="text-slate-600">•</span>
                        <Clock className="w-3 h-3" />
                        {link.plan?.duration_months} months
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <Users className="w-3 h-3" />
                        {link.current_uses} / {link.max_uses || "∞"} uses
                        {link.expires_at && (
                          <>
                            <span className="text-slate-600">•</span>
                            <Calendar className="w-3 h-3" />
                            Expires {format(new Date(link.expires_at), "MMM d, yyyy")}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 bg-slate-800/50 rounded p-2">
                        <code className="text-xs text-purple-400 flex-1 truncate">
                          {getSignupUrl(link.referral_code)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getSignupUrl(link.referral_code), link.referral_code)}
                          className="text-slate-400 hover:text-white h-6 w-6 p-0"
                        >
                          {copiedCode === link.referral_code ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(getSignupUrl(link.referral_code), "_blank")}
                          className="text-slate-400 hover:text-white h-6 w-6 p-0"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLinkToDelete(link.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-red-400 hover:text-red-300 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="mt-4 bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <h4 className="font-medium text-blue-400 mb-2">How it works</h4>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">1.</span>
                    Select a specialist plan for free access
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">2.</span>
                    A unique signup URL is generated
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">3.</span>
                    Share the URL with your specialist customer
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">4.</span>
                    They sign up and get instant access (no payment)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Registration Link?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. The signup URL will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageRegistrationLinks;
