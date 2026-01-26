-- Add missing RLS policies for invoices table
CREATE POLICY "Users can insert invoices in their organization" 
ON public.invoices FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update invoices in their organization" 
ON public.invoices FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete invoices in their organization" 
ON public.invoices FOR DELETE 
USING (organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));