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
  Search,
  Shield,
  UserX,
  UserCheck,
  AlertTriangle,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminData } from "@/hooks/useSuperAdminData";
import { format } from "date-fns";
import bosplanLogo from "@/assets/bosplan-logo-superadmin.png";

const AccountStatus = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { organizations, loading: dataLoading, suspendOrganization, reactivateOrganization } = useSuperAdminData();
  const [searchQuery, setSearchQuery] = useState("");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeOrgs = filteredOrganizations.filter((org) => !org.is_suspended);
  const suspendedOrgs = filteredOrganizations.filter((org) => org.is_suspended);

  const handleSuspendClick = (org: { id: string; name: string }) => {
    setSelectedOrg(org);
    setSuspensionReason("");
    setSuspendDialogOpen(true);
  };

  const handleReactivateClick = (org: { id: string; name: string }) => {
    setSelectedOrg(org);
    setReactivateDialogOpen(true);
  };

  const handleSuspendConfirm = async () => {
    if (!selectedOrg || !suspensionReason.trim()) return;
    
    setIsProcessing(true);
    try {
      await suspendOrganization(selectedOrg.id, suspensionReason);
      setSuspendDialogOpen(false);
      setSelectedOrg(null);
      setSuspensionReason("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateConfirm = async () => {
    if (!selectedOrg) return;
    
    setIsProcessing(true);
    try {
      await reactivateOrganization(selectedOrg.id);
      setReactivateDialogOpen(false);
      setSelectedOrg(null);
    } finally {
      setIsProcessing(false);
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
                <h1 className="text-xl font-bold text-white">Suspend / Reactivate Accounts</h1>
                <p className="text-sm text-slate-400">Manage customer access status</p>
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
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {organizations.filter((org) => !org.is_suspended).length}
                  </p>
                  <p className="text-sm text-slate-400">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-400" />
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

        {/* Active Accounts */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Active Accounts ({activeOrgs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="text-center py-8 text-slate-400">Loading organisations...</div>
            ) : activeOrgs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {searchQuery ? "No active organisations match your search" : "No active organisations"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Users</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOrgs.map((org) => (
                    <TableRow key={org.id} className="border-slate-700 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{org.name}</p>
                            <p className="text-sm text-slate-400">{org.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Users className="w-4 h-4" />
                          {org.users.length}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {format(new Date(org.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => handleSuspendClick({ id: org.id, name: org.name })}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Suspend Access
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Suspended Accounts */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Suspended Accounts ({suspendedOrgs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="text-center py-8 text-slate-400">Loading organisations...</div>
            ) : suspendedOrgs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                {searchQuery ? "No suspended organisations match your search" : "No suspended organisations"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Organisation</TableHead>
                    <TableHead className="text-slate-400">Users</TableHead>
                    <TableHead className="text-slate-400">Suspended</TableHead>
                    <TableHead className="text-slate-400">Reason</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspendedOrgs.map((org) => (
                    <TableRow key={org.id} className="border-slate-700 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{org.name}</p>
                            <p className="text-sm text-slate-400">{org.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Users className="w-4 h-4" />
                          {org.users.length}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {org.suspended_at ? format(new Date(org.suspended_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-slate-300 max-w-[200px] truncate">
                        {org.suspension_reason || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                          onClick={() => handleReactivateClick({ id: org.id, name: org.name })}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Reactivate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Suspend Organisation
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to suspend <span className="text-white font-medium">{selectedOrg?.name}</span>?
              All users in this organisation will be locked out until reactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm text-slate-300 mb-2 block">Suspension Reason *</label>
            <Textarea
              placeholder="Enter the reason for suspension..."
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSuspendDialogOpen(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspendConfirm}
              disabled={!suspensionReason.trim() || isProcessing}
            >
              {isProcessing ? "Suspending..." : "Suspend Organisation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Reactivate Organisation
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to reactivate <span className="text-white font-medium">{selectedOrg?.name}</span>?
              All users in this organisation will regain access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setReactivateDialogOpen(false)}
              className="text-slate-300 hover:text-white hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleReactivateConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? "Reactivating..." : "Reactivate Organisation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountStatus;
