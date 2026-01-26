import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface CRMMeeting {
  id: string;
  organization_id: string;
  meeting_number: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  meeting_venue: string | null;
  customer_id: string | null;
  assigned_to: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
    company_name: string;
  } | null;
  assignee?: {
    id: string;
    full_name: string;
  } | null;
}

export const useMeetings = () => {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["crm_meetings", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("crm_meetings")
        .select(`
          *,
          customer:customers(id, first_name, last_name, email, company_name),
          assignee:profiles!crm_meetings_assigned_to_fkey(id, full_name)
        `)
        .eq("organization_id", organization.id)
        .order("start_time", { ascending: false });
      
      if (error) throw error;
      return data as CRMMeeting[];
    },
    enabled: !!organization?.id,
  });

  const addMeeting = useMutation({
    mutationFn: async (meetingData: {
      title: string;
      description?: string;
      start_time: string;
      end_time: string;
      meeting_venue?: string;
      customer_id?: string;
      assigned_to?: string;
      status?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("crm_meetings")
        .insert({
          organization_id: organization.id,
          meeting_number: "",
          title: meetingData.title,
          description: meetingData.description || null,
          start_time: meetingData.start_time,
          end_time: meetingData.end_time,
          meeting_venue: meetingData.meeting_venue || null,
          customer_id: meetingData.customer_id || null,
          assigned_to: meetingData.assigned_to || null,
          status: meetingData.status || "scheduled",
        })
        .select()
        .single();

      if (error) throw error;
      return data as CRMMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_meetings", organization?.id] });
    },
    onError: (error) => {
      toast.error("Failed to create meeting: " + error.message);
    },
  });

  const updateMeeting = useMutation({
    mutationFn: async (meetingData: Partial<CRMMeeting> & { id: string }) => {
      const { id, customer, assignee, ...updateData } = meetingData;

      const { data, error } = await supabase
        .from("crm_meetings")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as CRMMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_meetings", organization?.id] });
    },
    onError: (error) => {
      toast.error("Failed to update meeting: " + error.message);
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_meetings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_meetings", organization?.id] });
    },
    onError: (error) => {
      toast.error("Failed to delete meeting: " + error.message);
    },
  });

  return { meetings, isLoading, addMeeting, updateMeeting, deleteMeeting };
};
