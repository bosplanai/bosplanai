import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import bosplanLogoFull from "@/assets/bosplan-logo-welcome.png";
import bosplanLogoSmall from "@/assets/bosplan-logo-icon.png";

const navItems = [{
  label: "Home",
  path: "/welcome"
}, {
  label: "Tools",
  path: "/tools"
}, {
  label: "Bosdrive",
  path: "/bosdrive"
}, {
  label: "Projects",
  path: "/projects2"
}, {
  label: "Calendar",
  path: "/calendar2"
}, {
  label: "Pricing",
  path: "/pricing"
}];
interface WelcomeHeaderProps {
  variant?: "default" | "large-logo";
}
const WelcomeHeader = ({
  variant = "default"
}: WelcomeHeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isActive = (path: string) => {
    if (path === "/welcome") {
      return location.pathname === "/welcome" || location.pathname === "/";
    }
    return location.pathname === path;
  };
  const logoSrc = bosplanLogoFull;
  const smallLogoSrc = bosplanLogoSmall;
  return <header className="container mx-auto px-4 py-6 bg-white">
      <nav className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/welcome">
            {variant === "large-logo" ? <img alt="Bosplan.com" className="h-16 sm:h-20 md:h-24 w-auto object-contain" src={logoSrc} /> : <img alt="BOSPLAN.COM" className="h-8 w-auto" src={smallLogoSrc} />}
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {navItems.map(item => <Link key={item.path} to={item.path} className={`text-sm font-medium transition-colors ${isActive(item.path) ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {item.label}
            </Link>)}
          <Button className="bg-[#176884] text-white hover:bg-[#176884]/90" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col gap-6 mt-8">
                <div className="flex items-center justify-between">
                  <img alt="BOSPLAN.COM" className="h-8 w-auto" src={smallLogoSrc} />
                </div>
                <nav className="flex flex-col gap-4">
                  {navItems.map(item => <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className={`text-base font-medium py-2 px-3 rounded-lg transition-colors ${isActive(item.path) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                      {item.label}
                    </Link>)}
                </nav>
                <Button className="w-full bg-[#176884] text-white hover:bg-[#176884]/90" onClick={() => {
                setMobileMenuOpen(false);
                navigate("/auth");
              }}>
                  Sign In
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>;
};
export default WelcomeHeader;