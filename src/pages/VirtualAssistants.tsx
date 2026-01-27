import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Code, Headphones, TrendingUp, Share2, Palette, BookOpen, Users, Loader2 } from "lucide-react";
import SideNavigation from "@/components/SideNavigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { LogOut, Users2, Settings } from "lucide-react";
import MyVirtualAssistants, { MyVirtualAssistantsHandle } from "@/components/virtual-assistants/MyVirtualAssistants";
import { toast } from "sonner";
import { useVAPricing } from "@/hooks/useVAPricing";
import { supabase } from "@/integrations/supabase/client";
const virtualAssistants = [{
  id: "shopify-developer",
  title: "Shopify Developer",
  description: "Expert in building and customising Shopify stores, theme development, app integrations, and e-commerce optimisation.",
  icon: Code,
  features: ["Store setup & customisation", "Theme development", "App integrations", "Performance optimisation"],
  popular: true
}, {
  id: "customer-service",
  title: "Customer Service Agent",
  description: "Professional customer support representative handling enquiries, complaints, and providing exceptional service.",
  icon: Headphones,
  features: ["24/7 support coverage", "Multi-channel support", "Ticket management", "Customer satisfaction focus"],
  popular: false
}, {
  id: "sales-executive",
  title: "Sales Executive",
  description: "Skilled sales professional for lead generation, outreach, follow-ups, and closing deals.",
  icon: TrendingUp,
  features: ["Lead generation", "Cold outreach", "Sales pipeline management", "Deal closing"],
  popular: true
}, {
  id: "social-media",
  title: "Social Media Executive",
  description: "Creative social media manager for content creation, scheduling, engagement, and growth strategies.",
  icon: Share2,
  features: ["Content creation", "Scheduling & posting", "Community management", "Analytics & reporting"],
  popular: false
}, {
  id: "graphic-designer",
  title: "Graphic Designer",
  description: "Talented designer creating stunning visuals, branding materials, marketing assets, and more.",
  icon: Palette,
  features: ["Brand identity design", "Marketing materials", "Social media graphics", "Presentation design"],
  popular: false
}, {
  id: "book-writer",
  title: "Book Writer",
  description: "Professional writer for ghostwriting, editing, content creation, and publishing assistance.",
  icon: BookOpen,
  features: ["Ghostwriting", "Editing & proofreading", "Research & outlining", "Publishing guidance"],
  popular: false
}];
const VirtualAssistants = () => {
  const {
    navigate
  } = useOrgNavigation();
  const [searchParams] = useSearchParams();
  const {
    user,
    signOut
  } = useAuth();
  const {
    profile
  } = useOrganization();
  const [activeSideItem, setActiveSideItem] = useState("virtual-assistants");
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const myAssistantsRef = useRef<MyVirtualAssistantsHandle>(null);
  const {
    pricing,
    loading: pricingLoading
  } = useVAPricing();
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "true") {
      toast.success("Thank you for your purchase! Your Virtual Assistant will be added to your organisation shortly.");
      myAssistantsRef.current?.refetch();
    } else if (canceled === "true") {
      toast.info("Checkout was cancelled.");
    }
  }, [searchParams]);
  const handleCheckout = async (assistantId: string, hoursPackage: number) => {
    const checkoutKey = `${assistantId}-${hoursPackage}`;
    setLoadingCheckout(checkoutKey);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("create-va-checkout", {
        body: {
          hoursPackage: String(hoursPackage),
          assistantType: assistantId
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingCheckout(null);
    }
  };
  return <div className="flex min-h-screen bg-background pb-20 md:pb-0">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-5 p-4 sm:p-6 md:p-8 bg-card/50">
          <div className="flex items-center gap-3 sm:gap-5">
            <img alt="Bosplan" className="h-8 w-auto cursor-pointer sm:h-10 transition-transform duration-200 hover:scale-105" onClick={() => navigate("/")} src="/lovable-uploads/df46293f-eed7-4703-b275-003427891304.png" />
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Virtual Assistants</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Hire skilled professionals to supercharge your business at a low and affordable cost!</p>
            </div>
          </div>
          {user && <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <OrganizationSwitcher />
              <span className="hidden sm:inline text-sm text-muted-foreground font-medium truncate max-w-[150px]">
                {profile?.full_name || user.email}
              </span>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/settings/team")} title="Team Members">
                <Users2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/settings/organisation")} title="Organisation Settings">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth text-xs sm:text-sm" onClick={signOut}>
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>}
        </div>

        {/* Explainer Section */}
        <div className="px-4 sm:px-6 md:px-8 pt-4">
          <div className="bg-card border border-border rounded-xl p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-[#176884]/10 shrink-0">
                <Users className="w-6 h-6 text-[#176884]" />
              </div>
              <div>
                <Badge className="mb-3 bg-[#176884] text-white border-0 hover:bg-[#176884]/90 text-xs">
                  Virtual Assistants
                </Badge>
                <p className="text-muted-foreground leading-relaxed">
                  Need affordable assistance for your business? Our Virtual Assistants offer a low-cost and highly-skilled solution. Choose the role and number of hours, then purchase directly through the platform. Once completed, your Virtual Assistant will be added to your organisation and you can allocate work as you wish.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* My Virtual Assistants Section */}
        <div className="px-4 sm:px-6 md:px-8 pt-6">
          <MyVirtualAssistants ref={myAssistantsRef} />
        </div>

        {/* Available Virtual Assistants */}
        <div className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {virtualAssistants.map(assistant => {
            const Icon = assistant.icon;
            return <Card key={assistant.id} className="relative flex flex-col hover:shadow-lg transition-shadow duration-200">
                  {assistant.popular && <Badge className="absolute -top-2 -right-2 bg-[#176884] text-white border-0">
                      Popular
                    </Badge>}
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-[#176884]/10">
                        <Icon className="w-6 h-6 text-[#176884]" />
                      </div>
                      <CardTitle className="text-lg">{assistant.title}</CardTitle>
                    </div>
                    <CardDescription>{assistant.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {assistant.features.map((feature, index) => <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#176884]" />
                          {feature}
                        </li>)}
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2 pt-4 border-t">
                    {pricingLoading ? <div className="flex items-center justify-center w-full py-2">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div> : pricing.map(pkg => {
                  const price = pkg.price_cents / 100;
                  const checkoutKey = `${assistant.id}-${pkg.hours_package}`;
                  const isLoading = loadingCheckout === checkoutKey;
                  return <Button key={pkg.hours_package} onClick={() => handleCheckout(assistant.id, pkg.hours_package)} disabled={isLoading || loadingCheckout !== null} className="w-full justify-between bg-[#176884] hover:bg-[#176884]/90 text-white" size="sm">
                            <span>{pkg.hours_package} hours/month</span>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="font-semibold">${price}</span>}
                          </Button>;
                })}
                  </CardFooter>
                </Card>;
          })}
          </div>
        </div>
      </div>
      <SideNavigation activeItem={activeSideItem} onItemClick={setActiveSideItem} />
    </div>;
};
export default VirtualAssistants;