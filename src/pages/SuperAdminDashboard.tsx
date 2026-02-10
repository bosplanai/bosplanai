import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2, Users, UserX, Gift, Link, ArrowRight, Sparkles, Activity, Bot, UserPlus, LogOut, FileText, MessageSquare } from "lucide-react";
import CustomerBroadcastsSection from "@/components/superadmin/CustomerBroadcastsSection";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useSuperAdminData } from "@/hooks/useSuperAdminData";
import { useSpecialistPlans } from "@/hooks/useSpecialistPlans";
import { useSuperAdminSession } from "@/hooks/useSuperAdminSession";
import bosplanLogo from "@/assets/bosplan-logo.png";
import SuperAdminSettingsDialog from "@/components/superadmin/SuperAdminSettingsDialog";
import CustomButtonsSection from "@/components/superadmin/CustomButtonsSection";
const SuperAdminDashboard = () => {
  const { navigate, navigateOrg } = useOrgNavigation();
  const {
    user,
    loading: authLoading
  } = useAuth();
  const {
    isSuperAdmin,
    loading: superAdminLoading
  } = useSuperAdmin();
  const {
    organizations,
    loading: dataLoading
  } = useSuperAdminData();
  const {
    plans,
    loading: plansLoading
  } = useSpecialistPlans();
  
  // Super admin session management with 15-minute inactivity timeout
  const { signOutSuperAdmin } = useSuperAdminSession();
  if (authLoading || superAdminLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>;
  }
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-amber-500 mb-4" />
            <CardTitle className="text-white text-2xl">Super Admin Access</CardTitle>
            <CardDescription className="text-slate-400">
              You must be logged in to access this dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  if (!isSuperAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-white text-2xl">Access Denied</CardTitle>
            <CardDescription className="text-slate-400">
              You do not have super admin privileges to access this dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => navigateOrg("/")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  const menuItems = [{
    category: "Customer Account Management",
    description: "Manage customer organisations and their accounts",
    icon: Building2,
    iconColor: "text-blue-400",
    items: [{
      title: "View All Customers",
      description: "See full list of customers with users, plans, subscriptions, and usage data",
      icon: Building2,
      href: "/superadmin/customers",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    }, {
      title: "Suspend / Reactivate Accounts",
      description: "Manage customer account status and access controls",
      icon: UserX,
      href: "/superadmin/account-status",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    }, {
      title: "Customer Activity",
      description: "View feature usage heatmap and customer engagement metrics",
      icon: Activity,
      href: "/superadmin/customer-activity",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10"
    }]
  }, {
    category: "Remote Assistants",
    description: "Create and manage remote assistant accounts",
    icon: Bot,
    iconColor: "text-pink-400",
    items: [{
      title: "Manage Remote Assistants",
      description: "Create, view, and manage all remote assistant accounts",
      icon: UserPlus,
      href: "/superadmin/virtual-assistants",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    }]
  }, {
    category: "Specialist Plans",
    description: "Create and manage custom plans for specialist customers",
    icon: Gift,
    iconColor: "text-emerald-400",
    items: [{
      title: "Create Specialist Plan",
      description: "Set plans for specialist customers (6, 12, 18 months free with unlimited users)",
      icon: Gift,
      href: "/superadmin/specialist-plans/create",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    }, {
      title: "Manage Registration Links",
      description: "Generate unique registration links with referral codes and T&Cs",
      icon: Link,
      href: "/superadmin/registration-links",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }]
  }, {
    category: "AI Usage",
    description: "Control and monitor AI usage across the platform",
    icon: Sparkles,
    iconColor: "text-amber-400",
    items: [{
      title: "Manage AI Usage",
      description: "Set daily, monthly, and yearly AI prompt limits for all organisations",
      icon: Sparkles,
      href: "/superadmin/ai-usage",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10"
    }, {
      title: "Agents Waiting List",
      description: "View signups from users interested in Bosplan AI Agents",
      icon: Bot,
      href: "/superadmin/agents-waitlist",
      color: "text-teal-500",
      bgColor: "bg-teal-500/10"
    }]
  }, {
    category: "Customer Insights",
    description: "Review customer feedback and engagement data",
    icon: MessageSquare,
    iconColor: "text-yellow-400",
    items: [{
      title: "Customer Feedback",
      description: "View and manage beta feedback submissions from users",
      icon: MessageSquare,
      href: "/superadmin/customer-feedback",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    }]
  }, {
    category: "Security & Compliance",
    description: "Monitor security events and audit trails",
    icon: Shield,
    iconColor: "text-red-400",
    items: [{
      title: "Audit Logs",
      description: "View append-only security logs: who did what, when, and from where",
      icon: FileText,
      href: "/superadmin/audit-logs",
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    }]
  }];
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img alt="BosPlan" className="w-10 h-10 object-contain" src="/lovable-uploads/b6261fac-7267-4233-94da-7a3ba7597f78.png" />
              <div>
                <h1 className="text-xl font-bold text-white">Super Admin Dashboard</h1>
                <p className="text-sm text-slate-400">Platform Management Console</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
              <Badge variant="outline" className="border-slate-500/50 text-slate-400 bg-slate-500/10 text-xs">
                15 min session
              </Badge>
              <SuperAdminSettingsDialog currentEmail={user?.email || ""} />
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-slate-400 hover:text-white hover:bg-slate-700" 
                onClick={() => signOutSuperAdmin(false)}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => navigate("/")}>
                Exit to Main App
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Control Centre</h2>
          <p className="text-slate-400">
            Centralised control for platform super administrators. Manage customer organisations and specialist access
            plans.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{dataLoading ? "—" : organizations.length}</p>
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
                    {dataLoading ? "—" : organizations.reduce((acc, org) => acc + org.users.length, 0)}
                  </p>
                  <p className="text-sm text-slate-400">Active Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {plansLoading ? "—" : plans.filter(p => p.is_active).length}
                  </p>
                  <p className="text-sm text-slate-400">Specialist Plans</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {dataLoading ? "—" : organizations.filter(org => org.is_suspended).length}
                  </p>
                  <p className="text-sm text-slate-400">Suspended Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Sections */}
        <div className="space-y-8">
          {menuItems.map((section, sectionIndex) => {
          const SectionIcon = section.icon;
          return <div key={sectionIndex}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <SectionIcon className={`w-5 h-5 ${section.iconColor}`} />
                    {section.category}
                  </h3>
                  <p className="text-sm text-slate-400">{section.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((item, itemIndex) => <Card key={itemIndex} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer group" onClick={() => navigate(item.href)}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl ${item.bgColor} flex items-center justify-center`}>
                              <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                                {item.title}
                              </h4>
                              <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                        </div>
                      </CardContent>
                    </Card>)}
                </div>
              </div>;
        })}
        </div>

        {/* Customer Broadcasts Section */}
        <div className="mt-8">
          <CustomerBroadcastsSection />
        </div>

        {/* Custom Buttons Section */}
        <div className="mt-8">
          <CustomButtonsSection />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>Bosplan Super Admin Console</p>
            <p>Secure Access Only</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default SuperAdminDashboard;