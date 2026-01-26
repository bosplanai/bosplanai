import { useState } from "react";
import { useParams } from "react-router-dom";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { 
  ArrowLeft, Edit, Mail, Download, CreditCard, Building2, 
  FileText, ChevronDown, Loader2, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { toast } from "sonner";
import SideNavigation from "@/components/SideNavigation";
import ActionBar from "@/components/ActionBar";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInvoiceSettings, currencySymbols } from "@/hooks/useInvoiceSettings";
import { generateInvoicePdfBase64 } from "@/lib/invoicePdf";
import bosplanLogo from "@/assets/bosplan-logo-icon.png";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const TERMS_LABELS: Record<string, string> = {
  receipt: "Due on Receipt",
  net15: "Net 15",
  net30: "Net 30",
  net45: "Net 45",
  net60: "Net 60",
};

const VAT_RATES: Record<string, number> = {
  none: 0,
  standard: 20,
  reduced: 5,
  zero: 0,
};

const ViewInvoice = () => {
  const { navigate } = useOrgNavigation();
  const { id } = useParams<{ id: string }>();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const { settings: invoiceSettings } = useInvoiceSettings();
  
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(true);

  // Fetch invoice with customer and line items
  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch payments for this invoice
  const { data: payments = [] } = useQuery({
    queryKey: ["invoice_payments", id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", id)
        .order("payment_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Record payment mutation
  const recordPayment = useMutation({
    mutationFn: async (payment: {
      amount: number;
      payment_method: string;
      reference?: string;
      notes?: string;
    }) => {
      if (!id || !organization?.id) throw new Error("Missing data");
      
      const { error } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: id,
          organization_id: organization.id,
          amount: Math.round(payment.amount * 100),
          payment_method: payment.payment_method,
          reference: payment.reference,
          notes: payment.notes,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoice_payments", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded successfully");
      setPaymentDialogOpen(false);
      resetPaymentForm();
    },
    onError: (error) => {
      toast.error("Failed to record payment: " + error.message);
    },
  });

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentMethod("bank_transfer");
    setPaymentReference("");
    setPaymentNotes("");
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setIsRecordingPayment(true);
    try {
      await recordPayment.mutateAsync({
        amount,
        payment_method: paymentMethod,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    
    setIsDownloadingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: {
          invoiceId: id,
          invoice: {
            ...invoice,
            line_items: invoice.line_items,
            customer: invoice.customer,
          },
          payments,
          settings: invoiceSettings,
        },
      });
      
      if (error) throw error;
      
      // Check if we got a PDF or need to use client-side printing
      if (data.useClientPrint || !data.pdf) {
        // Open HTML in a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
          // Wait for content to load before printing
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
        toast.success("Print dialog opened");
      } else {
        // Convert base64 to blob and download
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${invoice.invoice_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success("PDF downloaded successfully");
      }
    } catch (error: any) {
      toast.error("Failed to generate PDF: " + error.message);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice || !invoice.customer?.email) {
      toast.error("No customer email available");
      return;
    }

    setIsSendingEmail(true);
    try {
      // Force a PDF attachment by generating it client-side
      const pdfBase64 = generateInvoicePdfBase64({
        invoice: {
          ...invoice,
          customer: invoice.customer,
          line_items: invoice.line_items,
        },
        settings: invoiceSettings,
        organizationName: organization?.name || null,
      });

      const { error } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoiceId: id,
          customerEmail: invoice.customer.email,
          customerName: invoice.customer.company_name,
          invoiceNumber: invoice.invoice_number,
          amount: invoice.amount_due / 100,
          dueDate: invoice.due_date,
          organizationId: organization?.id,
          pdfBase64,
          items:
            invoice.line_items?.map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              discount: item.discount,
              discount_type: item.discount_type,
              vat: item.vat,
              amount: item.amount,
            })) || [],
        },
      });

      if (error) throw error;
      toast.success("Invoice sent successfully");
    } catch (error: any) {
      toast.error("Failed to send email: " + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const formatCurrency = (amount: number, fromCents = true) => {
    const value = fromCents ? amount / 100 : amount;
    const currency = invoiceSettings?.currency || "GBP";
    const symbol = currencySymbols[currency] || currency + " ";
    return `${symbol}${value.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-brand-green/10 text-brand-green border-brand-green/20">Paid</Badge>;
      case "partial":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Partial</Badge>;
      case "pending":
        return <Badge className="bg-brand-orange/10 text-brand-orange border-brand-orange/20">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-brand-coral/10 text-brand-coral border-brand-coral/20">Overdue</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Invoice not found</h2>
          <Button onClick={() => navigate("/invoicing/list")}>Back to Invoices</Button>
        </div>
      </div>
    );
  }

  const balanceDue = invoice.amount_due - invoice.amount_paid;
  const lineItems = invoice.line_items || [];
  const customer = invoice.customer;

  // Calculate subtotal and VAT
  let subtotal = 0;
  let totalVat = 0;
  lineItems.forEach((item: any) => {
    const itemSubtotal = item.quantity * item.rate;
    const discountAmount = item.discount_type === "percent" 
      ? (itemSubtotal * item.discount) / 100 
      : item.discount;
    const afterDiscount = itemSubtotal - discountAmount;
    const vatRate = VAT_RATES[item.vat] || 0;
    const vatAmount = (afterDiscount * vatRate) / 100;
    subtotal += afterDiscount;
    totalVat += vatAmount;
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/invoicing/list")} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">{invoice.invoice_number}</h1>
              {getStatusBadge(invoice.status)}
            </div>
            <ActionBar />
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="border-b border-border bg-muted/30 px-6 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/invoicing/edit/${id}`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Email
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              PDF/Print
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Payments Section */}
            <Collapsible open={paymentsOpen} onOpenChange={setPaymentsOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Payments Received</span>
                      <Badge variant="outline">{payments.length}</Badge>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${paymentsOpen ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((payment: any) => (
                          <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="font-medium">{formatCurrency(payment.amount)}</p>
                              <p className="text-sm text-muted-foreground">
                                {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label} • {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                              </p>
                              {payment.reference && (
                                <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                              )}
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-brand-green" />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {balanceDue > 0 && (
                      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="mt-4" size="sm">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Record Payment
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Record Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label>Amount *</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={balanceDue / 100}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder={`Max: ${formatCurrency(balanceDue)}`}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Method *</Label>
                              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PAYMENT_METHODS.map((method) => (
                                    <SelectItem key={method.value} value={method.value}>
                                      {method.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Reference</Label>
                              <Input
                                value={paymentReference}
                                onChange={(e) => setPaymentReference(e.target.value)}
                                placeholder="Transaction ID, cheque number, etc."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <Textarea
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Optional notes"
                                rows={2}
                              />
                            </div>
                            <Button 
                              onClick={handleRecordPayment} 
                              className="w-full"
                              disabled={isRecordingPayment}
                            >
                              {isRecordingPayment ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : null}
                              Record Payment
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Invoice Preview */}
            <Card className="relative overflow-hidden">
              {/* Paid Banner */}
              {invoice.status === "paid" && (
                <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden">
                  <div className="absolute top-6 -left-8 w-40 text-center bg-brand-green text-white text-sm font-bold py-1 transform -rotate-45">
                    Paid
                  </div>
                </div>
              )}
              
              <CardContent className="p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-3">
                    {invoiceSettings?.show_logo !== false && (
                      <img 
                        src={invoiceSettings?.logo_url || bosplanLogo} 
                        alt="Logo" 
                        className="w-12 h-12 object-contain" 
                      />
                    )}
                    <div>
                      <h2 className="font-bold text-lg">{invoiceSettings?.business_name || organization?.name}</h2>
                      {invoiceSettings?.business_address && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{invoiceSettings.business_address}</p>
                      )}
                      {invoiceSettings?.show_tax_number !== false && invoiceSettings?.tax_number && (
                        <p className="text-sm text-muted-foreground">{invoiceSettings.tax_label || 'VAT'}: {invoiceSettings.tax_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-3xl font-light text-muted-foreground mb-1">Invoice</h1>
                    <p className="text-lg font-medium"># {invoice.invoice_number}</p>
                    <div className="mt-4 text-sm">
                      <p className="text-muted-foreground">Balance Due</p>
                      <p className="text-2xl font-bold">{formatCurrency(balanceDue)}</p>
                    </div>
                  </div>
                </div>

                {/* Bill To and Dates */}
                <div className="flex justify-between mb-8">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Bill To</p>
                    {customer && (
                      <div>
                        <p className="font-medium text-primary">{customer.contact_name || customer.company_name}</p>
                        <p className="text-sm">{customer.company_name}</p>
                        {customer.address && <p className="text-sm text-muted-foreground whitespace-pre-line">{customer.address}</p>}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm space-y-1">
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Invoice Date:</span>
                      <span>{format(new Date(invoice.invoice_date || invoice.created_at), "dd/MM/yy")}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Terms:</span>
                      <span>{TERMS_LABELS[invoice.terms || "receipt"] || invoice.terms}</span>
                    </div>
                    {invoice.due_date && (
                      <div className="flex justify-between gap-8">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span>{format(new Date(invoice.due_date), "dd/MM/yy")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">#</th>
                        <th className="text-left p-3 font-medium">Item & Description</th>
                        <th className="text-center p-3 font-medium">Qty</th>
                        <th className="text-right p-3 font-medium">Rate</th>
                        <th className="text-right p-3 font-medium">Discount</th>
                        <th className="text-center p-3 font-medium">VAT %</th>
                        <th className="text-right p-3 font-medium">VAT</th>
                        <th className="text-right p-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item: any, index: number) => {
                        const itemSubtotal = item.quantity * item.rate;
                        const discountAmount = item.discount_type === "percent" 
                          ? (itemSubtotal * item.discount) / 100 
                          : item.discount;
                        const afterDiscount = itemSubtotal - discountAmount;
                        const vatRate = VAT_RATES[item.vat] || 0;
                        const vatAmount = (afterDiscount * vatRate) / 100;
                        
                        return (
                          <tr key={item.id} className="border-t">
                            <td className="p-3">{index + 1}</td>
                            <td className="p-3">{item.description}</td>
                            <td className="p-3 text-center">{item.quantity.toFixed(2)}</td>
                            <td className="p-3 text-right">{item.rate.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              {item.discount > 0 
                                ? item.discount_type === "percent" 
                                  ? `${item.discount}%` 
                                  : formatCurrency(item.discount, false)
                                : "-"
                              }
                            </td>
                            <td className="p-3 text-center">{vatRate}%</td>
                            <td className="p-3 text-right">{vatAmount.toFixed(2)}</td>
                            <td className="p-3 text-right font-medium">{item.amount.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-72 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Sub Total</span>
                      <span>{subtotal.toFixed(2)}</span>
                    </div>
                    {totalVat > 0 && (
                      <div className="flex justify-between">
                        <span>VAT</span>
                        <span>{totalVat.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{formatCurrency(invoice.amount_due)}</span>
                    </div>
                    {invoice.amount_paid > 0 && (
                      <div className="flex justify-between text-brand-coral">
                        <span>Payment Made</span>
                        <span>(-) {formatCurrency(invoice.amount_paid)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold bg-muted p-2 rounded">
                      <span>Balance Due</span>
                      <span>{formatCurrency(balanceDue)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.customer_notes && (
                  <div className="mt-8 pt-6 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-line">{invoice.customer_notes}</p>
                  </div>
                )}

                {invoice.terms_conditions && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-1">Terms & Conditions</p>
                    <p className="text-sm whitespace-pre-line">{invoice.terms_conditions}</p>
                  </div>
                )}

                {invoiceSettings?.terms_and_conditions_url && (
                  <div className="mt-2">
                    <a 
                      href={invoiceSettings.terms_and_conditions_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View Full Terms & Conditions
                    </a>
                  </div>
                )}

                {invoiceSettings?.footer_note && (
                  <div className="mt-6 pt-4 border-t text-center">
                    <p className="text-sm text-muted-foreground">{invoiceSettings.footer_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />
    </div>
  );
};

export default ViewInvoice;