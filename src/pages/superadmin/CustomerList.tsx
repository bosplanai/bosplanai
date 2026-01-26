import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Building2,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  Shield,
  FolderKanban,
  FileText,
  CheckSquare,
  File,
  Crown,
  AlertTriangle,
  Gift,
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminData } from "@/hooks/useSuperAdminData";
import { format } from "date-fns";
import bosplanLogo from "@/assets/bosplan-logo-superadmin.png";

const CustomerList = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { organizations, loading: dataLoading } = useSuperAdminData();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrgs, setExpandedOrgs] = useState<string[]>([]);

  const toggleExpanded = (orgId: string) => {
    setExpandedOrgs((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  };

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSubscriptionBadge = (org: typeof organizations[0]) => {
    // Specialist plan takes priority over subscription
    if (org.specialistPlan) {
      const isExpired = new Date(org.specialistPlan.expires_at) < new Date();
      return (
        <Badge 
          variant="outline" 
          className={isExpired 
            ? "bg-orange-500/20 text-orange-400 border-orange-500/50" 
            : "bg-purple-500/20 text-purple-400 border-purple-500/50"
          }
        >
          <Gift className="w-3 h-3 mr-1" />
          {isExpired ? "Specialist (Expired)" : "Specialist Plan"}
        </Badge>
      );
    }

    if (!org.subscription) {
      return <Badge variant="outline" className="text-slate-400 border-slate-600">No Subscription</Badge>;
    }
    
    const statusColors: Record<string, string> = {
      active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
      trialing: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      past_due: "bg-orange-500/20 text-orange-400 border-orange-500/50",
      canceled: "bg-red-500/20 text-red-400 border-red-500/50",
      unpaid: "bg-red-500/20 text-red-400 border-red-500/50",
    };

    return (
      <Badge variant="outline" className={statusColors[org.subscription.status] || "text-slate-400 border-slate-600"}>
        {org.subscription.status.charAt(0).toUpperCase() + org.subscription.status.slice(1)}
        {org.subscription.plan_type && ` - ${org.subscription.plan_type}`}
      </Badge>
    );
  };

  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    navigate("/superadmin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={bosplanLogo} alt="BosPlan" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-white">View All Customers</h1>
                <p className="text-sm text-slate-400">Customer Account Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-700"
                onClick={() => navigate("/superadmin")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search organisations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{organizations.length}</p>
                  <p className="text-sm text-slate-400">Total Organisations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {organizations.reduce((acc, org) => acc + org.users.length, 0)}
                  </p>
                  <p className="text-sm text-slate-400">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {organizations.filter((org) => org.is_suspended).length}
                  </p>
                  <p className="text-sm text-slate-400">Suspended</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Customer Organisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="text-center py-8 text-slate-400">Loading organisations...</div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {searchQuery ? "No organisations match your search" : "No organisations found"}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrganizations.map((org) => (
                  <Collapsible
                    key={org.id}
                    open={expandedOrgs.includes(org.id)}
                    onOpenChange={() => toggleExpanded(org.id)}
                  >
                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">{org.name}</h3>
                                {org.is_suspended && (
                                  <Badge variant="destructive" className="text-xs">
                                    Suspended
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-400">
                                {org.slug} • {org.users.length} users • Created {format(new Date(org.created_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {getSubscriptionBadge(org)}
                            {expandedOrgs.includes(org.id) ? (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="p-4 border-t border-slate-700 space-y-6">
                          {/* Subscription / Specialist Plan Details */}
                          <div>
                            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                              {org.specialistPlan ? (
                                <>
                                  <Gift className="w-4 h-4 text-purple-400" />
                                  Specialist Plan Details
                                </>
                              ) : (
                                <>
                                  <Crown className="w-4 h-4 text-amber-400" />
                                  Subscription Details
                                </>
                              )}
                            </h4>
                            {org.specialistPlan ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-400">Plan Name</p>
                                  <p className="text-white">{org.specialistPlan.plan_name}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Status</p>
                                  <p className={new Date(org.specialistPlan.expires_at) < new Date() 
                                    ? "text-orange-400" 
                                    : "text-emerald-400"
                                  }>
                                    {new Date(org.specialistPlan.expires_at) < new Date() ? "Expired" : "Active"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Expires</p>
                                  <p className="text-white">
                                    {format(new Date(org.specialistPlan.expires_at), "MMM d, yyyy")}
                                  </p>
                                </div>
                                {org.specialistPlan.referral_code && (
                                  <div>
                                    <p className="text-slate-400">Referral Code</p>
                                    <p className="text-white font-mono">{org.specialistPlan.referral_code}</p>
                                  </div>
                                )}
                              </div>
                            ) : org.subscription ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-400">Status</p>
                                  <p className="text-white capitalize">{org.subscription.status}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Plan Type</p>
                                  <p className="text-white capitalize">{org.subscription.plan_type}</p>
                                </div>
                                {org.subscription.trial_ends_at && (
                                  <div>
                                    <p className="text-slate-400">Trial Ends</p>
                                    <p className="text-white">
                                      {format(new Date(org.subscription.trial_ends_at), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                )}
                                {org.subscription.current_period_end && (
                                  <div>
                                    <p className="text-slate-400">Current Period Ends</p>
                                    <p className="text-white">
                                      {format(new Date(org.subscription.current_period_end), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-sm">No subscription data available</p>
                            )}
                          </div>

                          {/* Users */}
                          <div>
                            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-400" />
                              Team Members ({org.users.length})
                            </h4>
                            {org.users.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Name</TableHead>
                                    <TableHead className="text-slate-400">Job Role</TableHead>
                                    <TableHead className="text-slate-400">Role</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {org.users.map((user) => (
                                    <TableRow key={user.id} className="border-slate-700 hover:bg-slate-800/30">
                                      <TableCell className="text-white">{user.full_name}</TableCell>
                                      <TableCell className="text-slate-300">{user.job_role}</TableCell>
                                      <TableCell>
                                        <Badge
                                          variant="outline"
                                          className={
                                            user.role === "admin"
                                              ? "border-amber-500/50 text-amber-400"
                                              : "border-slate-600 text-slate-400"
                                          }
                                        >
                                          {user.role}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-slate-400 text-sm">No users found</p>
                            )}
                          </div>

                          {/* Usage */}
                          <div>
                            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                              <FolderKanban className="w-4 h-4 text-emerald-400" />
                              Usage Data
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <FolderKanban className="w-4 h-4 text-blue-400" />
                                  <span className="text-slate-400 text-sm">Projects</span>
                                </div>
                                <p className="text-xl font-bold text-white">{org.usage.projects_count}</p>
                              </div>
                              <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                  <span className="text-slate-400 text-sm">Tasks</span>
                                </div>
                                <p className="text-xl font-bold text-white">{org.usage.tasks_count}</p>
                              </div>
                              <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <File className="w-4 h-4 text-purple-400" />
                                  <span className="text-slate-400 text-sm">Files</span>
                                </div>
                                <p className="text-xl font-bold text-white">{org.usage.files_count}</p>
                              </div>
                              <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <FileText className="w-4 h-4 text-orange-400" />
                                  <span className="text-slate-400 text-sm">Invoices</span>
                                </div>
                                <p className="text-xl font-bold text-white">{org.usage.invoices_count}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CustomerList;
