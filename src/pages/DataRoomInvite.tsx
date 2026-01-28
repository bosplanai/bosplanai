import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, XCircle, FileText, Building2, Mail, Shield, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Supabase URL for edge function calls
const SUPABASE_URL = "https://qiikjhvzlwzysbtzhdcd.supabase.co";

interface InviteDetails {
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

const DataRoomInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [ndaSigned, setNdaSigned] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [accessId, setAccessId] = useState<string | null>(null);
  
  // Email verification state
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
    }
  }, [token]);

  const handleVerifyEmail = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/get-nda-details?token=${token}&email=${encodeURIComponent(email.trim().toLowerCase())}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("The email address you entered does not match this invitation");
        }
        throw new Error(result.error || "Failed to verify invitation");
      }

      // Map the API response to the expected frontend format
      const mappedDetails: InviteDetails = {
        invite: {
          email: result.invite.email,
          ndaSigned: result.invite.ndaSigned,
          ndaSignedAt: result.invite.ndaSignedAt,
        },
        dataRoom: {
          name: result.data_room?.name || "",
          ndaRequired: result.data_room?.nda_required || false,
          ndaContent: result.data_room?.nda_content || null,
          organizationName: result.data_room?.organization?.name || "",
        },
      };
      setInviteDetails(mappedDetails);
      setNdaSigned(mappedDetails.invite.ndaSigned);
      setEmailVerified(true);
    } catch (err) {
      console.error("Error verifying email:", err);
      setError(err instanceof Error ? err.message : "Failed to verify invitation");
    } finally {
      setVerifying(false);
    }
  };

  const handleSignNda = async () => {
    if (!signerName.trim()) {
      toast.error("Please enter your full legal name");
      return;
    }

    if (!agreed) {
      toast.error("Please agree to the NDA terms");
      return;
    }

    setSigning(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/sign-nda`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            signerName: signerName.trim(),
            signerEmail: email.trim().toLowerCase(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to sign NDA");
      }

      setNdaSigned(true);
      toast.success("NDA signed successfully");
    } catch (err) {
      console.error("Error signing NDA:", err);
      toast.error(err instanceof Error ? err.message : "Failed to sign NDA");
    } finally {
      setSigning(false);
    }
  };

  const handleAcceptInvite = async () => {
    setAccepting(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/accept-data-room-invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            token,
            email: email.trim().toLowerCase(),
            origin: window.location.origin,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to accept invitation");
      }

      // Store the accessId for navigation
      if (result.accessId) {
        setAccessId(result.accessId);
      }

      setAccepted(true);
      toast.success("Invitation accepted!");
    } catch (err) {
      console.error("Error accepting invite:", err);
      toast.error(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground">No invitation token provided</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email verification step
  if (!emailVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Verify Your Email</CardTitle>
            <CardDescription>
              Please enter your email address to access this invitation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyEmail()}
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address that received this invitation
              </p>
            </div>
            <Button
              onClick={handleVerifyEmail}
              disabled={verifying || !email.trim()}
              className="w-full"
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state if email is verified but invite details not yet loaded
  if (emailVerified && !inviteDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invitation details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitation Accepted!</h2>
            <p className="text-muted-foreground mb-4">
              You now have access to the <strong>{inviteDetails?.dataRoom?.name}</strong> data room.
            </p>
            <div className="space-y-3 mt-6">
              {accessId && (
                <Button 
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => navigate(`/guest-dataroom?accessId=${accessId}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Data Room
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                You can also access the data room anytime using the link sent to your email.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const needsNdaSignature = inviteDetails?.dataRoom?.ndaRequired && !ndaSigned;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Invitation Header */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Data Room Invitation</CardTitle>
            <CardDescription>
              You've been invited to collaborate on a secure data room
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Organisation</p>
                  <p className="font-medium">{inviteDetails?.dataRoom.organizationName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Data Room</p>
                  <p className="font-medium">{inviteDetails?.dataRoom.name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Verified Email</p>
                <p className="font-medium">{email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NDA Section */}
        {inviteDetails?.dataRoom?.ndaRequired && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Non-Disclosure Agreement</CardTitle>
              </div>
              <CardDescription>
                {ndaSigned 
                  ? "You have signed the NDA for this data room"
                  : "Please read and sign the NDA to continue"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {ndaSigned ? (
                <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">NDA Signed</span>
                </div>
              ) : (
                <>
                  {inviteDetails?.dataRoom?.ndaContent && (
                    <ScrollArea className="h-64 rounded-lg border p-4 bg-muted/30">
                      <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                        {inviteDetails.dataRoom.ndaContent}
                      </div>
                    </ScrollArea>
                  )}

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="signerName">Full Legal Name</Label>
                      <Input
                        id="signerName"
                        placeholder="Enter your full legal name"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                      />
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agree"
                        checked={agreed}
                        onCheckedChange={(checked) => setAgreed(checked === true)}
                      />
                      <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                        I have read and agree to the terms of this Non-Disclosure Agreement. I understand
                        that this constitutes a legally binding agreement.
                      </Label>
                    </div>

                    <Button
                      onClick={handleSignNda}
                      disabled={signing || !signerName.trim() || !agreed}
                      className="w-full"
                    >
                      {signing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing...
                        </>
                      ) : (
                        "Sign NDA"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Accept Invitation */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleAcceptInvite}
              disabled={accepting || needsNdaSignature}
              className="w-full"
              size="lg"
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : needsNdaSignature ? (
                "Please sign the NDA first"
              ) : (
                "Accept Invitation"
              )}
            </Button>
            {needsNdaSignature && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                You must sign the NDA before accepting the invitation
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DataRoomInvite;