import { Link } from "react-router-dom";
import bosplanLogoFull from "@/assets/bosplan-logo-welcome.png";

const WelcomeFooter = () => {
  return (
    <footer className="container mx-auto px-4 py-8 border-t border-[#176884]/20 mt-16 bg-white">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link to="/welcome">
            <img 
              alt="BOSPLAN" 
              className="h-8 w-auto" 
              src={bosplanLogoFull} 
            />
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <Link 
            to="/terms-and-conditions" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms and Conditions
          </Link>
          <Link 
            to="/privacy-policy" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
          <p className="text-sm text-muted-foreground">
            © 2026 BOSPLAN AI LIMITED. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default WelcomeFooter;
