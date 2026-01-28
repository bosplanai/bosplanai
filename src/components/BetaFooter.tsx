import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

const BetaFooter = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800 px-4 py-2 md:ml-16">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
        <p className="text-center">
          <span className="font-semibold">BETA Product:</span> Please note that this version of Bosplan.com is being used for BETA testing. To allow us to keep improving and offer a free product, please fill out the form with any feedback.
        </p>
        <Link 
          to="/feedback-form" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full font-medium transition-colors whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Give Feedback
        </Link>
      </div>
    </footer>
  );
};

export default BetaFooter;
