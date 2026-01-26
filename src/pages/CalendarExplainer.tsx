import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Calendar as CalendarIcon, Users, FileText, Filter, MessageSquare, HardDrive, RefreshCw } from "lucide-react";
import WelcomeHeader from "@/components/WelcomeHeader";
import calendarOverview from "@/assets/calendar-overview.png";
import calendarNotes from "@/assets/calendar-notes.png";
import calendarBosdriveSync from "@/assets/calendar-bosdrive-sync.png";
const CalendarExplainer = () => {
  return <div className="min-h-screen bg-[#ffffff]">
      <WelcomeHeader variant="large-logo" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4 bg-[#F5B536] text-white border-0 hover:bg-[#F5B536]/90 text-xs md:text-sm">
          <CalendarIcon className="w-3 h-3 mr-1" />
          Task Calendar
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 md:mb-6">Never Miss a Deadline Again!</h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#176884] mb-6">Your Tasks, Visualised by Due Date</h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
          The Task Calendar brings all your deadlines together in one clear view. See what's due, who's responsible, and generate meeting minutes for the management team.      
        </p>
        <p className="text-lg md:text-xl font-medium text-foreground max-w-2xl mx-auto mb-8">
          Stay organised. Stay informed. Stay on track.
        </p>
        <Button size="lg" className="bg-[#176884] text-white hover:bg-[#176884]/90 font-semibold shadow-lg" asChild>
          <Link to="/auth">Start Free Trial</Link>
        </Button>
      </section>

      {/* Hero Image */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50">
            <img src={calendarOverview} alt="Task Calendar - View and manage your upcoming deadlines" className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#F5B536]/5">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Everything at a Glance
          </h2>
          <p className="text-lg text-muted-foreground">
            Tasks are automatically linked to their due dates, making it easy to see what's 
            coming up and plan your team's workload.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#DF4C33]/10 flex items-center justify-center">
              <CalendarIcon className="w-7 h-7 text-[#DF4C33]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Auto-Linked Due Dates</h3>
            <p className="text-sm text-muted-foreground">
              Tasks appear on their due dates automatically. No manual entry needed — just create tasks and see them in your calendar.
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#8CC646]/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-[#8CC646]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">See Assignees & Details</h3>
            <p className="text-sm text-muted-foreground">
              View who's responsible for each task, project information, priority levels, and all relevant details at a glance.
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#176884]/10 flex items-center justify-center">
              <Filter className="w-7 h-7 text-[#176884]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Powerful Filters</h3>
            <p className="text-sm text-muted-foreground">
              Filter by Product Management, Operational Management, Strategic Management, and specific assignees to focus on what matters.
            </p>
          </div>
        </div>
      </section>

      {/* Task Notes Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5B536]/10 text-[#F5B536] text-sm font-semibold mb-6">
                <MessageSquare className="w-4 h-4" />
                Task Notes
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Add Context to Every Task
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Managers can add notes against any task to capture important context — whether a 
                task is delayed, needs attention, or has updates discussed in a meeting.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Track Delays & Blockers</h4>
                    <p className="text-sm text-muted-foreground">
                      Document why a task is delayed and what's needed to move forward
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Capture Meeting Discussions</h4>
                    <p className="text-sm text-muted-foreground">
                      Record important decisions and updates discussed in team meetings
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Timestamped History</h4>
                    <p className="text-sm text-muted-foreground">
                      Every note is timestamped with the author, creating a clear audit trail
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#F5B536]/5 border border-[#F5B536]/10">
                <p className="text-[#F5B536] font-medium">
                  Keep everyone informed with contextual task notes.
                </p>
              </div>
            </div>
            <div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img src={calendarNotes} alt="Task Notes - Add context and updates to any task" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bosdrive Sync Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#8CC646]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img src={calendarBosdriveSync} alt="Sync task notes to Bosdrive as meeting minutes" className="w-full h-auto" />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8CC646]/10 text-[#8CC646] text-sm font-semibold mb-6">
                <RefreshCw className="w-4 h-4" />
                Bosdrive Integration
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Convert Notes to Meeting Minutes
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Task notes can be synced with Bosdrive and automatically converted into a 
                professionally formatted meeting minutes document — ready to be accessed by management.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">One-Click Sync</h4>
                    <p className="text-sm text-muted-foreground">
                      Export notes directly to Bosdrive with a single click
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Professional Formatting</h4>
                    <p className="text-sm text-muted-foreground">
                      Notes are automatically formatted into clear meeting minutes documents
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Centralised Access</h4>
                    <p className="text-sm text-muted-foreground">
                      All meeting minutes stored in one place for easy reference by management
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#8CC646]/5 border border-[#8CC646]/10">
                <p className="text-[#8CC646] font-medium">
                  Turn task discussions into documented meeting minutes effortlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Priority Dashboard Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#176884]/10 text-[#176884] text-sm font-semibold mb-6">
              <FileText className="w-4 h-4" />
              Priority Overview
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              See Priorities at a Glance
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              The Task Calendar shows you a clear breakdown of high, medium, and low priority tasks, 
              helping you and your team focus on what matters most.
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-white shadow-lg border-l-4 border-[#DF4C33]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#DF4C33]/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-[#DF4C33]">!</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">High Priority</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Critical tasks that need immediate attention. See the count of urgent items at a glance.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white shadow-lg border-l-4 border-[#F5B536]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#F5B536]/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-[#F5B536]">•</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Medium Priority</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Important tasks that should be completed soon. Stay on top of your regular workload.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-white shadow-lg border-l-4 border-[#8CC646]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#8CC646]/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-[#8CC646]">○</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Low Priority</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Tasks that can wait. Plan ahead and tackle them when higher priorities are complete.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-[#E4452C] to-[#E4452C]/80">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Ready to Take Control of Your Deadlines?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Start your free trial today and experience the power of visual task management 
            with the Bosplan.com Task Calendar.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" className="bg-white text-[#E4452C] hover:bg-white/90 font-semibold shadow-lg" asChild>
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button size="lg" className="bg-white text-[#E4452C] hover:bg-white/90 font-semibold shadow-lg" asChild>
              <Link to="/welcome">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground border-t">
        <p>© 2026 Bosplan.com. All rights reserved.</p>
      </footer>
    </div>;
};
export default CalendarExplainer;