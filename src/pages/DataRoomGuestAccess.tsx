// @ts-nocheck
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Shield, CheckCircle, Lock, FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import bosplanLogo from "@/assets/bosplan-logo.png";

interface InviteDetails {
  id: string;
  email: string;
  status: string;
  nda_signed_at: string | null;
  access_id: string | null;
  guest_name: string | null;
  data_room: {
    id: string;
    name: string;
    description: string | null;
    nda_required: boolean;
    nda_content: string | null;
    organization: {
      name: string;
    };
  };
}

const DataRoomGuestAccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [step, setStep] = useState<"verify" | "nda" | "success">("verify");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  
  // Form state
  const [email, setEmail] = useState("");
  const [accessId, setAccessId] = useState("");
  const [name, setName] = useState("");
  const [agreedToNda, setAgreedToNda] = useState(false);
  const [signing, setSigning] = useState(false);

  // Get token from URL
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      // If we have a token, we can try to fetch details
      fetchInviteDetails();
    }
  }, [token]);

  const fetchInviteDetails = async () => {
    if (!token || !email) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-nda-details", {
        body: { token, email },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setInviteDetails(data);
      
      // Check if NDA already signed
      if (data.nda_signed_at) {
        setStep("success");
      } else if (data.data_room?.nda_required) {
        setStep("nda");
      } else {
        setStep("success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify access");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!email.trim() || !accessId.trim()) {
      setError("Please enter your email and access ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find invite by access_id and email
      const { data: invite, error: inviteError } = await supabase
        .from("data_room_invites")
        .select(`
          id,
          email,
          status,
          nda_signed_at,
          access_id,
          guest_name,
          token,
          data_room:data_room_id(
            id,
            name,
            description,
            nda_required,
            nda_content,
            organization:organization_id(name)
          )
        `)
        .eq("access_id", accessId.toUpperCase())
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (inviteError) throw inviteError;

      if (!invite) {
        throw new Error("Invalid access ID or email. Please check your invitation email.");
      }

      if (invite.status === "expired") {
        throw new Error("This invitation has expired. Please contact the sender for a new invitation.");
      }

      setInviteDetails(invite as unknown as InviteDetails);
      
      // Check if NDA already signed
      if (invite.nda_signed_at) {
        setStep("success");
      } else if (invite.data_room?.nda_required) {
        setStep("nda");
      } else {
        // No NDA required, accept invite
        await acceptInvite(invite.token);
        setStep("success");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async (inviteToken: string) => {
    const { error } = await supabase.functions.invoke("accept-data-room-invite", {
      body: { token: inviteToken, email: email.toLowerCase() },
    });

    if (error) throw error;
  };

  const handleSignNda = async () => {
    if (!name.trim() || !agreedToNda || !inviteDetails) {
      setError("Please enter your name and agree to the terms");
      return;
    }

    setSigning(true);
    setError(null);

    try {
      // Sign NDA via edge function
      const { error: signError } = await supabase.functions.invoke("sign-nda", {
        body: {
          token: token || inviteDetails.access_id,
          signerName: name,
          signerEmail: email,
        },
      });

      if (signError) throw signError;

      // Update guest name
      if (name !== inviteDetails.guest_name) {
        await supabase
          .from("data_room_invites")
          .update({ guest_name: name })
          .eq("id", inviteDetails.id);
      }

      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign NDA");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="text-center mb-8">
          <img
            src={bosplanLogo}
            alt="Bosplan"
            className="h-10 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">Data Room Access</h1>
          <p className="text-muted-foreground mt-1">
            Secure document collaboration
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Access ID</Label>
              <Input
                type="text"
                placeholder="e.g. A1B2C3D4"
                value={accessId}
                onChange={(e) => setAccessId(e.target.value.toUpperCase())}
                className="mt-1 font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can find your Access ID in the invitation email
              </p>
            </div>
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Access Data Room
                </>
              )}
            </Button>
          </div>
        )}

        {step === "nda" && inviteDetails && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 p-3 rounded-lg mb-4">
              <Shield className="w-5 h-5" />
              <div>
                <p className="font-medium">NDA Required</p>
                <p className="text-xs">
                  You must sign a Non-Disclosure Agreement to access this data room
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-1">
                {inviteDetails.data_room.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {inviteDetails.data_room.organization?.name}
              </p>
            </div>

            {inviteDetails.data_room.nda_content && (
              <div className="border rounded-lg p-4 max-h-[200px] overflow-y-auto">
                <Textarea
                  value={inviteDetails.data_room.nda_content}
                  readOnly
                  className="min-h-[150px] resize-none border-0 p-0"
                />
              </div>
            )}

            <div>
              <Label>Your Full Name</Label>
              <Input
                type="text"
                placeholder="Enter your full legal name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="agree-nda"
                checked={agreedToNda}
                onCheckedChange={(checked) => setAgreedToNda(checked as boolean)}
              />
              <Label htmlFor="agree-nda" className="text-sm leading-relaxed">
                I have read and agree to the Non-Disclosure Agreement terms above
              </Label>
            </div>

            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              onClick={handleSignNda}
              disabled={signing || !name.trim() || !agreedToNda}
            >
              {signing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <FileSignature className="w-4 h-4 mr-2" />
                  Sign NDA & Continue
                </>
              )}
            </Button>
          </div>
        )}

        {step === "success" && inviteDetails && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Access Granted!</h2>
            <p className="text-muted-foreground">
              You now have access to the data room{" "}
              <span className="font-medium text-foreground">
                "{inviteDetails.data_room.name}"
              </span>
            </p>
            <div className="pt-4 space-y-2">
              <Button
                className="w-full bg-emerald-500 hover:bg-emerald-600"
                onClick={() => navigate(`/guest-dataroom?accessId=${accessId}`)}
              >
                View Data Room
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
              >
                Return Home
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default DataRoomGuestAccess;
