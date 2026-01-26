import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, FolderKanban, Zap, Target, Users, Clock, Sparkles } from "lucide-react";
import WelcomeHeader from "@/components/WelcomeHeader";
import projectsBoard from "@/assets/projects-board.png";
import projectsDetail from "@/assets/projects-detail.png";
import projectsTasks from "@/assets/projects-tasks.png";

const ProjectManagementExplainer = () => {
  return (
    <div className="min-h-screen bg-[#ffffff]">
      <WelcomeHeader variant="large-logo" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4 bg-[#8CC646] text-white border-0 hover:bg-[#8CC646]/90 text-xs md:text-sm">
          <FolderKanban className="w-3 h-3 mr-1" />
          Intuitive Project Management
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 md:mb-6">
          Our Special Sauce? Simplicity.
        </h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#176884] mb-6">
          Project Management Without the Noise
        </h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
          While other work management platforms overload teams with complex dashboards and endless features, 
          Bosplan takes a different approach. Our clean, intuitive interface is built around clarity and speed — 
          helping teams focus on execution, not navigation.
        </p>
        <p className="text-lg md:text-xl font-medium text-foreground max-w-2xl mx-auto mb-8">
          Simplicity as a performance engine.
        </p>
        <Button
          size="lg"
          className="bg-[#176884] text-white hover:bg-[#176884]/90 font-semibold shadow-lg"
          asChild
        >
          <Link to="/auth">Start Free Trial</Link>
        </Button>
      </section>

      {/* Hero Image - Kanban Board */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50">
            <img
              src={projectsBoard}
              alt="Bosplan Project Management Board - Clean Kanban View"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Why Simplicity Matters */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#8CC646]/5">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Why Simplicity Matters
          </h2>
          <p className="text-lg text-muted-foreground">
            This simplicity isn't just aesthetic — it's strategic. By removing distractions, 
            Bosplan reduces onboarding time, eliminates decision fatigue, and keeps everyone aligned on priorities.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#8CC646]/10 flex items-center justify-center">
              <Zap className="w-7 h-7 text-[#8CC646]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Faster Onboarding</h3>
            <p className="text-sm text-muted-foreground">
              New team members get productive in minutes, not days. No training manuals required.
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#F5B536]/10 flex items-center justify-center">
              <Target className="w-7 h-7 text-[#F5B536]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Zero Decision Fatigue</h3>
            <p className="text-sm text-muted-foreground">
              Clear priorities, obvious next steps. No more wading through complex menus and options.
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#176884]/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-[#176884]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Team Alignment</h3>
            <p className="text-sm text-muted-foreground">
              Everyone sees the same view, the same priorities. Miscommunication becomes a thing of the past.
            </p>
          </div>
        </div>
      </section>

      {/* Kanban Board Feature */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img
                  src={projectsBoard}
                  alt="Visual project board with To Do, In Progress, and Complete columns"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8CC646]/10 text-[#8CC646] text-sm font-semibold mb-6">
                <FolderKanban className="w-4 h-4" />
                Visual Project Board
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                See Everything at a Glance
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our three-column Kanban board gives you instant visibility into every project's status. 
                To Do, In Progress, Complete — that's all you need to know where things stand.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#176884]"></div>
                  <span className="text-muted-foreground">To Do — What's coming up</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#F5B536]"></div>
                  <span className="text-muted-foreground">In Progress — What's being worked on</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[#8CC646]"></div>
                  <span className="text-muted-foreground">Complete — What's done</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#8CC646]/5 border border-[#8CC646]/10">
                <p className="text-[#8CC646] font-medium">
                  Drag and drop projects between columns as they progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project Details Feature */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#F5B536]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5B536]/10 text-[#F5B536] text-sm font-semibold mb-6">
                <Sparkles className="w-4 h-4" />
                Project Details
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Everything You Need, Nothing You Don't
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Each project card opens to reveal exactly what you need: title, description, 
                attachments, and a clear task list. No endless tabs, no hidden features, 
                no learning curve.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clear project title and description</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Attach files directly to projects</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Add tasks with one click</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#F5B536]/5 border border-[#F5B536]/10">
                <p className="text-[#F5B536] font-medium">
                  Focus on what matters. Get work done faster.
                </p>
              </div>
            </div>
            <div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img
                  src={projectsDetail}
                  alt="Project details with title, description, attachments and task list"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Task Management Feature */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img
                  src={projectsTasks}
                  alt="Task management with priorities, assignments, and due dates"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#176884]/10 text-[#176884] text-sm font-semibold mb-6">
                <Clock className="w-4 h-4" />
                Task Tracking
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Tasks That Make Sense
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Break projects into actionable tasks with clear priorities, assignments, 
                and due dates. Everyone knows what they're responsible for and when it's due.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#176884]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#176884]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Priority Levels</h4>
                    <p className="text-sm text-muted-foreground">
                      High, Medium, Low — colour-coded for instant recognition
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#176884]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#176884]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Team Assignments</h4>
                    <p className="text-sm text-muted-foreground">
                      Assign tasks to team members with one click
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#176884]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#176884]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Due Dates</h4>
                    <p className="text-sm text-muted-foreground">
                      Never miss a deadline with clear date tracking
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#176884]/5 border border-[#176884]/10">
                <p className="text-[#176884] font-medium">
                  The result? Faster allocation, higher productivity, and measurable progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Design Philosophy Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#176884]/5">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#176884]/10 text-[#176884] text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Our Design Philosophy
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-6">
            Simplicity is What Sets Us Apart
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto">
            Our design philosophy is what sets us apart: simplicity as a performance engine. 
            Every feature is intentional. Every screen is focused. Every interaction is intuitive.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="p-6 rounded-xl bg-white shadow-md border border-slate-100">
              <div className="text-3xl font-bold text-[#8CC646] mb-2">80%</div>
              <p className="text-sm text-muted-foreground">Faster onboarding than traditional tools</p>
            </div>
            <div className="p-6 rounded-xl bg-white shadow-md border border-slate-100">
              <div className="text-3xl font-bold text-[#F5B536] mb-2">Zero</div>
              <p className="text-sm text-muted-foreground">Training required to get started</p>
            </div>
            <div className="p-6 rounded-xl bg-white shadow-md border border-slate-100">
              <div className="text-3xl font-bold text-[#176884] mb-2">100%</div>
              <p className="text-sm text-muted-foreground">Focus on what actually matters</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-[#176884] to-[#176884]/80">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Ready to Experience Simplicity?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join teams who have discovered that less really is more. 
            Start managing projects without the noise.
          </p>
          <Button
            size="lg"
            className="bg-white text-[#176884] hover:bg-white/90 font-semibold shadow-lg"
            asChild
          >
            <Link to="/auth">Start Free Trial</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              alt="Bosplan.com"
              className="h-16 w-auto"
              src="/lovable-uploads/ef0c289d-ee1b-4e69-8c1e-4f32a0574d7d.png"
            />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/welcome" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/tools" className="hover:text-foreground transition-colors">
              Tools
            </Link>
            <Link to="/project-management" className="hover:text-foreground transition-colors">
              Project Management
            </Link>
            <Link to="/bosdrive" className="hover:text-foreground transition-colors">
              Bosdrive
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-foreground transition-colors">
              Terms & Conditions
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bosplan.com. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ProjectManagementExplainer;
