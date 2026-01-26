import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";

export type TimeGroup = "today" | "this_week" | "this_month";
export type ChecklistPriority = "high" | "medium" | "low";

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  is_completed: boolean;
  time_group: TimeGroup;
  position: number;
  created_at: string;
  due_date?: string | null;
  priority: ChecklistPriority;
  project_id?: string | null;
  icon: string;
  // Stored file path (not a signed URL)
  attachment_url?: string | null;
  attachment_name?: string | null;
  // Derived at runtime for UI rendering
  signed_attachment_url?: string | null;
}

export interface AddChecklistItemParams {
  title: string;
  timeGroup?: TimeGroup;
  description?: string;
  dueDate?: string | null;
  priority?: ChecklistPriority;
  projectId?: string | null;
  icon?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface UpdateChecklistItemParams {
  id: string;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: ChecklistPriority;
  projectId?: string | null;
  icon?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

// Determine time group based on due date
export const getTimeGroupFromDueDate = (
  dueDate: string | null | undefined
): TimeGroup => {
  if (!dueDate) return "this_month"; // Default to this_month if no due date

  const now = new Date();
  const dueDateParsed = parseISO(dueDate);

  // Check if it's today
  if (
    isWithinInterval(dueDateParsed, {
      start: startOfDay(now),
      end: endOfDay(now),
    })
  ) {
    return "today";
  }

  // Check if it's this week
  if (
    isWithinInterval(dueDateParsed, {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    })
  ) {
    return "this_week";
  }

  // Default to this month
  return "this_month";
};

export const usePersonalChecklist = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  };

  const fetchItems = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("personal_checklist_items")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });

      if (error) throw error;

      const withSigned = await Promise.all(
        (data || []).map(async (i) => {
          let signed: string | null = null;
          if (i.attachment_url) {
            signed = i.attachment_url.startsWith("http")
              ? i.attachment_url
              : await getSignedUrl(i.attachment_url);
          }
          return {
            ...(i as ChecklistItem),
            signed_attachment_url: signed,
          };
        })
      );

      setItems(withSigned as ChecklistItem[]);
    } catch (error: any) {
      console.error("Error fetching checklist items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [user]);

  // Real-time subscription for personal checklist items
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("personal-checklist-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "personal_checklist_items",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const addItem = async (params: AddChecklistItemParams) => {
    if (!user) return;

    try {
      // Determine time group from due date
      const timeGroup = getTimeGroupFromDueDate(params.dueDate);

      const maxPosition = items
        .filter((item) => item.time_group === timeGroup)
        .reduce((max, item) => Math.max(max, item.position), -1);

      const { data, error } = await supabase
        .from("personal_checklist_items")
        .insert({
          user_id: user.id,
          title: params.title,
          time_group: timeGroup,
          position: maxPosition + 1,
          description: params.description || null,
          due_date: params.dueDate || null,
          priority: params.priority || "medium",
          project_id: params.projectId || null,
          icon: params.icon || "ListTodo",
          attachment_url: params.attachmentUrl || null,
          attachment_name: params.attachmentName || null,
        })
        .select()
        .single();

      if (error) throw error;

      let signed: string | null = null;
      if (data?.attachment_url) {
        signed = data.attachment_url.startsWith("http")
          ? data.attachment_url
          : await getSignedUrl(data.attachment_url);
      }

      setItems((prev) => [
        ...prev,
        { ...(data as ChecklistItem), signed_attachment_url: signed },
      ]);
      toast.success("Item added");
    } catch (error: any) {
      console.error("Error adding checklist item:", error);
      toast.error("Failed to add item");
    }
  };

  const updateItem = async (params: UpdateChecklistItemParams) => {
    if (!user) return;

    try {
      // Determine new time group if due date is being updated
      const newTimeGroup =
        params.dueDate !== undefined
          ? getTimeGroupFromDueDate(params.dueDate)
          : undefined;

      const updateData: any = {};
      if (params.title !== undefined) updateData.title = params.title;
      if (params.description !== undefined)
        updateData.description = params.description;
      if (params.dueDate !== undefined) updateData.due_date = params.dueDate;
      if (params.priority !== undefined) updateData.priority = params.priority;
      if (params.projectId !== undefined) updateData.project_id = params.projectId;
      if (params.icon !== undefined) updateData.icon = params.icon;
      if (params.attachmentUrl !== undefined)
        updateData.attachment_url = params.attachmentUrl;
      if (params.attachmentName !== undefined)
        updateData.attachment_name = params.attachmentName;
      if (newTimeGroup !== undefined) updateData.time_group = newTimeGroup;

      const { error } = await supabase
        .from("personal_checklist_items")
        .update(updateData)
        .eq("id", params.id);

      if (error) throw error;

      let signedOverride: string | null | undefined = undefined;
      if (updateData.attachment_url !== undefined) {
        const url = updateData.attachment_url as string | null;
        if (url) {
          signedOverride = url.startsWith("http") ? url : await getSignedUrl(url);
        } else {
          signedOverride = null;
        }
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === params.id
            ? {
                ...i,
                ...updateData,
                ...(signedOverride !== undefined
                  ? { signed_attachment_url: signedOverride }
                  : null),
              }
            : i
        )
      );
      toast.success("Item updated");
    } catch (error: any) {
      console.error("Error updating checklist item:", error);
      toast.error("Failed to update item");
    }
  };

  const toggleItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    try {
      const { error } = await supabase
        .from("personal_checklist_items")
        .update({ is_completed: !item.is_completed })
        .eq("id", id);

      if (error) throw error;
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, is_completed: !i.is_completed } : i
        )
      );
    } catch (error: any) {
      console.error("Error toggling checklist item:", error);
      toast.error("Failed to update item");
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("personal_checklist_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item deleted");
    } catch (error: any) {
      console.error("Error deleting checklist item:", error);
      toast.error("Failed to delete item");
    }
  };

  const getItemsByGroup = (group: TimeGroup) => {
    return items.filter((item) => item.time_group === group);
  };

  return {
    items,
    loading,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
    getItemsByGroup,
  };
};

