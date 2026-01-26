import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";

export interface HelpdeskSettings {
  id?: string;
  organization_id: string;
  company_name: string;
  support_email: string;
  support_phone: string;
  timezone: string;
  business_hours_start: string;
  business_hours_end: string;
  working_days: string[];
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  portal_slug: string;
  portal_enabled: boolean;
  show_name_field: boolean;
  show_email_field: boolean;
  show_phone_field: boolean;
  show_details_field: boolean;
  show_attachment_field: boolean;
}

const defaultSettings: Omit<HelpdeskSettings, 'organization_id'> = {
  company_name: "",
  support_email: "",
  support_phone: "",
  timezone: "Europe/London",
  business_hours_start: "09:00",
  business_hours_end: "17:00",
  working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  logo_url: "",
  primary_color: "#1B9AAA",
  secondary_color: "#E0523A",
  portal_slug: "",
  portal_enabled: true,
  show_name_field: true,
  show_email_field: true,
  show_phone_field: true,
  show_details_field: true,
  show_attachment_field: true,
};

export const useHelpdeskSettings = () => {
  const [settings, setSettings] = useState<HelpdeskSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!organization?.id) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("helpdesk_settings")
        .select("*")
        .eq("organization_id", organization.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as HelpdeskSettings);
      } else {
        // Return defaults with organization_id
        setSettings({
          ...defaultSettings,
          organization_id: organization.id,
        });
      }
    } catch (error) {
      console.error("Error fetching helpdesk settings:", error);
      setSettings({
        ...defaultSettings,
        organization_id: organization.id,
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const saveSettings = async (updates: Partial<HelpdeskSettings>) => {
    if (!organization?.id) throw new Error("No organization");

    setSaving(true);
    try {
      const settingsToSave = {
        ...settings,
        ...updates,
        organization_id: organization.id,
      };

      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from("helpdesk_settings")
          .update(settingsToSave)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("helpdesk_settings")
          .insert(settingsToSave)
          .select()
          .single();

        if (error) throw error;
        settingsToSave.id = data.id;
      }

      setSettings(settingsToSave as HelpdeskSettings);
      toast({
        title: "Settings saved",
        description: "Your helpdesk settings have been updated",
      });
    } catch (error: any) {
      console.error("Error saving helpdesk settings:", error);
      
      // Check for unique constraint violation on portal_slug
      if (error?.code === "23505" && error?.message?.includes("portal_slug")) {
        toast({
          title: "URL already taken",
          description: "This portal URL is already in use. Please choose a different one.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error saving settings",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
      throw error;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refetch: fetchSettings,
  };
};
