import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Shield, 
  Search, 
  Clock, 
  User, 
  Globe, 
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const AuditLogs = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ["super-admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("super_admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: isSuperAdmin,
  });

  const getActionIcon = (action: string) => {
    if (action.includes("success") || action.includes("accepted")) {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (action.includes("failed") || action.includes("unauthorized") || action.includes("exceeded")) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    if (action.includes("login") || action.includes("otp")) {
      return <Shield className="w-4 h-4 text-blue-500" />;
    }
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    if (action.includes("success") || action.includes("accepted")) return "default";
    if (action.includes("failed") || action.includes("unauthorized") || action.includes("exceeded")) return "destructive";
    return "secondary";
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get unique actions for filter
  const uniqueActions = [...new Set(auditLogs.map((log) => log.action))];

  // Filter logs
  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ip_address?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800/50 border-slate-700">
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-slate-400 mb-4">
              You don't have permission to access this area.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                onClick={() => navigate("/superadmin")}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  Audit Logs
                </h1>
                <p className="text-sm text-slate-400">
                  Append-only security event log
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-red-500/50 text-red-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Immutable Records
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search by email, action, or IP address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-slate-900/50 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="all" className="text-white hover:bg-slate-700">
                    All Actions
                  </SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem
                      key={action}
                      value={action}
                      className="text-white hover:bg-slate-700"
                    >
                      {formatAction(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{auditLogs.length}</p>
              <p className="text-xs text-slate-400">Total Events</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">
                {auditLogs.filter((l) => l.action.includes("success")).length}
              </p>
              <p className="text-xs text-slate-400">Successful</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">
                {auditLogs.filter((l) => l.action.includes("failed") || l.action.includes("unauthorized")).length}
              </p>
              <p className="text-xs text-slate-400">Failed/Unauthorized</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-400">
                {auditLogs.filter((l) => l.action.includes("rate_limit")).length}
              </p>
              <p className="text-xs text-slate-400">Rate Limited</p>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Security Events ({filteredLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Loading audit logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No audit logs found
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getActionIcon(log.action)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getActionBadgeVariant(log.action)}>
                                {formatAction(log.action)}
                              </Badge>
                              {log.resource_type && (
                                <Badge variant="outline" className="text-slate-400 border-slate-600">
                                  {log.resource_type}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.user_email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                {log.ip_address || "Unknown"}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                              </span>
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="mt-2 text-xs text-slate-500 font-mono bg-slate-800/50 p-2 rounded">
                                {JSON.stringify(log.details, null, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AuditLogs;