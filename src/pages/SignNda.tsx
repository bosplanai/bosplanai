import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, CheckCircle, AlertCircle, Building2 } from "lucide-react";

interface NdaDetails {
  invite: {
    email: string;
    ndaSigned: boolean;
    ndaSignedAt: string | null;
  };
  dataRoom: {
    name: string;
    ndaRequired: boolean;
    ndaContent: string | null;
    organizationName: string;
  };
}

const SignNda = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [ndaDetails, setNdaDetails] = useState<NdaDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    fetchNdaDetails();
  }, [token]);

  const fetchNdaDetails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-nda-details", {
        body: null,
        method: "GET",
        headers: {},
      });

      // For GET requests with query params, we need to call differently
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-nda-details?token=${token}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch invitation details");
      }

      setNdaDetails(result);

      if (result.invite.ndaSigned) {
        setSigned(true);
      }
    } catch (err) {
      console.error("Error fetching NDA details:", err);
      setError(err instanceof Error ? err.message : "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleSignNda = async () => {
    if (!token || !ndaDetails || !signerName.trim() || !agreed) return;

    setSigning(true);
    try {
      const { data, error } = await supabase.functions.invoke("sign-nda", {
        body: {
          token,
          signerName: signerName.trim(),
          signerEmail: ndaDetails.invite.email,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSigned(true);
      toast({
        title: "NDA Signed Successfully",
        description: "You now have access to the data room.",
      });
    } catch (err) {
      console.error("Error signing NDA:", err);
      toast({
        title: "Failed to sign NDA",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate("/")} variant="outline">
            Go to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  if (!ndaDetails) {
    return null;
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">NDA Signed</h1>
          <p className="text-muted-foreground mb-6">
            Thank you for signing the NDA for <strong>{ndaDetails.dataRoom.name}</strong>.
            You will receive further instructions via email.
          </p>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Signed by: <strong>{ndaDetails.invite.email}</strong>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!ndaDetails.dataRoom.ndaRequired || !ndaDetails.dataRoom.ndaContent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold text-foreground mb-2">No NDA Required</h1>
          <p className="text-muted-foreground">
            This data room does not require an NDA signature.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full mb-4">
            <Building2 className="w-4 h-4" />
            <span className="text-sm font-medium">{ndaDetails.dataRoom.organizationName}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Non-Disclosure Agreement
          </h1>
          <p className="text-muted-foreground">
            Please review and sign the NDA to access <strong>{ndaDetails.dataRoom.name}</strong>
          </p>
        </div>

        {/* NDA Content */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-foreground">Agreement Terms</h2>
          </div>
          <div className="prose prose-sm max-w-none text-foreground">
            <div 
              className="whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto p-4 bg-muted/50 rounded-lg"
            >
              {ndaDetails.dataRoom.ndaContent}
            </div>
          </div>
        </Card>

        {/* Signing Form */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Sign the Agreement</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email Address</label>
              <Input 
                value={ndaDetails.invite.email} 
                disabled 
                className="bg-muted"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Full Legal Name</label>
              <Input
                placeholder="Enter your full legal name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <label htmlFor="agree" className="text-sm text-muted-foreground cursor-pointer">
                I have read, understood, and agree to be bound by the terms and conditions of this 
                Non-Disclosure Agreement. I acknowledge that this is a legally binding document.
              </label>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              size="lg"
              onClick={handleSignNda}
              disabled={!signerName.trim() || !agreed || signing}
            >
              {signing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                "Sign Agreement"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By signing, you agree that your electronic signature has the same legal effect as a handwritten signature.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignNda;
