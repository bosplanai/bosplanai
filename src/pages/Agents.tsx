import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, CheckCircle, Sparkles, Zap, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WelcomeHeader from "@/components/WelcomeHeader";
import WelcomeFooter from "@/components/WelcomeFooter";

const Agents = () => {
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyName.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("agent_waitlist").insert({
        name: name.trim(),
        company_name: companyName.trim(),
        email: email.trim(),
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("You've been added to the waiting list!");
    } catch (err: any) {
      console.error("Waitlist signup error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff]">
      <WelcomeHeader variant="large-logo" />

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-[#176884]/10 text-[#176884] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Coming Soon
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1a1a2e] mb-6 leading-tight">
            AI Agents for Your Business
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-12">
            Bosplan is building intelligent AI agents to automate your workflows, manage tasks, and supercharge your team's productivity. Be the first to know when they launch.
          </p>
        </div>
      </section>

      {/* Features Preview */}
      <section className="pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              { icon: Bot, title: "Task Automation", description: "Agents that learn your workflows and handle repetitive tasks automatically." },
              { icon: Zap, title: "Smart Scheduling", description: "AI-powered scheduling that optimises your team's calendar and priorities." },
              { icon: Users, title: "Team Coordination", description: "Intelligent agents that keep your team aligned and projects on track." },
            ].map((feature, i) => (
              <Card key={i} className="border border-gray-200 shadow-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-[#176884]/10 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-[#176884]" />
                  </div>
                  <h3 className="font-semibold text-[#1a1a2e] text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist Signup */}
      <section className="pb-24 px-4">
        <div className="container mx-auto max-w-lg">
          <Card className="border border-gray-200 shadow-lg">
            <CardContent className="p-8">
              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-[#1a1a2e] mb-2">You're on the list!</h3>
                  <p className="text-gray-600">We'll notify you as soon as AI Agents are available on Bosplan.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-[#1a1a2e] text-center mb-2">Join the Waiting List</h2>
                  <p className="text-sm text-gray-500 text-center mb-6">Be the first to access Bosplan AI Agents when they launch.</p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                      <Input id="name" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
                    </div>
                    <div>
                      <label htmlFor="company" className="text-sm font-medium text-gray-700 mb-1 block">Company Name</label>
                      <Input id="company" placeholder="Your company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required maxLength={100} />
                    </div>
                    <div>
                      <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">Email Address</label>
                      <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
                    </div>
                    <Button type="submit" className="w-full bg-[#176884] text-white hover:bg-[#176884]/90" disabled={submitting}>
                      {submitting ? "Submitting…" : "Join Waiting List"}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <WelcomeFooter />
    </div>
  );
};

export default Agents;
