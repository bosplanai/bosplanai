import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, Users, Shield, BarChart3, Clock, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SetPasswordDialog from "@/components/SetPasswordDialog";
import { DemoTaskBoard } from "@/components/demo/DemoTaskBoard";
import WelcomeHeader from "@/components/WelcomeHeader";
import bosplanLogo from "@/assets/bosplan-logo-full.png";
import bosplanTagline from "@/assets/bosplan-tagline.png";
import dashboardPreview1 from "@/assets/dashboard-preview-1.png";
import dashboardPreview2 from "@/assets/dashboard-preview-2.png";
import dashboardPreview3 from "@/assets/dashboard-preview-3.png";
import toolMagicMerge from "@/assets/tool-magic-merge-new.png";
import toolTaskFlow from "@/assets/tool-taskflow-new.png";
import toolTaskPopulate from "@/assets/tool-taskpopulate-new.png";
import toolDataRoom from "@/assets/tool-dataroom-new.png";
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
const Landing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
      const {
        data,
        error
      } = await supabase.functions.invoke('create-checkout', {
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
  const features = [{
    icon: BarChart3,
    title: "⚡ Increase Velocity",
    subtitle: "Keep Your Team Aligned and Moving Forward.",
    description: "Bosplan.com simplifies task allocation and project ownership so everyone knows what to work on next. Track progress in real time, reduce delays, and keep work moving without constant check-ins or bottlenecks."
  }, {
    icon: Users,
    title: "🔇 Reduce Noise",
    subtitle: "Simple. Focused. Built for Real Work.",
    description: "Bosplan.com strips away unnecessary complexity found in traditional work management tools. With a clean, intuitive interface, your team stays focused on priorities—no clutter, no distractions, just clear execution."
  }, {
    icon: Shield,
    title: "✅ Achieve Goals",
    subtitle: "Measure Progress. Deliver Results.",
    description: "Bosplan.com helps small businesses manage operations, track performance, and set goals that actually get completed. We focus on outcomes, not activity—so real work gets done, faster and with less friction."
  }, {
    icon: Clock,
    title: "🎛️ Stay in Control",
    subtitle: "Everything Your Team Needs—In One Place.",
    description: "Tasks, projects, operations, and goals come together in a single, clear system—so nothing slips through the cracks."
  }];
  return <div className="min-h-screen bg-[#ffffff]">
      <WelcomeHeader variant="large-logo" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center rounded-2xl relative overflow-hidden animate-lava-lamp" style={{
      background: `linear-gradient(135deg, #176884 0%, #176884 20%, #3a9a8a 35%, #8CC646 45%, #c4d040 50%, #F5B536 55%, #ea7f35 65%, #DF4C33 80%, #DF4C33 100%)`
    }}>
        <div className="absolute inset-0 pointer-events-none" />
        <div className="relative z-10">
          <Badge className="mb-4 bg-white text-black border-0 hover:bg-white/90 font-semibold text-xs md:text-sm">
            Start Your 30 Day Free Trial Today - Cancel Anytime
          </Badge>
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white mb-4 md:mb-6 drop-shadow-lg">
            Bosplan.com is changing the    
            <br />
            world <span className="text-white">of work, forever. </span>
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-white/95 max-w-2xl mx-auto mb-6 md:mb-8 drop-shadow px-2">The only work management platform that centralises communication, project management, operations, and strategy — helping people work anytime, anywhere.</p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-white text-black hover:bg-white/90 font-semibold shadow-lg" onClick={() => setShowSignupForm(true)}>
              Start Free Trial
            </Button>
            <Button size="lg" className="bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 bg-white">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-foreground mb-8 md:mb-12">
          Built for people who get stuff done!         
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
          const bgColors = ["#176884", "#8CC646", "#F5B536", "#DF4C33"];
          return <Card key={feature.title} className="border-0" style={{
            backgroundColor: bgColors[index],
            backgroundSize: '150% 150%'
          }}>
                <CardHeader>
                  
                  <CardTitle className="text-base md:text-lg text-white">{feature.title}</CardTitle>
                  <CardDescription className="text-white/90 text-xs md:text-sm">
                    <span className="font-bold block mb-2">{feature.subtitle}</span>
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>;
        })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 py-12 md:py-16 bg-white">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-foreground mb-3 md:mb-4">
          Simple, Transparent Pricing
        </h2>
        <p className="text-sm md:text-base text-center text-muted-foreground mb-6 md:mb-8">
          Start with a 30-day free trial. Cancel anytime.
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <div className="p-[2px] rounded-xl shadow-lg bg-[length:400%_100%] animate-border-shine" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(23,104,132,0.4), rgba(140,198,70,0.6), rgba(255,255,255,0.9), rgba(140,198,70,0.6), rgba(23,104,132,0.4))'
        }}>
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
                    Includes 3 users • ${PRICING.monthly.extraUserPrice}{PRICING.monthly.period} per additional user
                  </p>
                </div>

                <ul className="space-y-3">
                  {["30-day free trial", "Up to 3 users included", "Unlimited projects & tasks", "Team collaboration tools", "Role-based access control", "Priority support", "Custom invoices"].map(feature => <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-[#8CC646]" />
                      <span className="text-foreground">{feature}</span>
                    </li>)}
                </ul>

                <Button className="w-full bg-gradient-to-r from-[#176884] to-[#8CC646] text-white hover:opacity-90" size="lg" onClick={() => {
                setBillingPeriod("monthly");
                setShowSignupForm(true);
              }}>
                  Start 30-Day Free Trial
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Credit card required to start trial. You won't be charged until the trial ends.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Annual Plan */}
          <div className="p-[2px] rounded-xl shadow-lg bg-[length:400%_100%] animate-border-shine" style={{
          backgroundImage: 'linear-gradient(90deg, rgba(223,76,51,0.4), rgba(245,181,54,0.6), rgba(255,255,255,0.9), rgba(245,181,54,0.6), rgba(223,76,51,0.4))'
        }}>
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
                    Includes 3 users • ${PRICING.annual.extraUserPrice}{PRICING.annual.period} per additional user
                  </p>
                </div>

                <ul className="space-y-3">
                  {["30-day free trial", "Up to 3 users included", "Unlimited projects & tasks", "Team collaboration tools", "Role-based access control", "Priority support", "Custom invoices"].map(feature => <li key={feature} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-[#8CC646]" />
                      <span className="text-foreground">{feature}</span>
                    </li>)}
                </ul>

                <Button className="w-full bg-gradient-to-r from-[#176884] to-[#8CC646] text-white hover:opacity-90" size="lg" onClick={() => {
                setBillingPeriod("annual");
                setShowSignupForm(true);
              }}>
                  Start 30-Day Free Trial
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Credit card required to start trial. You won't be charged until the trial ends.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-slate-50 to-white rounded-2xl">
        <div className="text-center mb-8 md:mb-10">
          <Badge className="mb-4 bg-[#F5B536] text-white border-0 hover:bg-[#F5B536]/90 text-xs md:text-sm">
            ✨ Interactive Demo
          </Badge>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            Experience the simplicity yourself
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
            Create tasks, drag them between columns, and see how easy task management can be. 
            <span className="block mt-1 text-xs">No account needed — this demo runs in your browser only.</span>
          </p>
        </div>

        <DemoTaskBoard />

        <div className="text-center mt-8">
          <Button 
            size="lg" 
            className="bg-[#176884] hover:bg-[#176884]/90 text-white font-semibold shadow-lg"
            onClick={() => setShowSignupForm(true)}
          >
            Ready for the full experience? Start Free Trial
          </Button>
        </div>
      </section>

      {/* Tools Showcase Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-slate-50 rounded-2xl">
        <div className="text-center mb-8 md:mb-12">
          <Badge className="mb-4 bg-[#176884] text-[#ffffff] border-[#176884] hover:bg-[#176884]/90 text-xs md:text-sm">
            🛠️ Powerful Tools
          </Badge>
          <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">
            Tools built to supercharge your workflow
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-2">
            Discover the powerful features that make Bosplan.com the ultimate work management platform.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Magic Merge Tool */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8CC646]/10 text-[#8CC646] text-sm font-medium mb-4">
                ✨ Magic Merge
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Task Transfer Made Simple
              </h3>
              <p className="text-muted-foreground mb-4">
                Seamlessly transfer tasks permanently or temporarily to teammates during absences, 
                ensuring nothing is missed and work keeps moving.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Temporary or permanent task transfers
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Automatic task return after absences
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Complete transfer summary tracking
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-slate-200/50 bg-white hover:shadow-2xl transition-shadow duration-300">
                <div className="h-6 bg-slate-100 flex items-center px-3 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <img src={toolMagicMerge} alt="Magic Merge Tool - Document Merging" className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* TaskFlow Tool */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="rounded-xl overflow-hidden shadow-xl border border-slate-200/50 bg-white hover:shadow-2xl transition-shadow duration-300">
                <div className="h-6 bg-slate-100 flex items-center px-3 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <img src={toolTaskFlow} alt="TaskFlow - Workload Management" className="w-full h-auto" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5B536]/10 text-[#F5B536] text-sm font-medium mb-4">
                📊 TaskFlow
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Visualise and balance team workloads
              </h3>
              <p className="text-muted-foreground mb-4">
                TaskFlow gives you a bird's-eye view of your team's capacity with intuitive heatmaps and workload indicators. 
                Prevent burnout, identify bottlenecks, and reassign tasks with ease.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Visual workload heatmaps
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Smart task reassignment
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Capacity planning alerts
                </li>
              </ul>
            </div>
          </div>

          {/* TaskPopulate Tool */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#176884]/10 text-[#176884] text-sm font-medium mb-4">
                🤖 TaskPopulate
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                AI-powered task generation
              </h3>
              <p className="text-muted-foreground mb-4">
                Upload any document and let AI analyse it to automatically generate actionable tasks with checklists. 
                Turn meeting notes, project briefs, and requirements into structured work items instantly.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  AI document analysis
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Auto-generated checklists
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  One-click task creation
                </li>
              </ul>
            </div>
            <div className="order-1 md:order-2">
              <div className="rounded-xl overflow-hidden shadow-xl border border-slate-200/50 bg-white hover:shadow-2xl transition-shadow duration-300">
                <div className="h-6 bg-slate-100 flex items-center px-3 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <img src={toolTaskPopulate} alt="TaskPopulate - AI Task Generation" className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* Data Rooms Tool */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="rounded-xl overflow-hidden shadow-xl border border-slate-200/50 bg-white hover:shadow-2xl transition-shadow duration-300">
                <div className="h-6 bg-slate-100 flex items-center px-3 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                </div>
                <img src={toolDataRoom} alt="Data Rooms - Secure Document Sharing" className="w-full h-auto" />
              </div>
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DF4C33]/10 text-[#DF4C33] text-sm font-medium mb-4">
                🔒 Data Rooms
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Secure document sharing & collaboration
              </h3>
              <p className="text-muted-foreground mb-4">
                Create secure virtual data rooms for sensitive document sharing. Perfect for due diligence, 
                investor relations, and confidential project collaboration with built-in NDA management.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Secure guest access with NDA signing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Activity tracking & audit logs
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8CC646]" />
                  Real-time collaboration & chat
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA after tools */}
        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-[#176884] hover:bg-[#176884]/90 text-white font-semibold shadow-lg"
            onClick={() => setShowSignupForm(true)}
          >
            Join Bosplan.com
          </Button>
        </div>
      </section>

      {/* Signup Modal/Form */}
      {showSignupForm && <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Start Your Free Trial</CardTitle>
              <CardDescription>
                Enter your details to begin your 30-day trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStartTrial} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com" value={formData.email} onChange={e => setFormData({
                ...formData,
                email: e.target.value
              })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" placeholder="John Doe" value={formData.fullName} onChange={e => setFormData({
                ...formData,
                fullName: e.target.value
              })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organisation Name</Label>
                  <Input id="organizationName" placeholder="Acme Inc." value={formData.organizationName} onChange={e => setFormData({
                ...formData,
                organizationName: e.target.value
              })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employeeSize">Company Size</Label>
                  <Select value={formData.employeeSize} onValueChange={value => setFormData({
                ...formData,
                employeeSize: value
              })}>
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
                  <Input id="jobRole" placeholder="Product Manager" value={formData.jobRole} onChange={e => setFormData({
                ...formData,
                jobRole: e.target.value
              })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input id="phoneNumber" type="tel" placeholder="+1 (555) 000-0000" value={formData.phoneNumber} onChange={e => setFormData({
                ...formData,
                phoneNumber: e.target.value
              })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingPlan">Billing Plan</Label>
                  <Select value={billingPeriod} onValueChange={(value: "monthly" | "annual") => setBillingPeriod(value)}>
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
                    {billingPeriod === "monthly" ? `Includes 3 users • $${PRICING.monthly.extraUserPrice}/month per additional user` : `Includes 3 users • $${PRICING.annual.extraUserPrice}/year per additional user`}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 border-[#176884]/30 text-foreground hover:bg-[#176884]/5" onClick={() => setShowSignupForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-[#176884] text-white hover:bg-[#176884]/90" disabled={loading}>
                    {loading ? "Processing..." : "Continue to Payment"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>}

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-[#176884]/20 mt-16 bg-white">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img alt="BOSPLAN.COM" className="h-8 w-auto" src="/lovable-uploads/5359065e-b4e7-4d2c-ae56-83f375452bc5.png" />
          </div>
          <div className="flex items-center gap-6">
            <a href="/terms-and-conditions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms and Conditions
            </a>
            <p className="text-sm text-muted-foreground">© 2026 BOSPLAN.COM LTD. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <SetPasswordDialog />
    </div>;
};
export default Landing;