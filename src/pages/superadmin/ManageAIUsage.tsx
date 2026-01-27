import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Sparkles, Calendar, CalendarDays, CalendarRange, Save, Loader2 } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import bosplanLogo from "@/assets/bosplan-logo.png";

interface UsageLimit {
  id: string;
  limit_type: 'daily' | 'monthly' | 'yearly';
  max_prompts: number;
  is_enabled: boolean;
}

const ManageAIUsage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const [limits, setLimits] = useState<UsageLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isSuperAdmin) {
      fetchLimits();
    }
  }, [user, isSuperAdmin]);

  const fetchLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_usage_limits')
        .select('*')
        .order('limit_type');

      if (error) throw error;
      setLimits((data || []) as UsageLimit[]);
    } catch (error: any) {
      toast.error("Failed to fetch AI usage limits");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLimitChange = (limitType: string, field: 'max_prompts' | 'is_enabled', value: number | boolean) => {
    setLimits(prev => 
      prev.map(limit => 
        limit.limit_type === limitType 
          ? { ...limit, [field]: value }
          : limit
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const limit of limits) {
        const { error } = await supabase
          .from('ai_usage_limits')
          .update({
            max_prompts: limit.max_prompts,
            is_enabled: limit.is_enabled,
          })
          .eq('id', limit.id);

        if (error) throw error;
      }
      toast.success("AI usage limits updated successfully");
    } catch (error: any) {
      toast.error("Failed to update AI usage limits");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-white text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-slate-400">
              You do not have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => navigate("/superadmin")}
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getLimitIcon = (type: string) => {
    switch (type) {
      case 'daily': return Calendar;
      case 'monthly': return CalendarDays;
      case 'yearly': return CalendarRange;
      default: return Calendar;
    }
  };

  const getLimitColor = (type: string) => {
    switch (type) {
      case 'daily': return { text: 'text-blue-400', bg: 'bg-blue-500/20' };
      case 'monthly': return { text: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'yearly': return { text: 'text-purple-400', bg: 'bg-purple-500/20' };
      default: return { text: 'text-slate-400', bg: 'bg-slate-500/20' };
    }
  };

  const getLimitDescription = (type: string) => {
    switch (type) {
      case 'daily': return 'Maximum number of AI prompts each organisation can use per day';
      case 'monthly': return 'Maximum number of AI prompts each organisation can use per month';
      case 'yearly': return 'Maximum number of AI prompts each organisation can use per year';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={() => navigate("/superadmin")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <img src={bosplanLogo} alt="BosPlan" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-white">Manage AI Usage</h1>
                <p className="text-sm text-slate-400">Set platform-wide AI usage limits</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">AI Usage Limits</h2>
                <p className="text-slate-400 text-sm">
                  Configure the maximum number of AI prompts that each organisation on the platform can use. 
                  These limits apply across all AI tools such as TaskPopulate. When an organisation reaches 
                  their limit, they will be unable to use AI features until the next period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limits Configuration */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {limits.map((limit) => {
              const Icon = getLimitIcon(limit.limit_type);
              const colors = getLimitColor(limit.limit_type);
              
              return (
                <Card key={limit.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-6 h-6 ${colors.text}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-white capitalize">
                              {limit.limit_type} Limit
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={limit.is_enabled 
                                ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" 
                                : "border-slate-500/50 text-slate-400 bg-slate-500/10"
                              }
                            >
                              {limit.is_enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <p className="text-slate-400 text-sm mb-4">
                            {getLimitDescription(limit.limit_type)}
                          </p>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                              <Label htmlFor={`${limit.limit_type}-prompts`} className="text-slate-300 whitespace-nowrap">
                                Max Prompts:
                              </Label>
                              <Input
                                id={`${limit.limit_type}-prompts`}
                                type="number"
                                min="0"
                                value={limit.max_prompts}
                                onChange={(e) => handleLimitChange(limit.limit_type, 'max_prompts', parseInt(e.target.value) || 0)}
                                className="w-32 bg-slate-700/50 border-slate-600 text-white"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <Label htmlFor={`${limit.limit_type}-enabled`} className="text-slate-300">
                                Enable Limit:
                              </Label>
                              <Switch
                                id={`${limit.limit_type}-enabled`}
                                checked={limit.is_enabled}
                                onCheckedChange={(checked) => handleLimitChange(limit.limit_type, 'is_enabled', checked)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-slate-800/30 border-slate-700/50 mt-8">
          <CardContent className="p-6">
            <h3 className="text-white font-medium mb-3">How it works</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Limits are applied per organisation, not per user</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Daily limits reset at midnight UTC each day</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Monthly limits reset on the 1st of each month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Yearly limits reset on January 1st</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>All enabled limits are checked - if any limit is exceeded, AI access is blocked</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ManageAIUsage;
