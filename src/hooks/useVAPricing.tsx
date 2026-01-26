import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface VAPricing {
  id: string;
  hours_package: number;
  price_cents: number;
  stripe_price_id: string;
}

export const useVAPricing = () => {
  const [pricing, setPricing] = useState<VAPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPricing = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await (supabase.from("va_pricing" as any) as any)
        .select("*")
        .order("hours_package", { ascending: true });

      if (fetchError) throw fetchError;
      setPricing(data || []);
    } catch (err: any) {
      console.error("Error fetching VA pricing:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const getPriceForPackage = (hours: number): number => {
    const pkg = pricing.find(p => p.hours_package === hours);
    return pkg ? pkg.price_cents / 100 : 0;
  };

  return {
    pricing,
    loading,
    error,
    refetch: fetchPricing,
    getPriceForPackage,
  };
};
