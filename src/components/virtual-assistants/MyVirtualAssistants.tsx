import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Clock, Calendar, XCircle, Loader2, ChevronDown, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { format } from "date-fns";

export interface MyVirtualAssistantsHandle {
  refetch: () => void;
}

interface VASubscription {
  id: string;
  status: string;
  assistant_type: string;
  hours: number;
  monthly_price: number;
  product_name: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created: string;
}


interface AllocatedVA {
  id: string;
  name: string;
  email: string;
  job_role: string;
  status: string;
  created_at: string;
}

const assistantTypeLabels: Record<string, string> = {
  "shopify-developer": "Shopify Developer",
  "customer-service": "Customer Service Agent",
  "sales-executive": "Sales Executive",
  "social-media": "Social Media Executive",
  "graphic-designer": "Graphic Designer",
  "book-writer": "Book Writer",
  "general": "Virtual Assistant",
};

const jobRoleLabels: Record<string, string> = {
  "shopify-developer": "Shopify Developer",
  "customer-service": "Customer Service Agent",
  "sales-executive": "Sales Executive",
  "social-media": "Social Media Executive",
  "graphic-designer": "Graphic Designer",
  "book-writer": "Book Writer",
  "general": "Virtual Assistant",
};

const MyVirtualAssistants = forwardRef<MyVirtualAssistantsHandle>((_, ref) => {
  const { session } = useAuth();
  const { organization } = useOrganization();
  const [subscriptions, setSubscriptions] = useState<VASubscription[]>([]);
  const [allocatedVAs, setAllocatedVAs] = useState<AllocatedVA[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!session || !organization?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get-va-subscriptions', {
        body: { organizationId: organization.id }
      });
      
      if (error) throw error;
      
      setSubscriptions(data.subscriptions || []);
      setAllocatedVAs(data.allocatedVAs || []);
    } catch (err: any) {
      console.error("Error fetching VA subscriptions:", err);
      toast.error("Failed to load virtual assistant data");
    } finally {
      setLoading(false);
    }
  };

  // Expose refetch to parent component
  useImperativeHandle(ref, () => ({
    refetch: fetchData,
  }));

  useEffect(() => {
    fetchData();
  }, [session, organization?.id]);

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      setCancelingId(subscriptionId);
      const { data, error } = await supabase.functions.invoke('cancel-va-subscription', {
        body: { subscriptionId },
      });
      
      if (error) throw error;
      
      toast.success("Subscription will be cancelled at the end of the billing period");
      fetchData();
    } catch (err: any) {
      console.error("Error canceling subscription:", err);
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean = false) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="outline" className="text-amber-600 border-amber-600">Cancelling</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Trial</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const activeSubscriptions = subscriptions.filter(sub => 
    ['active', 'trialing'].includes(sub.status) || sub.cancel_at_period_end
  );

  const [isOpen, setIsOpen] = useState(true);

  // Total count is just allocated VAs (not subscriptions)
  const totalActiveCount = allocatedVAs.length;

  if (loading) {
    return (
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72 mt-1" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#176884]/10">
                <Users className="w-5 h-5 text-[#176884]" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-lg">My Virtual Assistants</h3>
                <p className="text-sm text-muted-foreground">
                  {totalActiveCount} active assistant{totalActiveCount !== 1 ? 's' : ''} • {activeSubscriptions.length} subscription{activeSubscriptions.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-6">
            {/* Active Virtual Assistants (allocated by super admin only) */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Active Virtual Assistants</h4>
              {allocatedVAs.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No virtual assistants allocated yet.</p>
                  <p className="text-xs mt-1">Virtual assistants will appear here once allocated by the administrator.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {allocatedVAs.map((va) => (
                    <div 
                      key={va.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-[#176884]/10 shrink-0">
                          <User className="w-4 h-4 text-[#176884]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{va.name}</span>
                            {getStatusBadge(va.status)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {va.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {jobRoleLabels[va.job_role] || va.job_role}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Assigned on {format(new Date(va.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase History (subscriptions with cancel option) */}
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Purchase History</h4>
              {activeSubscriptions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No purchases yet.</p>
                  <p className="text-xs mt-1">Purchase a virtual assistant package above to get started.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeSubscriptions.map((sub) => (
                    <div 
                      key={sub.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-[#176884]/10 shrink-0">
                          <Users className="w-4 h-4 text-[#176884]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {assistantTypeLabels[sub.assistant_type] || sub.assistant_type}
                            </span>
                            {getStatusBadge(sub.status, sub.cancel_at_period_end)}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {sub.hours} hours/month
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {sub.current_period_end 
                                ? `Renews ${format(new Date(sub.current_period_end), 'MMM d, yyyy')}`
                                : 'N/A'
                              }
                            </span>
                          </div>
                          {sub.cancel_at_period_end && (
                            <p className="text-xs text-amber-600 mt-1">
                              Access until {sub.current_period_end 
                                ? format(new Date(sub.current_period_end), 'MMM d, yyyy')
                                : 'end of period'
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <span className="font-semibold">
                          {formatCurrency(sub.monthly_price)}/mo
                        </span>
                        {!sub.cancel_at_period_end && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-destructive hover:text-destructive text-xs"
                                disabled={cancelingId === sub.id}
                              >
                                {cancelingId === sub.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Cancel
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Your virtual assistant will remain active until the end of the current billing period
                                  {sub.current_period_end && ` (${format(new Date(sub.current_period_end), 'MMM d, yyyy')})`}.
                                  After that, you will no longer have access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelSubscription(sub.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Cancel Subscription
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
});

MyVirtualAssistants.displayName = "MyVirtualAssistants";

export default MyVirtualAssistants;
