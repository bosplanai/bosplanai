import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

const BetaFooter = () => {
  return (
    <footer className="w-full bg-muted/50 border-t border-border px-4 py-3 pb-20 md:pb-3">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
        <p className="text-center">
          <span className="font-semibold text-foreground">BETA Product (V4):</span> This version of Bosplan.com is being used for BETA testing. Please share your feedback to help us improve.
        </p>
        <Link 
          to="/feedback-form" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-medium transition-colors whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Give Feedback
        </Link>
      </div>
    </footer>
  );
};

export default BetaFooter;
