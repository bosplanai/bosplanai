-- Create invoice payments table to track multiple payments
CREATE TABLE public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'credit_card', 'cheque', 'other')),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoice_payments
CREATE POLICY "Users can view payments in their organization" 
ON public.invoice_payments FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert payments in their organization" 
ON public.invoice_payments FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update payments in their organization" 
ON public.invoice_payments FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete payments in their organization" 
ON public.invoice_payments FOR DELETE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- Add invoice_date and terms columns to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms TEXT DEFAULT 'receipt';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Create function to update amount_paid when payments change
CREATE OR REPLACE FUNCTION public.update_invoice_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.invoices 
    SET amount_paid = COALESCE((
      SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = OLD.invoice_id
    ), 0),
    status = CASE 
      WHEN COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = OLD.invoice_id), 0) >= amount_due THEN 'paid'
      WHEN COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = OLD.invoice_id), 0) > 0 THEN 'partial'
      ELSE 'pending'
    END
    WHERE id = OLD.invoice_id;
    RETURN OLD;
  ELSE
    UPDATE public.invoices 
    SET amount_paid = COALESCE((
      SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = NEW.invoice_id
    ), 0),
    status = CASE 
      WHEN COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = NEW.invoice_id), 0) >= amount_due THEN 'paid'
      WHEN COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE invoice_id = NEW.invoice_id), 0) > 0 THEN 'partial'
      ELSE 'pending'
    END
    WHERE id = NEW.invoice_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment updates
CREATE TRIGGER update_invoice_paid_amount
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_amount_paid();