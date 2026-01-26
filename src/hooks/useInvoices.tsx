import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface InvoiceData {
  customer_id: string;
  customer_email: string;
  customer_name: string;
  invoice_number?: string;
  description?: string;
  due_date?: Date;
  amount_due: number;
  status?: string;
  items: {
    description: string;
    quantity: number;
    rate: number;
    discount: number;
    discount_type: string;
    vat: string;
    amount: number;
  }[];
  notes?: string;
  terms?: string;
}

export const useInvoices = () => {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: nextInvoiceNumber, isLoading: isLoadingNumber } = useQuery({
    queryKey: ["next_invoice_number", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return "INV-000001";
      
      // Get the latest invoice number
      const { data, error } = await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return "INV-000001";
      }
      
      // Parse the last invoice number and increment
      const lastNumber = data[0].invoice_number;
      const match = lastNumber.match(/INV-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        return `INV-${num.toString().padStart(6, "0")}`;
      }
      
      return "INV-000001";
    },
    enabled: !!organization?.id,
  });

  const createInvoice = useMutation({
    mutationFn: async (invoice: InvoiceData) => {
      if (!organization?.id) throw new Error("No organization");

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          organization_id: organization.id,
          customer_id: invoice.customer_id,
          invoice_number: invoice.invoice_number || nextInvoiceNumber,
          description: invoice.description,
          due_date: invoice.due_date?.toISOString(),
          amount_due: Math.round(invoice.amount_due * 100), // Store in cents
          status: invoice.status || "pending",
          currency: "gbp",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items
      const lineItems = invoice.items.map((item, index) => ({
        invoice_id: invoiceData.id,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        discount: item.discount,
        discount_type: item.discount_type,
        vat: item.vat,
        amount: item.amount,
        position: index,
      }));

      const { error: lineItemsError } = await supabase
        .from("invoice_line_items")
        .insert(lineItems);

      if (lineItemsError) throw lineItemsError;

      return invoiceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", organization?.id] });
      queryClient.invalidateQueries({ queryKey: ["next_invoice_number", organization?.id] });
    },
  });

  const sendInvoice = useMutation({
    mutationFn: async (params: {
      invoiceId: string;
      customerEmail: string;
      customerName: string;
      invoiceNumber: string;
      amount: number;
      dueDate?: string;
      items: InvoiceData["items"];
    }) => {
      const { data, error } = await supabase.functions.invoke("send-invoice-email", {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Invoice sent successfully!");
    },
    onError: (error) => {
      toast.error("Failed to send invoice: " + error.message);
    },
  });

  return { 
    nextInvoiceNumber, 
    isLoadingNumber, 
    createInvoice, 
    sendInvoice 
  };
};
