import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface DataRoomChatProps {
  dataRoomId: string;
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
}

interface Message {
  id: string;
  sender_id: string | null;
  sender_name: string;
  sender_email: string;
  message: string;
  is_guest: boolean;
  created_at: string;
}

const DataRoomChat = ({ dataRoomId, organizationId, userId, userName, userEmail }: DataRoomChatProps) => {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Ensure we always insert with the data room's owning organization_id (important for shared rooms)
  const { data: effectiveOrganizationId } = useQuery({
    queryKey: ["data-room-organization-id", dataRoomId, organizationId],
    queryFn: async () => {
      if (!dataRoomId) return organizationId;

      const { data, error } = await supabase
        .from("data_rooms")
        .select("organization_id")
        .eq("id", dataRoomId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch data room organization_id:", error);
        return organizationId;
      }

      return data?.organization_id ?? organizationId;
    },
    enabled: !!dataRoomId,
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["data-room-messages", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_messages")
        .select("*")
        .eq("data_room_id", dataRoomId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!dataRoomId,
  });

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`data-room-messages-${dataRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "data_room_messages",
          filter: `data_room_id=eq.${dataRoomId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["data-room-messages", dataRoomId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dataRoomId, queryClient]);

  // Auto scroll to bottom
  useEffect(() => {
    // Use setTimeout to ensure DOM has updated before scrolling
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const scrollableElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollableElement) {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!dataRoomId) throw new Error("Missing data room id");
      if (!userId) throw new Error("Missing user id");
      if (!effectiveOrganizationId) throw new Error("Missing organization id for this data room");

      const { error } = await supabase.from("data_room_messages").insert({
        data_room_id: dataRoomId,
        organization_id: effectiveOrganizationId,
        sender_id: userId,
        sender_name: userName,
        sender_email: userEmail,
        message,
        is_guest: false,
      });

      if (error) throw error;

      // Log activity for message sent
      await supabase.from("data_room_activity").insert({
        data_room_id: dataRoomId,
        organization_id: effectiveOrganizationId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        action: "message_sent",
        details: { message_preview: message.substring(0, 100) },
        is_guest: false,
      });
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["data-room-messages", dataRoomId] });
    },
    onError: (error: any) => {
      console.error("Failed to send data room message:", error);
      toast.error(`Message failed to send: ${error?.message ?? "Unknown error"}`);
    },
  });

  const canSend =
    !!newMessage.trim() &&
    !!dataRoomId &&
    !!userId &&
    !!effectiveOrganizationId &&
    !sendMessageMutation.isPending;

  const handleSend = () => {
    if (!canSend) {
      if (!effectiveOrganizationId) {
        toast.error("Please wait for the room to finish loading, then try again.");
      }
      return;
    }

    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };


  return (
    <div className="flex flex-col h-[350px]">
      <div className="p-3 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground">All room members can see these messages</p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  {!isOwn && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs bg-muted">
                        {msg.sender_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                    <div className={`mb-1 px-1 ${isOwn ? "text-right" : ""}`}>
                      <p className="text-xs font-medium">
                        {msg.sender_name}
                        {msg.is_guest && " (Guest)"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {msg.sender_email}
                      </p>
                    </div>
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendMessageMutation.isPending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataRoomChat;
