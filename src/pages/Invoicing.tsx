import { useState, useMemo } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Plus, FileText, Search, AlertCircle, Settings, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import SideNavigation from "@/components/SideNavigation";
import ActionBar from "@/components/ActionBar";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AddCustomerDialog from "@/components/invoicing/AddCustomerDialog";
import bosplanLogo from "@/assets/bosplan-logo-icon.png";
import { format, startOfMonth, endOfMonth, differenceInDays, subMonths } from "date-fns";

const Invoicing = () => {
  const { navigate } = useOrgNavigation();
  const { user } = useAuth();
  const { organization, profile } = useOrganization();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  // Fetch invoices from database
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(amount);
  };

  // Calculate monthly data from invoices
  const monthlyData = useMemo(() => {
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Financial year starts in April
    const fyStartYear = currentDate.getMonth() >= 3 ? currentYear : currentYear - 1;
    
    return months.map((month, index) => {
      // Calculate the actual date for this month in the financial year
      const monthIndex = (index + 3) % 12; // Apr = 3, May = 4, etc.
      const year = monthIndex < 3 ? fyStartYear + 1 : fyStartYear;
      const monthStart = startOfMonth(new Date(year, monthIndex, 1));
      const monthEnd = endOfMonth(monthStart);
      
      // Filter invoices for this month
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.created_at);
        return invDate >= monthStart && invDate <= monthEnd;
      });
      
      // Calculate sales (total amount_due for all invoices in the month)
      const sales = monthInvoices.reduce((sum, inv) => sum + (inv.amount_due / 100), 0);
      
      // Calculate receipts (amount_paid for paid invoices)
      const receipts = monthInvoices.reduce((sum, inv) => sum + (inv.amount_paid / 100), 0);
      
      return {
        month,
        sales,
        receipts
      };
    });
  }, [invoices]);

  // Calculate receivables data from invoices
  const receivablesData = useMemo(() => {
    const now = new Date();
    
    // Filter unpaid invoices (where amount_paid < amount_due)
    const unpaidInvoices = invoices.filter(inv => inv.amount_paid < inv.amount_due);
    
    let current = 0;
    let overdue1to15 = 0;
    let overdue16to30 = 0;
    let overdue31to45 = 0;
    let overdueAbove45 = 0;
    
    unpaidInvoices.forEach(inv => {
      const amountRemaining = (inv.amount_due - inv.amount_paid) / 100;
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      
      if (!dueDate || dueDate >= now) {
        // Not overdue
        current += amountRemaining;
      } else {
        const daysOverdue = differenceInDays(now, dueDate);
        
        if (daysOverdue <= 15) {
          overdue1to15 += amountRemaining;
        } else if (daysOverdue <= 30) {
          overdue16to30 += amountRemaining;
        } else if (daysOverdue <= 45) {
          overdue31to45 += amountRemaining;
        } else {
          overdueAbove45 += amountRemaining;
        }
      }
    });
    
    const total = current + overdue1to15 + overdue16to30 + overdue31to45 + overdueAbove45;
    
    return {
      total,
      current,
      overdue1to15,
      overdue16to30,
      overdue31to45,
      overdueAbove45
    };
  }, [invoices]);

  const totalSales = monthlyData.reduce((sum, m) => sum + m.sales, 0);
  const totalReceipts = monthlyData.reduce((sum, m) => sum + m.receipts, 0);

  // Calculate progress bar percentages (avoid division by zero)
  const totalReceivables = receivablesData.total || 1;
  const currentPercent = (receivablesData.current / totalReceivables) * 100;
  const overdue1Percent = (receivablesData.overdue1to15 / totalReceivables) * 100;
  const overdue16Percent = (receivablesData.overdue16to30 / totalReceivables) * 100;
  const overdue31Percent = (receivablesData.overdue31to45 / totalReceivables) * 100;
  const overdueAbovePercent = (receivablesData.overdueAbove45 / totalReceivables) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-20 md:pb-0">
      {/* Left Sidebar Menu - hidden on mobile, shown as bottom sheet or drawer alternative */}
      <div className="hidden md:flex w-52 bg-brand-teal flex-col p-4 gap-3">
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <img src={bosplanLogo} alt="Bosplan" className="w-8 h-8 object-contain" />
          <span className="text-white font-semibold text-lg">Invoicing</span>
        </div>

        <Button 
          onClick={() => navigate("/invoicing/new")} 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 justify-start"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Button>

        <Button 
          onClick={() => navigate("/invoicing/list")} 
          className="w-full gap-2 justify-start text-white hover:opacity-90"
          style={{ backgroundColor: "#E0523A" }}
        >
          <FileText className="w-4 h-4" />
          Invoices
        </Button>

        <Button 
          onClick={() => setIsCustomerDialogOpen(true)} 
          className="w-full bg-brand-green hover:bg-brand-green/90 text-white gap-2 justify-start"
        >
          <Plus className="w-4 h-4" />
          New Customer
        </Button>
      </div>

      {/* Mobile action bar */}
      <div className="md:hidden flex items-center gap-2 p-3 bg-brand-teal overflow-x-auto">
        <button 
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex items-center gap-2 mr-2">
          <img src={bosplanLogo} alt="Bosplan" className="w-6 h-6 object-contain" />
          <span className="text-white font-semibold text-sm">Invoicing</span>
        </div>
        <Button 
          onClick={() => navigate("/invoicing/new")} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs px-3 py-1.5 h-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New
        </Button>
        <Button 
          onClick={() => navigate("/invoicing/list")} 
          className="gap-1.5 text-white hover:opacity-90 text-xs px-3 py-1.5 h-auto shrink-0"
          style={{ backgroundColor: "#E0523A" }}
        >
          <FileText className="w-3.5 h-3.5" />
          Invoices
        </Button>
        <Button 
          onClick={() => setIsCustomerDialogOpen(true)} 
          className="bg-brand-green hover:bg-brand-green/90 text-white gap-1.5 text-xs px-3 py-1.5 h-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Customer
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-9 text-sm" 
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("/invoicing/settings")}
                className="shrink-0 h-9 w-9"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            <ActionBar />
          </div>
        </div>

        {/* Organization Welcome */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm sm:text-base">
                {organization?.name?.charAt(0) || "O"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">
                Hello, {organization?.name || "Your Business"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {profile?.full_name || "User"}
              </p>
            </div>
          </div>

          <div className="mt-3 sm:mt-4">
            <span className="text-sm font-medium border-b-2 border-primary pb-2">
              Dashboard
            </span>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* Total Receivables Card */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Total Receivables
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Total Receivables{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(receivablesData.total)}
                </span>
              </p>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              {/* Progress Bar */}
              {receivablesData.total > 0 ? (
                <div className="h-3 sm:h-4 rounded-full overflow-hidden flex mb-3 sm:mb-4">
                  <div 
                    className="bg-brand-green h-full" 
                    style={{ width: `${currentPercent}%` }} 
                  />
                  <div 
                    className="bg-brand-orange h-full" 
                    style={{ width: `${overdue1Percent}%` }} 
                  />
                  <div 
                    className="bg-amber-400 h-full" 
                    style={{ width: `${overdue16Percent}%` }} 
                  />
                  <div 
                    className="bg-orange-400 h-full" 
                    style={{ width: `${overdue31Percent}%` }} 
                  />
                  <div 
                    className="bg-brand-coral h-full" 
                    style={{ width: `${overdueAbovePercent}%` }} 
                  />
                </div>
              ) : (
                <div className="h-3 sm:h-4 rounded-full overflow-hidden flex mb-3 sm:mb-4 bg-muted" />
              )}

              {/* Breakdown - responsive grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 text-center">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-brand-green mb-0.5 sm:mb-1">
                    CURRENT
                  </p>
                  <p className="text-sm sm:text-lg font-semibold">
                    {formatCurrency(receivablesData.current)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-brand-coral mb-0.5 sm:mb-1">
                    OVERDUE
                  </p>
                  <p className="text-sm sm:text-lg font-semibold">
                    {formatCurrency(receivablesData.overdue1to15)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">1-15 Days</p>
                </div>
                <div>
                  <p className="text-sm sm:text-lg font-semibold">
                    {formatCurrency(receivablesData.overdue16to30)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">16-30 Days</p>
                </div>
                <div>
                  <p className="text-sm sm:text-lg font-semibold">
                    {formatCurrency(receivablesData.overdue31to45)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">31-45 Days</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm sm:text-lg font-semibold">
                    {formatCurrency(receivablesData.overdueAbove45)}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Above 45 days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sales and Expenses Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold">
                    Sales and Expenses
                  </CardTitle>
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">
                  This Financial Year
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-8">
                <div className="flex-1 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barGap={2}>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false} 
                        stroke="hsl(var(--border))" 
                      />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                        tickFormatter={(value) => value > 0 ? `${value / 1000}K` : "0"} 
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)} 
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }} 
                      />
                      <Bar 
                        dataKey="sales" 
                        fill="hsl(210 100% 50%)" 
                        radius={[4, 4, 0, 0]} 
                        name="Sales" 
                      />
                      <Bar 
                        dataKey="receipts" 
                        fill="hsl(var(--brand-green))" 
                        radius={[4, 4, 0, 0]} 
                        name="Receipts" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary */}
                <div className="w-48 space-y-4">
                  <div>
                    <p className="text-sm text-blue-500 font-medium">
                      Total Sales
                    </p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(totalSales)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-brand-green font-medium">
                      Total Receipts
                    </p>
                    <p className="text-xl font-semibold">
                      {formatCurrency(totalReceipts)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-brand-coral font-medium">
                      Total Expenses
                    </p>
                    <p className="text-xl font-semibold">{formatCurrency(0)}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                * Sales value displayed is inclusive of tax and inclusive of credits.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />

      {/* Dialogs */}
      <AddCustomerDialog isOpen={isCustomerDialogOpen} onClose={() => setIsCustomerDialogOpen(false)} />
    </div>
  );
};

export default Invoicing;
