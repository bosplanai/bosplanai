import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeatureUsageStat {
  feature_name: string;
  feature_category: string;
  total_visits: number;
  unique_users: number;
  unique_organizations: number;
  last_used_at: string | null;
  first_used_at: string | null;
  visits_last_24h: number;
  visits_last_7d: number;
  visits_last_30d: number;
}

export const useFeatureUsageStats = () => {
  return useQuery({
    queryKey: ["feature-usage-stats"],
    queryFn: async () => {
      // Query the view for aggregated stats
      const { data, error } = await supabase
        .from("feature_usage_stats")
        .select("*")
        .order("total_visits", { ascending: false });

      if (error) throw error;
      return (data || []) as FeatureUsageStat[];
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
};

export default useFeatureUsageStats;
