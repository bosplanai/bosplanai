import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Bot, Save, Loader2, Plus, Search, Edit, Building2, Copy, Check, ChevronsUpDown } from "lucide-react";
import VAPricingPanel from "@/components/superadmin/VAPricingPanel";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminData } from "@/hooks/useSuperAdminData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import bosplanLogo from "@/assets/bosplan-logo-superadmin.png";

// VA Job roles from the product cards
const vaJobRoles = [
  { id: "shopify-developer", title: "Shopify Developer" },
  { id: "customer-service", title: "Customer Service Agent" },
  { id: "sales-executive", title: "Sales Executive" },
  { id: "social-media", title: "Social Media Executive" },
  { id: "graphic-designer", title: "Graphic Designer" },
  { id: "book-writer", title: "Book Writer" },
];

interface VirtualAssistant {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  job_role: string;
  organization_id: string | null;
  status: string;
  created_at: string;
  organization?: { name: string } | null;
}

const ManageVirtualAssistants = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { organizations, loading: orgsLoading } = useSuperAdminData();

  const [virtualAssistants, setVirtualAssistants] = useState<VirtualAssistant[]>([]);
  const [loadingVAs, setLoadingVAs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingVA, setEditingVA] = useState<VirtualAssistant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [orgSearchOpen, setOrgSearchOpen] = useState(false);
  const [editOrgSearchOpen, setEditOrgSearchOpen] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    jobRole: "",
    organizationId: "",
  });

  const fetchVirtualAssistants = async () => {
    try {
      setLoadingVAs(true);
      const { data, error } = await (supabase.from("virtual_assistants" as any) as any)
        .select(`
          *,
          organization:organizations(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVirtualAssistants(data || []);
    } catch (error: any) {
      console.error("Error fetching VAs:", error);
      toast.error("Failed to load virtual assistants");
    } finally {
      setLoadingVAs(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchVirtualAssistants();
    }
  }, [isSuperAdmin]);

  if (authLoading || superAdminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    navigate("/superadmin");
    return null;
  }

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      jobRole: "",
      organizationId: "",
    });
  };

  const handleCreateVA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.jobRole) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("create-virtual-assistant", {
        body: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phoneNumber: formData.phoneNumber || null,
          jobRole: formData.jobRole,
          organizationId: formData.organizationId || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Virtual Assistant created successfully");
      setShowPassword(response.data.tempPassword);
      setIsCreateDialogOpen(false);
      resetForm();
      fetchVirtualAssistants();
    } catch (error: any) {
      console.error("Error creating VA:", error);
      toast.error(error.message || "Failed to create Virtual Assistant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateVA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingVA) return;

    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke("update-virtual-assistant", {
        body: {
          vaId: editingVA.id,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phoneNumber: formData.phoneNumber || null,
          jobRole: formData.jobRole,
          organizationId: formData.organizationId || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success("Virtual Assistant updated successfully");
      setEditingVA(null);
      resetForm();
      fetchVirtualAssistants();
    } catch (error: any) {
      console.error("Error updating VA:", error);
      toast.error(error.message || "Failed to update Virtual Assistant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditSheet = (va: VirtualAssistant) => {
    setFormData({
      firstName: va.first_name,
      lastName: va.last_name,
      email: va.email,
      phoneNumber: va.phone_number || "",
      jobRole: va.job_role,
      organizationId: va.organization_id || "",
    });
    setEditingVA(va);
  };

  const filteredVAs = virtualAssistants.filter((va) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      va.first_name.toLowerCase().includes(searchLower) ||
      va.last_name.toLowerCase().includes(searchLower) ||
      va.email.toLowerCase().includes(searchLower) ||
      va.job_role.toLowerCase().includes(searchLower) ||
      va.organization?.name?.toLowerCase().includes(searchLower)
    );
  });

  const getJobRoleTitle = (roleId: string) => {
    return vaJobRoles.find((r) => r.id === roleId)?.title || roleId;
  };

  const copyPassword = () => {
    if (showPassword) {
      navigator.clipboard.writeText(showPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={bosplanLogo} alt="BosPlan" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-white">Virtual Assistants</h1>
                <p className="text-sm text-slate-400">Create and manage VA accounts</p>
              </div>
            </div>
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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search virtual assistants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateDialogOpen(true);
            }}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Virtual Assistant
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-pink-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{virtualAssistants.length}</p>
                  <p className="text-sm text-slate-400">Total VAs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {virtualAssistants.filter((va) => va.organization_id).length}
                  </p>
                  <p className="text-sm text-slate-400">Assigned to Orgs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {virtualAssistants.filter((va) => va.status === "active").length}
                  </p>
                  <p className="text-sm text-slate-400">Active VAs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VA Pricing Panel */}
        <div className="mb-6">
          <VAPricingPanel />
        </div>

        {/* VA List */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">All Virtual Assistants</CardTitle>
            <CardDescription className="text-slate-400">
              Click on a VA to view and edit their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingVAs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : filteredVAs.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400">No virtual assistants found</p>
                <p className="text-sm text-slate-500 mt-1">Create your first VA to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-transparent">
                      <TableHead className="text-slate-400">Name</TableHead>
                      <TableHead className="text-slate-400">Email</TableHead>
                      <TableHead className="text-slate-400">Job Role</TableHead>
                      <TableHead className="text-slate-400">Organisation</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVAs.map((va) => (
                      <TableRow
                        key={va.id}
                        className="border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                        onClick={() => openEditSheet(va)}
                      >
                        <TableCell className="text-white font-medium">
                          {va.first_name} {va.last_name}
                        </TableCell>
                        <TableCell className="text-slate-300">{va.email}</TableCell>
                        <TableCell className="text-slate-300">{getJobRoleTitle(va.job_role)}</TableCell>
                        <TableCell>
                          {va.organization ? (
                            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                              {va.organization.name}
                            </Badge>
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              va.status === "active"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/50"
                            }
                          >
                            {va.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditSheet(va);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create VA Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-pink-500" />
              Create Virtual Assistant
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter the details for the new virtual assistant
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateVA} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-slate-300">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-slate-300">
                  Last Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="va@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-900/50 border-slate-600 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-slate-300">
                Contact Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+44 123 456 7890"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="bg-slate-900/50 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobRole" className="text-slate-300">
                Job Role <span className="text-red-400">*</span>
              </Label>
              <Select
                value={formData.jobRole}
                onValueChange={(value) => setFormData({ ...formData, jobRole: value })}
              >
                <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select a job role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {vaJobRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id} className="text-slate-300">
                      {role.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization" className="text-slate-300">
                Assign to Organisation
              </Label>
              <Popover open={orgSearchOpen} onOpenChange={setOrgSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orgSearchOpen}
                    className="w-full justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-800 hover:text-white"
                  >
                    {formData.organizationId
                      ? organizations.find((org) => org.id === formData.organizationId)?.name || "Select organisation..."
                      : "Search and select an organisation"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700" align="start">
                  <Command className="bg-transparent">
                    <CommandInput placeholder="Search organisations..." className="text-white" />
                    <CommandList>
                      <CommandEmpty className="text-slate-400 py-3 text-center text-sm">No organisation found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setFormData({ ...formData, organizationId: "" });
                            setOrgSearchOpen(false);
                          }}
                          className="text-slate-300 cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !formData.organizationId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          No organisation (Assign later)
                        </CommandItem>
                        {!orgsLoading &&
                          organizations.map((org) => (
                            <CommandItem
                              key={org.id}
                              value={org.name}
                              onSelect={() => {
                                setFormData({ ...formData, organizationId: org.id });
                                setOrgSearchOpen(false);
                              }}
                              className="text-slate-300 cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.organizationId === org.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {org.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create VA
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit VA Sheet */}
      <Sheet open={!!editingVA} onOpenChange={(open) => !open && setEditingVA(null)}>
        <SheetContent className="bg-slate-800 border-slate-700 w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-pink-500" />
              Edit Virtual Assistant
            </SheetTitle>
            <SheetDescription className="text-slate-400">Update the VA's details</SheetDescription>
          </SheetHeader>
          {editingVA && (
            <form onSubmit={handleUpdateVA} className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName" className="text-slate-300">
                    First Name
                  </Label>
                  <Input
                    id="editFirstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName" className="text-slate-300">
                    Last Name
                  </Label>
                  <Input
                    id="editLastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input value={formData.email} disabled className="bg-slate-900/30 border-slate-700 text-slate-400" />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editPhoneNumber" className="text-slate-300">
                  Contact Number
                </Label>
                <Input
                  id="editPhoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editJobRole" className="text-slate-300">
                  Job Role
                </Label>
                <Select
                  value={formData.jobRole}
                  onValueChange={(value) => setFormData({ ...formData, jobRole: value })}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {vaJobRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id} className="text-slate-300">
                        {role.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editOrganization" className="text-slate-300">
                  Assign to Organisation
                </Label>
                <Popover open={editOrgSearchOpen} onOpenChange={setEditOrgSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={editOrgSearchOpen}
                      className="w-full justify-between bg-slate-900/50 border-slate-600 text-white hover:bg-slate-800 hover:text-white"
                    >
                      {formData.organizationId
                        ? organizations.find((org) => org.id === formData.organizationId)?.name || "Select organisation..."
                        : "Search and select an organisation"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-slate-800 border-slate-700" align="start">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search organisations..." className="text-white" />
                      <CommandList>
                        <CommandEmpty className="text-slate-400 py-3 text-center text-sm">No organisation found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              setFormData({ ...formData, organizationId: "" });
                              setEditOrgSearchOpen(false);
                            }}
                            className="text-slate-300 cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !formData.organizationId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            No organisation
                          </CommandItem>
                          {!orgsLoading &&
                            organizations.map((org) => (
                              <CommandItem
                                key={org.id}
                                value={org.name}
                                onSelect={() => {
                                  setFormData({ ...formData, organizationId: org.id });
                                  setEditOrgSearchOpen(false);
                                }}
                                className="text-slate-300 cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.organizationId === org.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {org.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => setEditingVA(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? (
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
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* Password Dialog */}
      <Dialog open={!!showPassword} onOpenChange={() => setShowPassword(null)}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Virtual Assistant Created</DialogTitle>
            <DialogDescription className="text-slate-400">
              Save the temporary password below. The VA will need to reset it on first login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600">
              <Label className="text-slate-400 text-xs">Temporary Password</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-pink-400 text-lg flex-1 break-all">{showPassword}</code>
                <Button variant="ghost" size="sm" onClick={copyPassword} className="text-slate-400 hover:text-white">
                  {copiedPassword ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <p className="text-sm text-amber-400">
              ⚠️ Make sure to copy this password. It will not be shown again.
            </p>
            <Button onClick={() => setShowPassword(null)} className="w-full bg-pink-600 hover:bg-pink-700">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageVirtualAssistants;
