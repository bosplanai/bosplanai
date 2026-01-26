import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useVAPricing } from "@/hooks/useVAPricing";

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistantTitle: string;
  assistantId: string;
}

const packageDescriptions: Record<number, { label: string; description: string; popular?: boolean }> = {
  40: { label: "40 Hours", description: "Perfect for part-time support" },
  80: { label: "80 Hours", description: "Ideal for regular assistance", popular: true },
  160: { label: "160 Hours", description: "Full-time dedicated support" },
};

const PurchaseDialog = ({ open, onOpenChange, assistantTitle, assistantId }: PurchaseDialogProps) => {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { pricing, loading: pricingLoading, getPriceForPackage } = useVAPricing();

  const handlePurchase = async () => {
    if (selectedPackage === null) {
      toast.error("Please select a package");
      return;
    }

    const pkg = pricing[selectedPackage];
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-va-checkout", {
        body: {
          hoursPackage: String(pkg.hours_package),
          assistantType: assistantId,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
        onOpenChange(false);
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Hire {assistantTitle}</DialogTitle>
          <DialogDescription>
            Select the number of hours per month for your virtual assistant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {pricingLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </>
          ) : (
            pricing.map((pkg, index) => {
              const meta = packageDescriptions[pkg.hours_package] || { 
                label: `${pkg.hours_package} Hours`, 
                description: "Monthly support" 
              };
              const price = pkg.price_cents / 100;
              
              return (
                <Card
                  key={pkg.hours_package}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedPackage === index
                      ? "border-[#176884] ring-2 ring-[#176884]/20"
                      : "hover:border-[#176884]/50"
                  }`}
                  onClick={() => setSelectedPackage(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedPackage === index
                              ? "border-[#176884] bg-[#176884]"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {selectedPackage === index && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#176884]" />
                            <span className="font-semibold">{meta.label}</span>
                            {meta.popular && (
                              <Badge className="bg-[#176884] text-white border-0 text-xs">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {meta.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold">${price}</span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={selectedPackage === null || isLoading || pricingLoading}
            className="bg-[#176884] hover:bg-[#176884]/90 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue to Checkout"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseDialog;
