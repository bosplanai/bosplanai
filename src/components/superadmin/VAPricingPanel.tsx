import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DollarSign, ChevronDown, Save, Loader2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VAPricing {
  id: string;
  hours_package: number;
  price_cents: number;
  stripe_price_id: string;
  updated_at: string;
}

const packageDescriptions: Record<number, string> = {
  40: "Part-time support",
  80: "Regular assistance",
  160: "Full-time dedicated",
};

const VAPricingPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricing, setPricing] = useState<VAPricing[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});

  const fetchPricing = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase.from("va_pricing" as any) as any)
        .select("*")
        .order("hours_package", { ascending: true });

      if (error) throw error;
      setPricing(data || []);
      
      // Initialize edited prices
      const initialPrices: Record<number, string> = {};
      (data || []).forEach((p: VAPricing) => {
        initialPrices[p.hours_package] = String(p.price_cents / 100);
      });
      setEditedPrices(initialPrices);
    } catch (error: any) {
      console.error("Error fetching VA pricing:", error);
      toast.error("Failed to load pricing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPricing();
    }
  }, [isOpen]);

  const handlePriceChange = (hoursPackage: number, value: string) => {
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setEditedPrices(prev => ({
      ...prev,
      [hoursPackage]: cleanValue,
    }));
  };

  const hasChanges = () => {
    return pricing.some(p => {
      const originalPrice = p.price_cents / 100;
      const editedPrice = parseFloat(editedPrices[p.hours_package] || "0");
      return originalPrice !== editedPrice;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Build the pricing updates
      const updates = pricing.map(p => ({
        hoursPackage: p.hours_package,
        priceCents: Math.round(parseFloat(editedPrices[p.hours_package] || "0") * 100),
      })).filter(u => {
        const original = pricing.find(p => p.hours_package === u.hoursPackage);
        return original && original.price_cents !== u.priceCents;
      });

      if (updates.length === 0) {
        toast.info("No changes to save");
        return;
      }

      // Validate prices
      for (const update of updates) {
        if (update.priceCents < 100) {
          toast.error(`Price for ${update.hoursPackage} hours must be at least $1`);
          return;
        }
      }

      const { data, error } = await supabase.functions.invoke("update-va-pricing", {
        body: { pricing: updates },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Pricing updated successfully");
      fetchPricing();
    } catch (error: any) {
      console.error("Error updating pricing:", error);
      toast.error(error.message || "Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <CardHeader className="cursor-pointer hover:bg-slate-700/30 transition-colors rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-base">Set Virtual Assistant Pricing</CardTitle>
                    <CardDescription className="text-slate-400">
                      Configure pricing for VA hour packages
                    </CardDescription>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Set the monthly subscription price for each VA hours package. Changes will update Stripe and reflect on customer checkout pages.
                </p>
                
                <div className="grid gap-4">
                  {pricing.map((p) => (
                    <div 
                      key={p.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-slate-600 bg-slate-900/50"
                    >
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <Clock className="w-4 h-4 text-pink-400" />
                        <div>
                          <span className="font-semibold text-white">{p.hours_package} Hours</span>
                          <p className="text-xs text-slate-400">{packageDescriptions[p.hours_package]}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-1">
                        <Label htmlFor={`price-${p.hours_package}`} className="text-slate-300 sr-only">
                          Price
                        </Label>
                        <div className="relative flex-1 max-w-[150px]">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                          <Input
                            id={`price-${p.hours_package}`}
                            type="text"
                            inputMode="decimal"
                            value={editedPrices[p.hours_package] || ""}
                            onChange={(e) => handlePriceChange(p.hours_package, e.target.value)}
                            className="pl-7 pr-12 bg-slate-800 border-slate-600 text-white text-right"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/mo</span>
                        </div>
                      </div>
                      
                      {p.hours_package === 80 && (
                        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50">
                          Popular
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !hasChanges()}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating Stripe...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Pricing
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default VAPricingPanel;
