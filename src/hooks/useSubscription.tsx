import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionInfo {
  subscribed: boolean;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plan_type: string | null;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export const useSubscription = () => {
  const { session, user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!session) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      setSubscription(data);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching subscription:", err);
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Refresh subscription every minute
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(fetchSubscription, 60000);
    return () => clearInterval(interval);
  }, [session, fetchSubscription]);

  const isTrialing = subscription?.status === 'trialing';
  const isActive = subscription?.subscribed === true;
  const trialDaysLeft = subscription?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
    isTrialing,
    isActive,
    trialDaysLeft,
  };
};
