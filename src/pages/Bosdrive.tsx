import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, HardDrive, FileSignature, FolderLock, History, Shield, Users } from "lucide-react";
import WelcomeHeader from "@/components/WelcomeHeader";
import bosdriveHero from "@/assets/bosdrive-hero.png";
import bosdriveVersions from "@/assets/bosdrive-versions.png";
import bosdriveStatus from "@/assets/bosdrive-status.png";
import bosdriveScattered from "@/assets/bosdrive-scattered.png";
import bosdriveFiles from "@/assets/bosdrive-files.png";
import bosdriveSignature from "@/assets/bosdrive-signature.png";

const Bosdrive = () => {
  return (
    <div className="min-h-screen bg-[#ffffff]">
      <WelcomeHeader variant="large-logo" />

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4 bg-[#176884] text-white border-0 hover:bg-[#176884]/90 text-xs md:text-sm">
          <HardDrive className="w-3 h-3 mr-1" />
          Simple File Storage
        </Badge>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 md:mb-6">
          Bosdrive Turns Chaos into Clarity
        </h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-[#176884] mb-6">
          File Management Made Clear
        </h2>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
          Securely store, organise, and share files. Track review status and collaborate seamlessly.
          Work shouldn't slow down because no one knows where the latest file lives.
        </p>
        <p className="text-lg md:text-xl font-medium text-foreground max-w-2xl mx-auto mb-8">
          Let Bosdrive keep track of your files.
        </p>
        <Button
          size="lg"
          className="bg-[#176884] text-white hover:bg-[#176884]/90 font-semibold shadow-lg"
          asChild
        >
          <Link to="/auth">Start Free Trial</Link>
        </Button>
      </section>

      {/* Hero Image */}
      <section className="container mx-auto px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50">
            <img
              src={bosdriveHero}
              alt="Bosdrive - File Management Made Clear"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#176884]/5">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Everything Your Files Need
          </h2>
          <p className="text-lg text-muted-foreground">
            Our Bosdrive feature from Bosplan.com allows you to keep track of your files, 
            their version history, and review status.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#8CC646]/10 flex items-center justify-center">
              <FileSignature className="w-7 h-7 text-[#8CC646]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Electronic Document Signing</h3>
            <p className="text-sm text-muted-foreground">
              Sign documents digitally with legally binding electronic signatures. No printing or scanning required.
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#F5B536]/10 flex items-center justify-center">
              <Shield className="w-7 h-7 text-[#F5B536]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Contract Management</h3>
            <p className="text-sm text-muted-foreground">
              Store, track, and manage all your contracts in one secure location with version control.
            </p>
          </div>

          <div className="text-center p-6 rounded-xl bg-white shadow-lg border border-slate-100">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#176884]/10 flex items-center justify-center">
              <FolderLock className="w-7 h-7 text-[#176884]" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Secure Data Rooms</h3>
            <p className="text-sm text-muted-foreground">
              Share confidential documents securely with external parties through NDA-protected data rooms.
            </p>
          </div>
        </div>
      </section>

      {/* Files Scattered Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img
                  src={bosdriveScattered}
                  alt="Files scattered everywhere - Bosplan keeps files together"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#DF4C33]/10 text-[#DF4C33] text-sm font-semibold mb-6">
                📁 Centralised Storage
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Files Scattered Everywhere?
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Emails, desktops, drives — your files live in too many places. Less friction behind 
                the scenes makes a real difference to the day.
              </p>
              <div className="p-4 rounded-lg bg-[#176884]/5 border border-[#176884]/10">
                <p className="text-[#176884] font-medium">
                  Bosplan keeps all shared files together and easy to find.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* File Status Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#8CC646]/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8CC646]/10 text-[#8CC646] text-sm font-semibold mb-6">
                ✅ Review Status
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                No Clear File Status?
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Is it still being edited, in review, or already outdated? Track the status of every 
                document at a glance without chasing colleagues for updates.
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-muted-foreground">Being Amended</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-muted-foreground">In Review</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-muted-foreground">Reviewed & Approved</span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#8CC646]/5 border border-[#8CC646]/10">
                <p className="text-[#8CC646] font-medium">
                  Bosplan shows the status of every file at a glance.
                </p>
              </div>
            </div>
            <div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img
                  src={bosdriveStatus}
                  alt="File status tracking - See review status at a glance"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Version History Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50">
                <img
                  src={bosdriveVersions}
                  alt="Version history - Always know which file is current"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F5B536]/10 text-[#F5B536] text-sm font-semibold mb-6">
                <History className="w-4 h-4" />
                Version Control
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Too Many File Versions?
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Final, Final-v2, Fin1... Which file is actually the latest? Stop the confusion 
                and always know which version is current.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Full version history for every document</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">Restore previous versions with one click</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#F5B536]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#F5B536]" />
                  </div>
                  <div>
                    <p className="text-muted-foreground">See who made changes and when</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-[#F5B536]/5 border border-[#F5B536]/10">
                <p className="text-[#F5B536] font-medium">
                  With Bosplan, you always know which version of the file is current.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* File Interface Section */}
      <section className="container mx-auto px-4 py-16 bg-gradient-to-b from-white to-[#176884]/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#176884]/10 text-[#176884] text-sm font-semibold mb-6">
              <Users className="w-4 h-4" />
              Easy Collaboration
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              A Clean, Intuitive Interface
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Upload files, create folders, filter by status — everything you need to manage 
              documents without complexity.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
            <img
              src={bosdriveFiles}
              alt="Bosdrive file interface - Clean and intuitive"
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Digital Signature Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8CC646]/10 text-[#8CC646] text-sm font-semibold mb-6">
                <FileSignature className="w-4 h-4" />
                Digital Signatures
              </div>
              <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
                Sign Documents Electronically
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                No more printing, signing, scanning, and emailing. Sign contracts and agreements 
                directly in Bosdrive with legally binding electronic signatures.
              </p>
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Draw, Type, or Upload</h4>
                    <p className="text-sm text-muted-foreground">
                      Multiple signature options to suit your preference
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Save Signatures</h4>
                    <p className="text-sm text-muted-foreground">
                      Save your signature for quick reuse on future documents
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-[#8CC646]/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-[#8CC646]" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Secure & Traceable</h4>
                    <p className="text-sm text-muted-foreground">
                      Full audit trail of who signed what and when
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
                <img
                  src={bosdriveSignature}
                  alt="Electronic document signing in Bosdrive"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center p-12 rounded-2xl bg-gradient-to-br from-[#176884] to-[#176884]/80">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Ready to Simplify Your File Management?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of teams who have eliminated file chaos with Bosdrive. 
            Start your free trial today.
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
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Bosplan.com. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/terms-and-conditions"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms and Conditions
            </Link>
            <a
              href="https://www.bosplan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              www.bosplan.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Bosdrive;
