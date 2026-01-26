import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface InvoiceSettings {
  id?: string;
  organization_id: string;
  // Organisation Profile
  business_name: string | null;
  business_address: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_website: string | null;
  tax_number: string | null;
  // Branding
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  // General Settings
  currency: string;
  location: string;
  tax_rate: number;
  tax_label: string;
  financial_year_start: string;
  // Customisation
  invoice_prefix: string;
  show_logo: boolean;
  show_tax_number: boolean;
  show_payment_terms: boolean;
  default_payment_terms: string;
  terms_and_conditions_url: string | null;
  footer_note: string | null;
  // Reminders
  enable_reminders: boolean;
  reminder_before_due: number;
  reminder_on_due: boolean;
  reminder_after_due: number;
  max_reminders: number;
}

const defaultSettings: Omit<InvoiceSettings, 'organization_id'> = {
  business_name: null,
  business_address: null,
  business_email: null,
  business_phone: null,
  business_website: null,
  tax_number: null,
  logo_url: null,
  primary_color: '#1B9AAA',
  secondary_color: '#E0523A',
  currency: 'GBP',
  location: 'GB',
  tax_rate: 20,
  tax_label: 'VAT',
  financial_year_start: 'april',
  invoice_prefix: 'INV-',
  show_logo: true,
  show_tax_number: true,
  show_payment_terms: true,
  default_payment_terms: '30',
  terms_and_conditions_url: null,
  footer_note: null,
  enable_reminders: true,
  reminder_before_due: 3,
  reminder_on_due: true,
  reminder_after_due: 7,
  max_reminders: 3,
};

export const useInvoiceSettings = () => {
  const { organization } = useOrganization();
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("invoice_settings")
        .select("*")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as InvoiceSettings);
      } else {
        // Return default settings with organization id
        setSettings({
          ...defaultSettings,
          organization_id: organization.id,
          business_name: organization.name || null,
        });
      }
    } catch (error: any) {
      console.error("Error fetching invoice settings:", error);
      // Still set defaults on error
      setSettings({
        ...defaultSettings,
        organization_id: organization.id,
        business_name: organization.name || null,
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, organization?.name]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings: Partial<InvoiceSettings>) => {
    if (!organization?.id) return false;

    setSaving(true);
    try {
      const settingsToSave = {
        ...settings,
        ...newSettings,
        organization_id: organization.id,
      };

      // Remove id for upsert
      const { id, ...dataWithoutId } = settingsToSave as InvoiceSettings & { id?: string };

      const { data, error } = await supabase
        .from("invoice_settings")
        .upsert(dataWithoutId, { onConflict: 'organization_id' })
        .select()
        .single();

      if (error) throw error;

      setSettings(data as InvoiceSettings);
      toast.success("Settings saved successfully");
      return true;
    } catch (error: any) {
      console.error("Error saving invoice settings:", error);
      toast.error("Failed to save settings: " + error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!organization?.id) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${organization.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('invoice-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('invoice-logos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo: " + error.message);
      return null;
    }
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    uploadLogo,
    refetch: fetchSettings,
  };
};

// Currency symbols map
export const currencySymbols: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  CAD: 'C$',
  AUD: 'A$',
};

// Format currency based on settings
export const formatCurrencyWithSettings = (
  amount: number, 
  currency: string = 'GBP',
  fromCents: boolean = true
): string => {
  const value = fromCents ? amount / 100 : amount;
  const symbol = currencySymbols[currency] || currency + ' ';
  return `${symbol}${value.toFixed(2)}`;
};
