import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useToast } from "./use-toast";

export interface HelpdeskTicket {
  id: string;
  organization_id: string;
  ticket_number: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subject: string;
  details: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  status: "open" | "under_review" | "closed";
  channel: "web" | "email" | "phone";
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export const useHelpdeskTickets = () => {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    if (!organization?.id) {
      setTickets([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("helpdesk_tickets")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTickets((data || []) as HelpdeskTicket[]);
    } catch (error) {
      console.error("Error fetching helpdesk tickets:", error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const updateTicketStatus = async (ticketId: string, status: HelpdeskTicket["status"]) => {
    try {
      const { error } = await supabase
        .from("helpdesk_tickets")
        .update({ status })
        .eq("id", ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status } : t
      ));

      toast({
        title: "Status updated",
        description: `Ticket marked as ${status.replace("_", " ")}`,
      });
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const assignTicket = async (ticketId: string, userId: string | null) => {
    try {
      const { error } = await supabase
        .from("helpdesk_tickets")
        .update({ assigned_to: userId })
        .eq("id", ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, assigned_to: userId } : t
      ));

      toast({
        title: "Ticket assigned",
        description: userId ? "Ticket has been assigned" : "Ticket unassigned",
      });
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast({
        title: "Error",
        description: "Failed to assign ticket",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return {
    tickets,
    loading,
    updateTicketStatus,
    assignTicket,
    refetch: fetchTickets,
  };
};
