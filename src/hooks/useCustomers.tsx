import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface Customer {
  id: string;
  organization_id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  notes: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  enquiry_source: string | null;
  additional_info: string | null;
  created_at: string;
  updated_at: string;
}

export const useCustomers = () => {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organization.id)
        .order("first_name");
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!organization?.id,
  });

  const addCustomer = useMutation({
    mutationFn: async (customer: {
      company_name?: string;
      contact_name?: string;
      email: string;
      phone?: string;
      mobile?: string;
      address?: string;
      notes?: string;
      first_name?: string;
      last_name?: string;
      status?: string;
      enquiry_source?: string;
      additional_info?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("customers")
        .insert({
          organization_id: organization.id,
          company_name: customer.company_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "Unknown",
          contact_name: customer.contact_name || `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || null,
          email: customer.email,
          phone: customer.phone || null,
          mobile: customer.mobile || null,
          address: customer.address || null,
          notes: customer.notes || null,
          first_name: customer.first_name || null,
          last_name: customer.last_name || null,
          status: customer.status || "active",
          enquiry_source: customer.enquiry_source || null,
          additional_info: customer.additional_info || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", organization?.id] });
    },
    onError: (error) => {
      toast.error("Failed to add customer: " + error.message);
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async (customer: Partial<Customer> & { id: string }) => {
      const { id, ...updateData } = customer;
      
      // Also update contact_name when first/last name changes
      if (updateData.first_name !== undefined || updateData.last_name !== undefined) {
        const firstName = updateData.first_name ?? "";
        const lastName = updateData.last_name ?? "";
        updateData.contact_name = `${firstName} ${lastName}`.trim() || null;
      }

      const { data, error } = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", organization?.id] });
    },
    onError: (error) => {
      toast.error("Failed to update customer: " + error.message);
    },
  });

  return { customers, isLoading, addCustomer, updateCustomer };
};
