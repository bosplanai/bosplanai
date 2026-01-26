import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface InvoiceProduct {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  default_rate: number;
  default_vat: string;
  created_at: string;
  updated_at: string;
}

export const useInvoiceProducts = () => {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["invoice_products", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("invoice_products")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name");
      
      if (error) throw error;
      return data as InvoiceProduct[];
    },
    enabled: !!organization?.id,
  });

  const addProduct = useMutation({
    mutationFn: async (product: {
      name: string;
      description?: string;
      default_rate: number;
      default_vat: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("invoice_products")
        .insert({
          organization_id: organization.id,
          name: product.name,
          description: product.description || null,
          default_rate: product.default_rate,
          default_vat: product.default_vat,
        })
        .select()
        .single();

      if (error) throw error;
      return data as InvoiceProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice_products", organization?.id] });
      toast.success("Item added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add item: " + error.message);
    },
  });

  return { products, isLoading, addProduct };
};
