import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowLeft } from "lucide-react";
import WelcomeHeader from "@/components/WelcomeHeader";
import toolMagicMerge from "@/assets/tool-magic-merge-new.png";
import toolTaskFlow from "@/assets/tool-taskflow-new.png";
import toolTaskPopulate from "@/assets/tool-taskpopulate-new.png";
import toolDataRoom from "@/assets/tool-dataroom-new.png";

const Tools = () => {
  return <div className="min-h-screen bg-[#ffffff]">
      <WelcomeHeader variant="large-logo" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4 bg-[#176884] text-white border-0 hover:bg-[#176884]/90 text-xs md:text-sm">
          🛠️ Powerful Tools
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 md:mb-6">
          Tools Built to Supercharge Your Workflow
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
          Discover the powerful features that make Bosplan.com the ultimate work management platform. 
          Each tool is designed to solve real problems and help your team work smarter, not harder.
        </p>
      </section>

      {/* Magic Merge Section */}
      <section id="magic-merge" className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#8CC646]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8CC646]/10 text-[#8CC646] text-sm font-semibold mb-6">
                ✨ Magic Merge
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Task Transfer Made Simple
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Seamlessly transfer tasks permanently or temporarily to teammates during absences, 
                ensuring nothing is missed and work keeps moving. Magic Merge is designed for teams 
                that need flexibility without sacrificing accountability.
              </p>
              <p className="text-muted-foreground mb-6">
                Whether it's a planned vacation, unexpected sick leave, or a project handover, Magic Merge 
                ensures continuity. Tasks can be transferred with full context, and when the original owner 
                returns, tasks can automatically revert back—keeping everyone in the loop without manual tracking.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Temporary or Permanent Transfers</h4>
                    <p className="text-sm text-muted-foreground">Choose to transfer tasks for a set period or permanently reassign ownership to another team member.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Automatic Task Return</h4>
                    <p className="text-sm text-muted-foreground">When absences end, tasks automatically return to the original owner with a full activity log of what happened.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Complete Transfer Tracking</h4>
                    <p className="text-sm text-muted-foreground">Full audit trail of all transfers, including who transferred what, when, and why—for complete transparency.</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
                <div className="h-8 bg-slate-100 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <img src={toolMagicMerge} alt="Magic Merge - Task Transfer Tool" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TaskFlow Section */}
      <section id="taskflow" className="container mx-auto px-4 py-16 bg-gradient-to-b from-[#8CC646]/5 to-[#F5B536]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
                <div className="h-8 bg-slate-100 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <img src={toolTaskFlow} alt="TaskFlow - Workload Management" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5B536]/10 text-[#F5B536] text-sm font-semibold mb-6">
                📊 TaskFlow
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Visualise and Balance Team Workloads
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                TaskFlow gives you a bird's-eye view of your team's capacity with intuitive heatmaps 
                and workload indicators. Prevent burnout, identify bottlenecks, and reassign tasks with ease.
              </p>
              <p className="text-muted-foreground mb-6">
                Understanding who's overloaded and who has capacity is crucial for team productivity. 
                TaskFlow visualises workload distribution across your entire team, making it easy to spot 
                imbalances before they become problems. With smart reassignment suggestions and alerts, 
                you can proactively manage capacity and keep projects on track.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Visual Workload Heatmaps</h4>
                    <p className="text-sm text-muted-foreground">See at a glance who's overloaded and who has bandwidth with colour-coded capacity indicators.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Smart Task Reassignment</h4>
                    <p className="text-sm text-muted-foreground">Get intelligent suggestions for rebalancing work based on skills, availability, and current load.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Capacity Planning Alerts</h4>
                    <p className="text-sm text-muted-foreground">Receive proactive notifications when team members are approaching overload thresholds.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TaskPopulate Section */}
      <section id="taskpopulate" className="container mx-auto px-4 py-16 bg-gradient-to-b from-[#F5B536]/5 to-[#176884]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#176884]/10 text-[#176884] text-sm font-semibold mb-6">
                🤖 TaskPopulate
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                AI-Powered Task Generation
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Upload any document and let AI analyse it to automatically generate actionable tasks 
                with checklists. Turn meeting notes, project briefs, and requirements into structured 
                work items instantly.
              </p>
              <p className="text-muted-foreground mb-6">
                Stop spending hours manually creating tasks from documents. TaskPopulate uses advanced 
                AI to understand context, extract action items, and create structured tasks with subtasks 
                and checklists. Whether it's a client brief, meeting transcript, or project specification, 
                TaskPopulate converts documents into actionable work in seconds.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#176884]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#176884]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">AI Document Analysis</h4>
                    <p className="text-sm text-muted-foreground">Upload PDFs, Word docs, or paste text—our AI understands context and extracts key action items.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#176884]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#176884]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Auto-Generated Checklists</h4>
                    <p className="text-sm text-muted-foreground">Each task comes with detailed checklists breaking down the work into manageable steps.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#176884]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#176884]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">One-Click Task Creation</h4>
                    <p className="text-sm text-muted-foreground">Review AI suggestions and add tasks to your projects with a single click—fully editable before and after.</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
                <div className="h-8 bg-slate-100 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <img src={toolTaskPopulate} alt="TaskPopulate - AI Task Generation" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Rooms Section */}
      <section id="datarooms" className="container mx-auto px-4 py-16 bg-gradient-to-b from-[#176884]/5 to-[#DF4C33]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
                <div className="h-8 bg-slate-100 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <img src={toolDataRoom} alt="Data Rooms - Secure Document Sharing" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#DF4C33]/10 text-[#DF4C33] text-sm font-semibold mb-6">
                🔒 Data Rooms
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Secure Document Sharing & Collaboration
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Create secure virtual data rooms for sensitive document sharing. Perfect for due diligence, 
                investor relations, and confidential project collaboration with built-in NDA management.
              </p>
              <p className="text-muted-foreground mb-6">
                When you need to share sensitive information with external parties, Data Rooms provide 
                enterprise-grade security with consumer-grade simplicity. Guests sign NDAs before accessing 
                documents, every action is logged, and you maintain complete control over who sees what. 
                Real-time collaboration features let you work with external stakeholders without compromising security.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#DF4C33]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#DF4C33]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Secure Guest Access with NDA Signing</h4>
                    <p className="text-sm text-muted-foreground">Invite external users who must sign your NDA before accessing any documents in the data room.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#DF4C33]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#DF4C33]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Activity Tracking & Audit Logs</h4>
                    <p className="text-sm text-muted-foreground">Every view, download, and action is tracked with timestamps and user details for complete accountability.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#DF4C33]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#DF4C33]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Real-Time Collaboration & Chat</h4>
                    <p className="text-sm text-muted-foreground">Built-in messaging and document commenting enable seamless collaboration with external parties.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start your 30-day free trial and experience the full power of Bosplan.com's tools.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="bg-[#176884] hover:bg-[#176884]/90 text-white font-semibold shadow-lg" asChild>
              <Link to="/welcome">Join Bosplan.com</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-[#176884]/30 text-foreground hover:bg-[#176884]/5" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

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
    </div>;
};
export default Tools;