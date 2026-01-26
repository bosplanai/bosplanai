import { useState, useMemo } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { ArrowLeft, Plus, CalendarIcon, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SideNavigation from "@/components/SideNavigation";
import ActionBar from "@/components/ActionBar";
import CustomerSelect from "@/components/invoicing/CustomerSelect";
import ItemSelect from "@/components/invoicing/ItemSelect";
import { Customer } from "@/hooks/useCustomers";
import { InvoiceProduct } from "@/hooks/useInvoiceProducts";
import { useInvoices } from "@/hooks/useInvoices";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  discount: number;
  discountType: "percent" | "fixed";
  vat: string;
}

const VAT_OPTIONS = [
  { value: "none", label: "No VAT", rate: 0 },
  { value: "standard", label: "Standard (20%)", rate: 20 },
  { value: "reduced", label: "Reduced (5%)", rate: 5 },
  { value: "zero", label: "Zero Rated (0%)", rate: 0 },
];

const TERMS_OPTIONS = [
  { value: "receipt", label: "Due on Receipt" },
  { value: "net15", label: "Net 15" },
  { value: "net30", label: "Net 30" },
  { value: "net45", label: "Net 45" },
  { value: "net60", label: "Net 60" },
];

const CreateInvoice = () => {
  const { navigate } = useOrgNavigation();
  const { nextInvoiceNumber, isLoadingNumber, createInvoice, sendInvoice } = useInvoices();
  
  // Customer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Invoice header fields
  const [orderNumber, setOrderNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [terms, setTerms] = useState("receipt");
  const [dueDate, setDueDate] = useState<Date>(new Date());
  
  // Items
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, discount: 0, discountType: "percent", vat: "none" },
  ]);
  
  // Adjustment and notes
  const [adjustment, setAdjustment] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // Generate a new item
  const addItem = () => {
    setItems([
      ...items,
      { id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, discount: 0, discountType: "percent", vat: "none" },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map((item) => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleProductSelect = (id: string, product: InvoiceProduct) => {
    setItems(items.map((item) => 
      item.id === id 
        ? { 
            ...item, 
            description: product.name,
            rate: Number(product.default_rate),
            vat: product.default_vat,
          } 
        : item
    ));
  };

  // Calculate item amount (rate * qty - discount + vat)
  const calculateItemAmount = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.rate;
    const discountAmount = item.discountType === "percent" 
      ? (subtotal * item.discount) / 100 
      : item.discount;
    const afterDiscount = subtotal - discountAmount;
    const vatOption = VAT_OPTIONS.find((v) => v.value === item.vat);
    const vatAmount = vatOption ? (afterDiscount * vatOption.rate) / 100 : 0;
    return afterDiscount + vatAmount;
  };

  // Calculate totals
  const { subTotal, totalVat, total } = useMemo(() => {
    let subTotal = 0;
    let totalVat = 0;
    
    items.forEach((item) => {
      const itemSubtotal = item.quantity * item.rate;
      const discountAmount = item.discountType === "percent" 
        ? (itemSubtotal * item.discount) / 100 
        : item.discount;
      const afterDiscount = itemSubtotal - discountAmount;
      const vatOption = VAT_OPTIONS.find((v) => v.value === item.vat);
      const vatAmount = vatOption ? (afterDiscount * vatOption.rate) / 100 : 0;
      
      subTotal += afterDiscount;
      totalVat += vatAmount;
    });
    
    const total = subTotal + totalVat + adjustment;
    
    return { subTotal, totalVat, total };
  }, [items, adjustment]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const validateForm = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return false;
    }
    
    if (items.some((item) => !item.description.trim())) {
      toast.error("Please fill in all item descriptions");
      return false;
    }
    
    return true;
  };

  const buildInvoiceData = () => ({
    customer_id: selectedCustomer!.id,
    customer_email: selectedCustomer!.email,
    customer_name: selectedCustomer!.company_name,
    invoice_number: nextInvoiceNumber,
    description: customerNotes || undefined,
    due_date: dueDate,
    amount_due: total,
    items: items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount,
      discount_type: item.discountType,
      vat: item.vat,
      amount: calculateItemAmount(item),
    })),
    notes: customerNotes,
    terms: termsAndConditions,
  });

  const handleSaveAsDraft = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      await createInvoice.mutateAsync({
        ...buildInvoiceData(),
        status: "draft",
      });
      toast.success("Invoice saved as draft");
      navigate("/invoicing");
    } catch (error: any) {
      toast.error("Failed to save invoice: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSending(true);
    try {
      const invoiceData = buildInvoiceData();
      const invoice = await createInvoice.mutateAsync({
        ...invoiceData,
        status: "pending",
      });
      
      // Send email
      await sendInvoice.mutateAsync({
        invoiceId: invoice.id,
        customerEmail: selectedCustomer!.email,
        customerName: selectedCustomer!.company_name,
        invoiceNumber: nextInvoiceNumber || "INV-000001",
        amount: total,
        dueDate: dueDate.toISOString(),
        items: invoiceData.items,
      });
      
      navigate("/invoicing");
    } catch (error: any) {
      toast.error("Failed to send invoice: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/invoicing")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">New Invoice</h1>
            </div>
            <ActionBar />
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <form onSubmit={handleSaveAndSend} className="max-w-5xl mx-auto space-y-6">
            {/* Customer Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-primary">
                      Customer<span className="text-destructive">*</span>
                    </Label>
                    <CustomerSelect
                      selectedCustomer={selectedCustomer}
                      onSelect={setSelectedCustomer}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber" className="text-primary">
                      Invoice#<span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invoiceNumber"
                      value={isLoadingNumber ? "Loading..." : nextInvoiceNumber || "INV-000001"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderNumber">Order Number</Label>
                    <Input
                      id="orderNumber"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-primary">
                      Invoice Date<span className="text-destructive">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !invoiceDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {invoiceDate ? format(invoiceDate, "dd/MM/yy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={invoiceDate}
                          onSelect={(date) => date && setInvoiceDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Terms</Label>
                    <Select value={terms} onValueChange={setTerms}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TERMS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "dd/MM/yy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => date && setDueDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Item Table */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Item Table</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-2">
                  <div className="col-span-4">Item Details</div>
                  <div className="col-span-1 text-center">Quantity</div>
                  <div className="col-span-2 text-center">Rate</div>
                  <div className="col-span-1 text-center">Discount</div>
                  <div className="col-span-2">VAT</div>
                  <div className="col-span-1 text-right">Amount</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-lg p-2"
                    >
                      <div className="col-span-4">
                        <ItemSelect
                          value={item.description}
                          onChange={(value) => updateItem(item.id, "description", value)}
                          onProductSelect={(product) => handleProductSelect(item.id, product)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          className="bg-background text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                          className="bg-background text-center"
                        />
                      </div>
                      <div className="col-span-1 flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
                          className="bg-background text-center w-16"
                        />
                        <span className="text-muted-foreground text-sm">%</span>
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={item.vat}
                          onValueChange={(value) => updateItem(item.id, "vat", value)}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select VAT" />
                          </SelectTrigger>
                          <SelectContent>
                            {VAT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 text-right font-medium">
                        {formatCurrency(calculateItemAmount(item))}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Row Button */}
                <div className="mt-4">
                  <Button type="button" variant="outline" onClick={addItem} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Row
                  </Button>
                </div>

                {/* Totals */}
                <div className="mt-6 flex justify-end">
                  <div className="w-72 space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Sub Total</span>
                      <span>{formatCurrency(subTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Adjustment</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={adjustment}
                        onChange={(e) => setAdjustment(parseFloat(e.target.value) || 0)}
                        className="w-24 text-right"
                      />
                    </div>
                    <div className="flex justify-between border-t pt-3 text-lg font-semibold">
                      <span>Total ( £ )</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes and Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Customer Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Add notes for the customer..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Will be displayed on the invoice
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={termsAndConditions}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    placeholder="Enter your terms and conditions..."
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Attach Files */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Attach File(s) to Invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Button type="button" variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload File
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    You can upload a maximum of 10 files, 10MB each
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/invoicing")}>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleSaveAsDraft}
                disabled={isSaving || isSending}
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save as Draft
              </Button>
              <Button type="submit" disabled={isSaving || isSending}>
                {isSending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save and Send
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />
    </div>
  );
};

export default CreateInvoice;
