import { useState, useEffect } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import bosplanLogo from "@/assets/bosplan-logo.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CreditCard, Download, ExternalLink, FileText, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
interface SubscriptionInfo {
  subscribed: boolean;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  plan_type: string | null;
}
interface Invoice {
  id: string;
  number: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  description: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
}
const Billing = () => {
  const { navigate } = useOrgNavigation();
  const {
    session
  } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  useEffect(() => {
    if (session) {
      fetchSubscriptionAndInvoices();
    }
  }, [session]);
  const fetchSubscriptionAndInvoices = async () => {
    try {
      // Fetch subscription status
      const {
        data: subData,
        error: subError
      } = await supabase.functions.invoke('check-subscription');
      if (subError) throw subError;
      setSubscription(subData);

      // Fetch invoices
      const {
        data: invData,
        error: invError
      } = await supabase.functions.invoke('get-invoices');
      if (invError) throw invError;
      setInvoices(invData?.invoices || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };
  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };
  const getStatusBadge = (status: string) => {
    const variants: Record<string, {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }> = {
      paid: {
        variant: "default",
        label: "Paid"
      },
      open: {
        variant: "outline",
        label: "Open"
      },
      draft: {
        variant: "secondary",
        label: "Draft"
      },
      void: {
        variant: "destructive",
        label: "Void"
      },
      uncollectible: {
        variant: "destructive",
        label: "Uncollectible"
      }
    };
    const config = variants[status] || {
      variant: "secondary",
      label: status
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  const getSubscriptionStatusBadge = (status: string) => {
    const variants: Record<string, {
      variant: "default" | "secondary" | "destructive";
      label: string;
    }> = {
      active: {
        variant: "default",
        label: "Active"
      },
      trialing: {
        variant: "secondary",
        label: "Trial"
      },
      canceled: {
        variant: "destructive",
        label: "Canceled"
      },
      past_due: {
        variant: "destructive",
        label: "Past Due"
      }
    };
    const config = variants[status] || {
      variant: "secondary",
      label: status
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  if (loading) {
    return <div className="min-h-screen bg-background p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-5">
          
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Billing & Invoices</h1>
            <p className="text-muted-foreground mt-0.5">Manage your subscription and view invoices</p>
          </div>
        </div>

        {/* Subscription Card */}
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  Subscription
                </CardTitle>
                <CardDescription className="mt-1.5">Your current plan and billing status</CardDescription>
              </div>
              {subscription?.status && getSubscriptionStatusBadge(subscription.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            {subscription?.subscribed ? <>
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="space-y-1.5 p-4 bg-muted/30 rounded-xl">
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-semibold text-foreground capitalize">
                      Team Plan ({subscription.plan_type})
                    </p>
                  </div>
                  {subscription.trial_ends_at && <div className="space-y-1.5 p-4 bg-muted/30 rounded-xl">
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Trial Ends
                      </p>
                      <p className="font-semibold text-foreground">
                        {format(new Date(subscription.trial_ends_at), 'MMM d, yyyy')}
                      </p>
                    </div>}
                  {subscription.current_period_end && <div className="space-y-1.5 p-4 bg-muted/30 rounded-xl">
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Next Billing Date
                      </p>
                      <p className="font-semibold text-foreground">
                        {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                      </p>
                    </div>}
                </div>
                <Button onClick={openCustomerPortal} disabled={portalLoading} className="rounded-xl btn-smooth">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {portalLoading ? "Opening..." : "Manage Subscription"}
                </Button>
              </> : <div className="text-center py-8">
                <p className="text-muted-foreground mb-5">No active subscription</p>
                <Button onClick={() => navigate("/")} className="rounded-xl btn-smooth">View Plans</Button>
              </div>}
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              Invoice History
            </CardTitle>
            <CardDescription className="mt-1.5">View and download your invoices</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {invoices.length === 0 ? <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground">No invoices yet</p>
              </div> : <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/40 hover:bg-transparent">
                      <TableHead className="font-semibold">Invoice</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(invoice => <TableRow key={invoice.id} className="border-border/40 hover:bg-muted/30 transition-colors duration-200">
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{invoice.number}</p>
                            <p className="text-sm text-muted-foreground">{invoice.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(invoice.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(invoice.amount_due, invoice.currency)}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status || 'draft')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            {invoice.hosted_invoice_url && <Button variant="ghost" size="sm" className="rounded-lg hover:bg-secondary/80 transition-all duration-200" onClick={() => window.open(invoice.hosted_invoice_url!, '_blank')}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>}
                            {invoice.pdf_url && <Button variant="ghost" size="sm" className="rounded-lg hover:bg-secondary/80 transition-all duration-200" onClick={() => window.open(invoice.pdf_url!, '_blank')}>
                                <Download className="h-4 w-4" />
                              </Button>}
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Billing;