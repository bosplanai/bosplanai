import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Check, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import WelcomeHeader from "@/components/WelcomeHeader";

const PRICING = {
  monthly: {
    basePrice: 60,
    extraUserPrice: 6,
    label: "Monthly",
    period: "/month"
  },
  annual: {
    basePrice: 600,
    extraUserPrice: 50,
    label: "Annual",
    period: "/year",
    savings: "Save 17%"
  }
};

const Pricing = () => {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    organizationName: "",
    employeeSize: "",
    fullName: "",
    jobRole: "",
    phoneNumber: ""
  });

  const handleStartTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.organizationName || !formData.employeeSize || !formData.fullName || !formData.jobRole || !formData.phoneNumber) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          planType: billingPeriod,
          email: formData.email,
          organizationName: formData.organizationName,
          employeeSize: formData.employeeSize,
          fullName: formData.fullName,
          jobRole: formData.jobRole,
          phoneNumber: formData.phoneNumber
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <WelcomeHeader />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with a 30-day free trial. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <div
            className="p-[2px] rounded-xl shadow-lg bg-[length:400%_100%] animate-border-shine"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(23,104,132,0.4), rgba(140,198,70,0.6), rgba(255,255,255,0.9), rgba(140,198,70,0.6), rgba(23,104,132,0.4))"
            }}
          >
            <Card className="border-0 bg-white rounded-[10px] h-full">
              <CardHeader className="text-center pb-4">
                <Badge className="w-fit mx-auto mb-2 bg-[#176884] text-white">
                  <Star className="h-3 w-3 mr-1" /> Perfect for Start Ups
                </Badge>
                <CardTitle className="text-2xl">Monthly Plan</CardTitle>
                <CardDescription>Flexible month-to-month billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <span className="text-4xl font-bold text-foreground">
                    ${PRICING.monthly.basePrice}
                  </span>
                  <span className="text-muted-foreground">{PRICING.monthly.period}</span>
                  <p className="text-sm text-muted-foreground mt-2">
                    Includes 3 users • ${PRICING.monthly.extraUserPrice}
                    {PRICING.monthly.period} per additional user
                  </p>
                </div>

                <ul className="space-y-3">
                  {[
                    "30-day free trial",
                    "Up to 3 users included",
                    "Unlimited projects & tasks",
                    "Team collaboration tools",
                    "Role-based access control",
                    "Priority support",
                    "Custom invoices"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-[#8CC646]" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-gradient-to-r from-[#176884] to-[#8CC646] text-white hover:opacity-90"
                  size="lg"
                  onClick={() => {
                    setBillingPeriod("monthly");
                    setShowSignupForm(true);
                  }}
                >
                  Start 30-Day Free Trial
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Credit card required to start trial. You won't be charged until the trial ends.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Annual Plan */}
          <div
            className="p-[2px] rounded-xl shadow-lg bg-[length:400%_100%] animate-border-shine"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(223,76,51,0.4), rgba(245,181,54,0.6), rgba(255,255,255,0.9), rgba(245,181,54,0.6), rgba(223,76,51,0.4))"
            }}
          >
            <Card className="border-0 bg-white rounded-[10px] h-full">
              <CardHeader className="text-center pb-4">
                <Badge className="w-fit mx-auto mb-2 bg-[#176884] text-white">
                  <Star className="h-3 w-3 mr-1" /> Why pay more? Save $120
                </Badge>
                <CardTitle className="text-2xl">Annual Plan</CardTitle>
                <CardDescription>Save 17% with annual billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <span className="text-4xl font-bold text-foreground">
                    ${PRICING.annual.basePrice}
                  </span>
                  <span className="text-muted-foreground">{PRICING.annual.period}</span>
                  <p className="text-sm text-muted-foreground mt-2">
                    Includes 3 users • ${PRICING.annual.extraUserPrice}
                    {PRICING.annual.period} per additional user
                  </p>
                </div>

                <ul className="space-y-3">
                  {[
                    "30-day free trial",
                    "Up to 3 users included",
                    "Unlimited projects & tasks",
                    "Team collaboration tools",
                    "Role-based access control",
                    "Priority support",
                    "Custom invoices"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-[#8CC646]" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full bg-gradient-to-r from-[#176884] to-[#8CC646] text-white hover:opacity-90"
                  size="lg"
                  onClick={() => {
                    setBillingPeriod("annual");
                    setShowSignupForm(true);
                  }}
                >
                  Start 30-Day Free Trial
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Credit card required to start trial. You won't be charged until the trial ends.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-16 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Questions about our pricing?
          </h2>
          <p className="text-muted-foreground mb-6">
            Our plans include everything you need to manage your business effectively. 
            Need more users? Simply add them at the per-user rate shown above.
          </p>
          <Button variant="outline" asChild>
            <Link to="/welcome">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </main>

      {/* Signup Modal/Form */}
      {showSignupForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Start Your Free Trial</CardTitle>
              <CardDescription>Enter your details to begin your 30-day trial</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStartTrial} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organisation Name</Label>
                  <Input
                    id="organizationName"
                    placeholder="Acme Inc."
                    value={formData.organizationName}
                    onChange={(e) =>
                      setFormData({ ...formData, organizationName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeSize">Company Size</Label>
                  <Select
                    value={formData.employeeSize}
                    onValueChange={(value) => setFormData({ ...formData, employeeSize: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobRole">Job Role</Label>
                  <Input
                    id="jobRole"
                    placeholder="Product Manager"
                    value={formData.jobRole}
                    onChange={(e) => setFormData({ ...formData, jobRole: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingPlan">Billing Plan</Label>
                  <Select
                    value={billingPeriod}
                    onValueChange={(value: "monthly" | "annual") => setBillingPeriod(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">
                        <div className="flex items-center justify-between w-full">
                          <span>Monthly - ${PRICING.monthly.basePrice}/month</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="annual">
                        <div className="flex items-center gap-2">
                          <span>Annual - ${PRICING.annual.basePrice}/year</span>
                          <span className="text-xs text-[#8CC646] font-medium">(Save 17%)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {billingPeriod === "monthly"
                      ? `Includes 3 users • $${PRICING.monthly.extraUserPrice}/month per additional user`
                      : `Includes 3 users • $${PRICING.annual.extraUserPrice}/year per additional user`}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-[#176884]/30 text-foreground hover:bg-[#176884]/5"
                    onClick={() => setShowSignupForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#176884] text-white hover:bg-[#176884]/90"
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Continue to Payment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-[#176884]/20 mt-16 bg-background">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              alt="BOSPLAN.COM"
              className="h-8 w-auto"
              src="/lovable-uploads/5359065e-b4e7-4d2c-ae56-83f375452bc5.png"
            />
          </div>
          <div className="flex items-center gap-6">
            <a
              href="/terms-and-conditions"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms and Conditions
            </a>
            <p className="text-sm text-muted-foreground">
              © 2026 BOSPLAN.COM LTD. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
