import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Ban,
  CheckCircle,
  Loader2,
  Download,
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminData } from "@/hooks/useSuperAdminData";
import { format } from "date-fns";
import bosplanLogo from "@/assets/bosplan-logo.png";

const CustomerList = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { organizations, loading: dataLoading, suspendOrganization, reactivateOrganization } = useSuperAdminData();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrgs, setExpandedOrgs] = useState<string[]>([]);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const exportUsersToCSV = (org: typeof organizations[0]) => {
    // Build CSV content
    const headers = ["Name", "Job Role", "Email", "Phone", "Role"];
    const rows = org.users.map((user) => [
      user.full_name,
      user.job_role,
      user.email || "",
      user.phone_number || "",
      user.role || "member",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${org.slug}-users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportAllUsersToCSV = () => {
    // Build CSV content with all users from all organizations
    const headers = ["Name", "Email", "Phone", "Organisation", "Job Role", "Role"];
    const rows: string[][] = [];

    organizations.forEach((org) => {
      org.users.forEach((user) => {
        rows.push([
          user.full_name,
          user.email || "",
          user.phone_number || "",
          org.name,
          user.job_role,
          user.role || "member",
        ]);
      });
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `all-users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

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

  const handleSuspendClick = (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrgId(orgId);
    setSuspensionReason("");
    setSuspendDialogOpen(true);
  };

  const handleReactivateClick = (orgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOrgId(orgId);
    setReactivateDialogOpen(true);
  };

  const confirmSuspend = async () => {
    if (!selectedOrgId || !suspensionReason.trim()) return;
    
    setIsProcessing(true);
    try {
      await suspendOrganization(selectedOrgId, suspensionReason.trim());
      setSuspendDialogOpen(false);
      setSelectedOrgId(null);
      setSuspensionReason("");
    } catch (error) {
      console.error("Failed to suspend:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReactivate = async () => {
    if (!selectedOrgId) return;
    
    setIsProcessing(true);
    try {
      await reactivateOrganization(selectedOrgId);
      setReactivateDialogOpen(false);
      setSelectedOrgId(null);
    } catch (error) {
      console.error("Failed to reactivate:", error);
    } finally {
      setIsProcessing(false);
    }
  };

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

  const selectedOrg = organizations.find(o => o.id === selectedOrgId);

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
        {/* Search and Export */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search organisations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            variant="outline"
            className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
            onClick={exportAllUsersToCSV}
            disabled={organizations.length === 0 || dataLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All Users
          </Button>
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
                            {/* Suspend/Reactivate buttons */}
                            {org.is_suspended ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                                onClick={(e) => handleReactivateClick(org.id, e)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                onClick={(e) => handleSuspendClick(org.id, e)}
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Suspend
                              </Button>
                            )}
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
                          {/* Suspension info */}
                          {org.is_suspended && org.suspension_reason && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Ban className="w-4 h-4 text-red-400" />
                                <span className="font-medium text-red-400">Account Suspended</span>
                              </div>
                              <p className="text-sm text-slate-300">
                                <span className="text-slate-400">Reason: </span>
                                {org.suspension_reason}
                              </p>
                              {org.suspended_at && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Suspended on {format(new Date(org.suspended_at), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                              )}
                            </div>
                          )}

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
                              <>
                                <div className="flex justify-end mb-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      exportUsersToCSV(org);
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export CSV
                                  </Button>
                                </div>
                                <Table>
                                <TableHeader>
                                  <TableRow className="border-slate-700 hover:bg-transparent">
                                    <TableHead className="text-slate-400">Name</TableHead>
                                    <TableHead className="text-slate-400">Job Role</TableHead>
                                    <TableHead className="text-slate-400">Email</TableHead>
                                    <TableHead className="text-slate-400">Phone</TableHead>
                                    <TableHead className="text-slate-400">Role</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {org.users.map((user) => (
                                    <TableRow key={user.id} className="border-slate-700 hover:bg-slate-800/30">
                                      <TableCell className="text-white">{user.full_name}</TableCell>
                                      <TableCell className="text-slate-300">{user.job_role}</TableCell>
                                      <TableCell className="text-slate-300">{user.email || "-"}</TableCell>
                                      <TableCell className="text-slate-300">{user.phone_number || "-"}</TableCell>
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
                              </>
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

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              Suspend Organisation
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This will prevent all users in "{selectedOrg?.name}" from accessing the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Reason for suspension <span className="text-red-400">*</span>
              </label>
              <Textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter the reason for suspending this organisation..."
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialogOpen(false)}
              className="border-slate-600 text-slate-300"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSuspend}
              disabled={!suspensionReason.trim() || isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suspending...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Suspend Organisation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Reactivate Organisation
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This will restore access for all users in "{selectedOrg?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-300">
              Are you sure you want to reactivate this organisation? All users will regain access to the platform immediately.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivateDialogOpen(false)}
              className="border-slate-600 text-slate-300"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReactivate}
              disabled={isProcessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reactivate Organisation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerList;
