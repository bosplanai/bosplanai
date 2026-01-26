import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Plus, FileText, Search, ArrowLeft, Eye, Download, MoreVertical, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SideNavigation from "@/components/SideNavigation";
import ActionBar from "@/components/ActionBar";
import { useOrganization } from "@/hooks/useOrganization";
import { useInvoiceSettings } from "@/hooks/useInvoiceSettings";
import { generateInvoicePdfBase64 } from "@/lib/invoicePdf";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import AddCustomerDialog from "@/components/invoicing/AddCustomerDialog";
import bosplanLogo from "@/assets/bosplan-logo-icon.png";
import { format } from "date-fns";
import { toast } from "sonner";

const InvoiceList = () => {
  const { navigate } = useOrgNavigation();
  const { organization } = useOrganization();
  const { settings: invoiceSettings } = useInvoiceSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);

  // Fetch invoices from database with customer and line items
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customer:customers(*),
          line_items:invoice_line_items(*)
        `)
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  const handleSendEmail = async (invoice: any) => {
    if (!invoice.customer?.email) {
      toast.error("No customer email available for this invoice");
      return;
    }

    setSendingInvoiceId(invoice.id);
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
          invoiceId: invoice.id,
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
      toast.success("Invoice sent successfully to " + invoice.customer.email);
    } catch (error: any) {
      console.error("Failed to send invoice email:", error);
      toast.error("Failed to send email: " + error.message);
    } finally {
      setSendingInvoiceId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(amount / 100); // amounts stored in cents
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-brand-green/10 text-brand-green border-brand-green/20">Paid</Badge>;
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

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Sidebar Menu */}
      <div className="w-52 bg-brand-teal flex flex-col p-4 gap-3">
        <div className="flex items-center gap-2 mb-6">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/invoicing")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">Invoices</h1>
            </div>
            <ActionBar />
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-border">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search invoices..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10" 
            />
          </div>
        </div>

        {/* Invoice List */}
        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading invoices...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-medium mb-2">No invoices yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first invoice to get started.
                </p>
                <Button onClick={() => navigate("/invoicing/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {invoice.due_date 
                          ? format(new Date(invoice.due_date), "dd/MM/yyyy")
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {invoice.description || "-"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.amount_due)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.amount_paid)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/invoicing/view/${invoice.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleSendEmail(invoice)}
                              disabled={sendingInvoiceId === invoice.id || !invoice.customer?.email}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {sendingInvoiceId === invoice.id ? "Sending..." : "Email to Customer"}
                            </DropdownMenuItem>
                            {invoice.pdf_url && (
                              <DropdownMenuItem asChild>
                                <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download PDF
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />

      {/* Dialogs */}
      <AddCustomerDialog isOpen={isCustomerDialogOpen} onClose={() => setIsCustomerDialogOpen(false)} />
    </div>
  );
};

export default InvoiceList;
