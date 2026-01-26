import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import bosplanLogo from "@/assets/bosplan-logo-full.png";

const TermsAndConditions = () => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("setting_value")
          .eq("setting_key", "terms_and_conditions")
          .single();

        if (error) throw error;
        setContent(data?.setting_value || "");
      } catch (error) {
        console.error("Error fetching terms and conditions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex items-center justify-center mb-8">
          <img src={bosplanLogo} alt="Bosplan" className="h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground text-center mb-8">
          Terms and Conditions
        </h1>
        
        <div className="bg-card border border-border rounded-lg p-8">
          {content ? (
            <div 
              className="prose prose-slate dark:prose-invert max-w-none text-foreground whitespace-pre-wrap"
            >
              {content}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No terms and conditions have been published yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;