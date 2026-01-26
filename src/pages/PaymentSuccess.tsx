import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const STORAGE_SESSION_KEY = "pending_storage_purchase";

interface StoragePurchaseInfo {
  sessionId: string;
  product: "drive" | "dataroom";
  orgId: string;
  orgSlug: string;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const hasVerifiedRef = useRef(false);

  const sessionId = searchParams.get("session_id");
  const storagePurchase = searchParams.get("storage_purchase");
  const product = searchParams.get("product") as "drive" | "dataroom" | null;
  const orgId = searchParams.get("org_id");
  const orgSlug = searchParams.get("org_slug");

  // On mount, if this is a storage purchase, persist to sessionStorage
  useEffect(() => {
    if (storagePurchase === "success" && sessionId && product && orgId && orgSlug) {
      const purchaseInfo: StoragePurchaseInfo = { sessionId, product, orgId, orgSlug };
      sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(purchaseInfo));
    }
  }, [storagePurchase, sessionId, product, orgId, orgSlug]);

  // Verify storage purchase once user is authenticated
  useEffect(() => {
    if (authLoading || hasVerifiedRef.current) return;

    const verifyStoragePurchase = async () => {
      // Try to get purchase info from URL params first, then sessionStorage
      let purchaseInfo: StoragePurchaseInfo | null = null;
      
      if (storagePurchase === "success" && sessionId && product && orgId && orgSlug) {
        purchaseInfo = { sessionId, product, orgId, orgSlug };
      } else {
        const stored = sessionStorage.getItem(STORAGE_SESSION_KEY);
        if (stored) {
          try {
            purchaseInfo = JSON.parse(stored);
          } catch {
            // Invalid stored data
          }
        }
      }

      if (!purchaseInfo) {
        setLoading(false);
        return;
      }

      // Must be authenticated to verify
      if (!user) {
        setLoading(false);
        return;
      }

      hasVerifiedRef.current = true;
      setVerifying(true);

      try {
        const verifyFunction = purchaseInfo.product === "drive" 
          ? "verify-storage-purchase" 
          : "verify-dataroom-storage-purchase";

        toast.loading("Verifying your purchase...", { id: "verify-storage" });

        const { data, error } = await supabase.functions.invoke(verifyFunction, {
          body: { sessionId: purchaseInfo.sessionId }
        });

        toast.dismiss("verify-storage");

        if (error) throw error;

        if (data?.success) {
          setVerified(true);
          
          // Show success message
          if (data?.message !== "Purchase already processed") {
            const amount = purchaseInfo.product === "drive" 
              ? `${data.storageGb}GB` 
              : `${data.storageMb || Math.round((data.storageGb || 0) * 1024)}MB`;
            toast.success(`Successfully added ${amount} of storage!`);
          } else {
            toast.success("Storage has been added to your account!");
          }

          // Invalidate storage queries
          const queryKey = purchaseInfo.product === "drive" 
            ? ["drive-storage", purchaseInfo.orgId]
            : ["dataroom-storage", purchaseInfo.orgId];
          
          await queryClient.invalidateQueries({ queryKey });
          await queryClient.refetchQueries({ queryKey, exact: true });

          // Clear stored purchase info
          sessionStorage.removeItem(STORAGE_SESSION_KEY);

          // Redirect to the correct product page after a short delay
          setTimeout(() => {
            const targetPath = `/${purchaseInfo!.orgSlug}/${purchaseInfo!.product === "drive" ? "drive" : "dataroom"}`;
            navigate(targetPath, { replace: true });
          }, 1500);
        } else {
          toast.error(data?.message || "Purchase verification failed");
          setLoading(false);
        }
      } catch (error) {
        console.error("Storage purchase verification error:", error);
        toast.error("Failed to verify purchase. Please contact support.");
        setLoading(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyStoragePurchase();
  }, [user, authLoading, storagePurchase, sessionId, product, orgId, orgSlug, queryClient, navigate]);

  // Handle non-storage payment verification (original behavior)
  useEffect(() => {
    const fetchSessionData = async () => {
      // Skip if this is a storage purchase
      if (storagePurchase === "success" || sessionStorage.getItem(STORAGE_SESSION_KEY)) {
        return;
      }

      if (!sessionId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-checkout-session", {
          body: { sessionId },
        });

        if (error) throw error;
        setSessionData(data);
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, storagePurchase]);

  const handleContinue = () => {
    if (user) {
      navigate("/");
    } else {
      // Pass session data to auth page for pre-filling
      const params = new URLSearchParams();
      params.set("checkout_success", "true");
      if (sessionId) params.set("session_id", sessionId);
      navigate(`/auth?${params.toString()}`);
    }
  };

  // Show loading state for storage purchase verification
  if (verifying || (storagePurchase === "success" && !verified && user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying your storage purchase...</p>
      </div>
    );
  }

  // Show success and redirect message for verified storage purchase
  if (verified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">Storage Added Successfully!</h2>
        <p className="text-muted-foreground">Redirecting you back...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Default payment success UI (for non-storage purchases)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription className="text-base">
            Your 30-day free trial has been activated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {sessionData?.customerEmail && (
                <span className="block">
                  <strong>Email:</strong> {sessionData.customerEmail}
                </span>
              )}
              {sessionData?.planType && (
                <span className="block">
                  <strong>Plan:</strong> {sessionData.planType === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              )}
              <span className="block">
                <strong>Trial ends:</strong> 30 days from now
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Next Steps:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Create your account with your email</li>
              <li>Set up your organisation profile</li>
              <li>Start using BOSPLAN.COM</li>
            </ol>
          </div>

          <Button onClick={handleContinue} className="w-full" size="lg">
            {user ? "Go to Dashboard" : "Create Your Account"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
