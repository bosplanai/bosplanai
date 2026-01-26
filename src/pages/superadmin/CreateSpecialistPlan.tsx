import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  ArrowLeft,
  Gift,
  Clock,
  Users,
  FileText,
  Copy,
  Check,
  Loader2,
  Infinity,
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useSpecialistPlans } from "@/hooks/useSpecialistPlans";
import bosplanLogo from "@/assets/bosplan-logo-superadmin.png";

const CreateSpecialistPlan = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { createPlan, plans, loading: plansLoading } = useSpecialistPlans();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMonths, setDurationMonths] = useState<"6" | "12" | "18">("12");
  const [unlimitedUsers, setUnlimitedUsers] = useState(true);
  const [maxUsers, setMaxUsers] = useState<string>("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPlan, setCreatedPlan] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const plan = await createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
        duration_months: parseInt(durationMonths) as 6 | 12 | 18,
        max_users: unlimitedUsers ? null : (maxUsers ? parseInt(maxUsers) : null),
        terms_and_conditions: termsAndConditions.trim() || undefined,
      });

      if (plan) {
        setCreatedPlan({ name: plan.name, code: plan.registration_code });
        // Reset form
        setName("");
        setDescription("");
        setDurationMonths("12");
        setUnlimitedUsers(true);
        setMaxUsers("");
        setTermsAndConditions("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    if (createdPlan) {
      navigator.clipboard.writeText(createdPlan.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={bosplanLogo} alt="BosPlan" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-white">Create Specialist Plan</h1>
                <p className="text-sm text-slate-400">Set up free access plans for specialist customers</p>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-400" />
                  Plan Details
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Create a specialist plan that allows customers to bypass paid subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Plan Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-200">Plan Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Partner Program 2026"
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
                      placeholder="Brief description of this specialist plan..."
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
                    />
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Duration */}
                  <div className="space-y-3">
                    <Label className="text-slate-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Free Access Duration *
                    </Label>
                    <RadioGroup
                      value={durationMonths}
                      onValueChange={(val) => setDurationMonths(val as "6" | "12" | "18")}
                      className="grid grid-cols-3 gap-4"
                    >
                      {[
                        { value: "6", label: "6 Months" },
                        { value: "12", label: "12 Months" },
                        { value: "18", label: "18 Months" },
                      ].map((option) => (
                        <div key={option.value} className="relative">
                          <RadioGroupItem
                            value={option.value}
                            id={`duration-${option.value}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`duration-${option.value}`}
                            className="flex flex-col items-center justify-center rounded-lg border-2 border-slate-600 bg-slate-700/30 p-4 hover:bg-slate-700/50 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-500/10 cursor-pointer transition-all"
                          >
                            <span className="text-xl font-bold text-white">{option.value}</span>
                            <span className="text-sm text-slate-400">Months</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* User Limit */}
                  <div className="space-y-4">
                    <Label className="text-slate-200 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      User Limit
                    </Label>
                    <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-4 border border-slate-600">
                      <div className="flex items-center gap-3">
                        <Infinity className="w-5 h-5 text-emerald-400" />
                        <div>
                          <p className="text-white font-medium">Unlimited Users</p>
                          <p className="text-sm text-slate-400">No restriction on team size</p>
                        </div>
                      </div>
                      <Switch
                        checked={unlimitedUsers}
                        onCheckedChange={setUnlimitedUsers}
                      />
                    </div>
                    {!unlimitedUsers && (
                      <div className="space-y-2">
                        <Label htmlFor="maxUsers" className="text-slate-200">Maximum Users</Label>
                        <Input
                          id="maxUsers"
                          type="number"
                          min="1"
                          value={maxUsers}
                          onChange={(e) => setMaxUsers(e.target.value)}
                          placeholder="Enter maximum number of users"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                    )}
                  </div>

                  <Separator className="bg-slate-700" />

                  {/* Terms and Conditions */}
                  <div className="space-y-2">
                    <Label htmlFor="terms" className="text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-400" />
                      Terms and Conditions
                    </Label>
                    <Textarea
                      id="terms"
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      placeholder="Enter any specific terms and conditions for this plan..."
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[120px]"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!name.trim() || isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Plan...
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 mr-2" />
                        Create Specialist Plan
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Success Message */}
            {createdPlan && (
              <Card className="mt-6 bg-emerald-500/10 border-emerald-500/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Plan Created Successfully!
                      </h3>
                      <p className="text-slate-300 mb-3">
                        "{createdPlan.name}" has been created. Share the registration code with your specialist customer:
                      </p>
                      <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-3">
                        <code className="text-lg font-mono text-emerald-400 flex-1">
                          {createdPlan.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={copyToClipboard}
                          className="text-slate-400 hover:text-white"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Existing Plans */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Existing Plans</CardTitle>
                <CardDescription className="text-slate-400">
                  {plans.length} specialist plan{plans.length !== 1 ? "s" : ""} created
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {plansLoading ? (
                  <div className="text-center text-slate-400 py-4">Loading...</div>
                ) : plans.length === 0 ? (
                  <div className="text-center text-slate-500 py-4">
                    No plans created yet
                  </div>
                ) : (
                  plans.slice(0, 5).map((plan) => (
                    <div
                      key={plan.id}
                      className="bg-slate-700/30 rounded-lg p-3 border border-slate-600"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-sm truncate">
                          {plan.name}
                        </span>
                        <Badge
                          variant={plan.is_active ? "default" : "secondary"}
                          className={plan.is_active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
                        >
                          {plan.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {plan.duration_months} months
                        <span className="text-slate-600">•</span>
                        <Users className="w-3 h-3" />
                        {plan.max_users ? `${plan.max_users} users` : "Unlimited"}
                      </div>
                      <code className="text-xs text-slate-500 mt-1 block">
                        {plan.registration_code}
                      </code>
                    </div>
                  ))
                )}
                {plans.length > 5 && (
                  <p className="text-center text-sm text-slate-500">
                    +{plans.length - 5} more plan{plans.length - 5 !== 1 ? "s" : ""}
                  </p>
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
                    Create a specialist plan with desired duration
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">2.</span>
                    Share the registration code with your customer
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">3.</span>
                    Customer uses code during signup to get free access
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">4.</span>
                    No payment required during the plan period
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateSpecialistPlan;
