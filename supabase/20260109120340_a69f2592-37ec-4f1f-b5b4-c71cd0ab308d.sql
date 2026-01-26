-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice items/products table
CREATE TABLE public.invoice_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  default_vat TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice line items table
CREATE TABLE public.invoice_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  vat TEXT NOT NULL DEFAULT 'none',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add customer_id to invoices table
ALTER TABLE public.invoices ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view customers in their organization" 
ON public.customers FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert customers in their organization" 
ON public.customers FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update customers in their organization" 
ON public.customers FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete customers in their organization" 
ON public.customers FOR DELETE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for invoice_products
CREATE POLICY "Users can view products in their organization" 
ON public.invoice_products FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert products in their organization" 
ON public.invoice_products FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update products in their organization" 
ON public.invoice_products FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete products in their organization" 
ON public.invoice_products FOR DELETE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for invoice_line_items (based on invoice's organization)
CREATE POLICY "Users can view line items for their organization invoices" 
ON public.invoice_line_items FOR SELECT 
USING (invoice_id IN (
  SELECT id FROM public.invoices 
  WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can insert line items for their organization invoices" 
ON public.invoice_line_items FOR INSERT 
WITH CHECK (invoice_id IN (
  SELECT id FROM public.invoices 
  WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can update line items for their organization invoices" 
ON public.invoice_line_items FOR UPDATE 
USING (invoice_id IN (
  SELECT id FROM public.invoices 
  WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can delete line items for their organization invoices" 
ON public.invoice_line_items FOR DELETE 
USING (invoice_id IN (
  SELECT id FROM public.invoices 
  WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
));

-- Add triggers for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_products_updated_at
BEFORE UPDATE ON public.invoice_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();