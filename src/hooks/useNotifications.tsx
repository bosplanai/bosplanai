import { useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

// Session-level storage for shown notification IDs to persist across component remounts
const shownNotificationIdsStorage = new Set<string>();

// Track IDs that are currently being updated to prevent race conditions with realtime
const pendingUpdateIds = new Set<string>();
let pendingMarkAllAsRead = false;

export const useNotifications = () => {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Calculate the 7-day threshold for filtering - memoize to prevent recalculation on every render
  const sevenDaysAgoIso = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString();
  }, []);

  const { data: rawNotifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id, organization?.id],
    queryFn: async () => {
      if (!user || !organization) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .gte("created_at", sevenDaysAgoIso)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching notifications:", error);
        return [];
      }

      return data as Notification[];
    },
    enabled: !!user && !!organization,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds to reduce refetches
  });

  // Deduplicate notifications by ID to prevent showing duplicates
  const notifications = useMemo(() => {
    const seen = new Set<string>();
    return rawNotifications.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [rawNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      // Track that we're updating this ID
      pendingUpdateIds.add(notificationId);
      
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        pendingUpdateIds.delete(notificationId);
        throw error;
      }
      
      // Clear the pending flag after a short delay to handle race conditions
      setTimeout(() => pendingUpdateIds.delete(notificationId), 1000);
    },
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id, organization?.id] });
      
      // Snapshot the previous value for rollback
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications", user?.id, organization?.id]);
      
      // Optimistically update the cache
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id, organization?.id],
        (old) => old?.map(n => n.id === notificationId ? { ...n, is_read: true } : n) || []
      );
      
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      console.error("Error marking notification as read:", err);
      // Rollback to previous state
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", user?.id, organization?.id], context.previousNotifications);
      }
    },
    onSettled: () => {
      // Don't invalidate here - let the realtime handle syncing
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user || !organization) {
        throw new Error("User or organization not available");
      }

      // Track that we're doing a bulk update
      pendingMarkAllAsRead = true;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .eq("is_read", false);

      if (error) {
        pendingMarkAllAsRead = false;
        throw error;
      }
      
      // Clear the pending flag after a short delay to handle race conditions
      setTimeout(() => { pendingMarkAllAsRead = false; }, 1000);
    },
    onMutate: async () => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id, organization?.id] });
      
      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications", user?.id, organization?.id]);
      
      // Optimistically update to mark all as read
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id, organization?.id],
        (old) => old?.map(n => ({ ...n, is_read: true })) || []
      );
      
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      console.error("Error marking all notifications as read:", err);
      // Rollback on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", user?.id, organization?.id], context.previousNotifications);
      }
    },
    onSuccess: () => {
      // After successful mutation, ensure cache reflects the read state
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id, organization?.id],
        (old) => old?.map(n => ({ ...n, is_read: true })) || []
      );
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onMutate: async (notificationId) => {
      // Optimistically remove from cache
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id, organization?.id] });
      
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications", user?.id, organization?.id]);
      
      queryClient.setQueryData<Notification[]>(
        ["notifications", user?.id, organization?.id],
        (old) => old?.filter(n => n.id !== notificationId) || []
      );
      
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      console.error("Error deleting notification:", err);
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", user?.id, organization?.id], context.previousNotifications);
      }
    },
  });

  const clearAllNotifications = useMutation({
    mutationFn: async () => {
      if (!user || !organization) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .eq("organization_id", organization.id);

      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications", user?.id, organization?.id] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(["notifications", user?.id, organization?.id]);
      queryClient.setQueryData<Notification[]>(["notifications", user?.id, organization?.id], []);
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      console.error("Error clearing all notifications:", err);
      if (context?.previousNotifications) {
        queryClient.setQueryData(["notifications", user?.id, organization?.id], context.previousNotifications);
      }
    },
  });

  // Initialize shown IDs with existing notifications on first load
  useEffect(() => {
    if (notifications.length > 0) {
      notifications.forEach(n => shownNotificationIdsStorage.add(n.id));
    }
  }, [notifications]);

  // Set up realtime subscription for new notifications with toast popup
  useEffect(() => {
    if (!user || !organization) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          
          // Show toast popup for new notification only if not already shown
          const newNotification = payload.new as Notification;
          if (newNotification && !shownNotificationIdsStorage.has(newNotification.id)) {
            shownNotificationIdsStorage.add(newNotification.id);
            
            // Determine toast variant based on notification type
            const isImportant = ['task_assigned', 'file_shared', 'data_room_invite'].includes(newNotification.type);
            
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: isImportant ? 8000 : 5000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          
          // Skip invalidation if we triggered this update ourselves (prevents race condition)
          if (pendingMarkAllAsRead || pendingUpdateIds.has(updatedNotification.id)) {
            return;
          }
          
          // Only invalidate for updates from other sources (e.g., another device)
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, organization, queryClient]);

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };
};
