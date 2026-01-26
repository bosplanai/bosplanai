import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Flame, Snowflake, TrendingUp, Users, Building2, Clock } from "lucide-react";
import { useFeatureUsageStats, FeatureUsageStat } from "@/hooks/useFeatureUsageStats";
import { formatDistanceToNow } from "date-fns";

// Group features by category
const groupByCategory = (stats: FeatureUsageStat[]): Record<string, FeatureUsageStat[]> => {
  return stats.reduce((acc, stat) => {
    if (!acc[stat.feature_category]) {
      acc[stat.feature_category] = [];
    }
    acc[stat.feature_category].push(stat);
    return acc;
  }, {} as Record<string, FeatureUsageStat[]>);
};

// Calculate heat level (0-100) based on relative usage
const calculateHeatLevel = (visits: number, maxVisits: number): number => {
  if (maxVisits === 0) return 0;
  return Math.round((visits / maxVisits) * 100);
};

// Get color based on heat level
const getHeatColor = (heatLevel: number): string => {
  if (heatLevel >= 80) return "bg-red-500";
  if (heatLevel >= 60) return "bg-orange-500";
  if (heatLevel >= 40) return "bg-amber-500";
  if (heatLevel >= 20) return "bg-yellow-500";
  if (heatLevel > 0) return "bg-blue-400";
  return "bg-slate-600";
};

// Get text color based on heat level
const getHeatTextColor = (heatLevel: number): string => {
  if (heatLevel >= 80) return "text-red-400";
  if (heatLevel >= 60) return "text-orange-400";
  if (heatLevel >= 40) return "text-amber-400";
  if (heatLevel >= 20) return "text-yellow-400";
  if (heatLevel > 0) return "text-blue-300";
  return "text-slate-400";
};

// Get label based on heat level
const getHeatLabel = (heatLevel: number): string => {
  if (heatLevel >= 80) return "Very Hot";
  if (heatLevel >= 60) return "Hot";
  if (heatLevel >= 40) return "Warm";
  if (heatLevel >= 20) return "Cool";
  if (heatLevel > 0) return "Cold";
  return "Inactive";
};

interface FeatureCardProps {
  stat: FeatureUsageStat;
  maxVisits: number;
}

const FeatureCard = ({ stat, maxVisits }: FeatureCardProps) => {
  const heatLevel = calculateHeatLevel(stat.total_visits, maxVisits);
  const heatColor = getHeatColor(heatLevel);
  const heatTextColor = getHeatTextColor(heatLevel);
  const heatLabel = getHeatLabel(heatLevel);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer group">
            {/* Heat indicator bar */}
            <div 
              className={`absolute top-0 left-0 h-1 rounded-t-lg transition-all ${heatColor}`}
              style={{ width: `${heatLevel}%` }}
            />
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white truncate">{stat.feature_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-semibold ${heatTextColor}`}>
                    {stat.total_visits.toLocaleString()} visits
                  </span>
                  {heatLevel >= 60 && <Flame className="w-3 h-3 text-orange-400" />}
                  {heatLevel <= 20 && heatLevel > 0 && <Snowflake className="w-3 h-3 text-blue-400" />}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-lg ${heatColor} bg-opacity-20 flex items-center justify-center`}>
                <span className={`text-sm font-bold ${heatTextColor}`}>{heatLevel}</span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs bg-slate-800 border-slate-700">
          <div className="space-y-2 p-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 text-xs">Heat Level:</span>
              <Badge variant="outline" className={`${heatTextColor} border-current text-xs`}>
                {heatLabel}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Users className="w-3 h-3 text-slate-400" />
                <span className="text-white">{stat.unique_users} users</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span className="text-white">{stat.unique_organizations} orgs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-slate-400" />
                <span className="text-white">{stat.visits_last_7d} last 7d</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className="text-white">
                  {stat.last_used_at 
                    ? formatDistanceToNow(new Date(stat.last_used_at), { addSuffix: true })
                    : "Never"}
                </span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const CustomerActivityHeatmap = () => {
  const { data: stats = [], isLoading, error } = useFeatureUsageStats();

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6">
          <p className="text-red-400 text-sm">Failed to load activity data</p>
        </CardContent>
      </Card>
    );
  }

  const groupedStats = groupByCategory(stats);
  const maxVisits = Math.max(...stats.map(s => s.total_visits), 1);
  const totalVisits = stats.reduce((sum, s) => sum + s.total_visits, 0);
  const totalUniqueUsers = new Set(stats.flatMap(s => Array(s.unique_users).fill(0))).size || 
    Math.max(...stats.map(s => s.unique_users), 0);

  // Sort categories by total usage
  const sortedCategories = Object.entries(groupedStats).sort((a, b) => {
    const aTotal = a[1].reduce((sum, s) => sum + s.total_visits, 0);
    const bTotal = b[1].reduce((sum, s) => sum + s.total_visits, 0);
    return bTotal - aTotal;
  });

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              Customer Activity
            </CardTitle>
            <CardDescription className="text-slate-400">
              Feature usage heatmap across the platform
            </CardDescription>
          </div>
          {!isLoading && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{totalVisits.toLocaleString()}</p>
                <p className="text-xs text-slate-400">Total Page Views</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 bg-slate-700" />
            <Skeleton className="h-24 bg-slate-700" />
            <Skeleton className="h-24 bg-slate-700" />
          </div>
        ) : stats.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">No activity data recorded yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Activity will appear here as users interact with the platform
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Heat legend */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700">
              <span className="text-xs text-slate-400">Heat Scale:</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-slate-400">Cold</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-6 h-2 rounded bg-blue-400" />
                  <div className="w-6 h-2 rounded bg-yellow-500" />
                  <div className="w-6 h-2 rounded bg-amber-500" />
                  <div className="w-6 h-2 rounded bg-orange-500" />
                  <div className="w-6 h-2 rounded bg-red-500" />
                </div>
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-red-400" />
                  <span className="text-xs text-slate-400">Hot</span>
                </div>
              </div>
            </div>

            {/* Categories */}
            {sortedCategories.map(([category, features]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">{category}</h3>
                  <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                    {features.reduce((sum, f) => sum + f.total_visits, 0).toLocaleString()} visits
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {features
                    .sort((a, b) => b.total_visits - a.total_visits)
                    .map((stat) => (
                      <FeatureCard key={stat.feature_name} stat={stat} maxVisits={maxVisits} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerActivityHeatmap;
