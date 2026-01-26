import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface DataRoomFileCommentsProps {
  fileId: string;
  dataRoomId: string;
  organizationId: string;
  userId: string;
  userName: string;
  userEmail: string;
}

interface Comment {
  id: string;
  commenter_id: string | null;
  commenter_name: string;
  commenter_email: string;
  comment: string;
  is_guest: boolean;
  created_at: string;
}

const DataRoomFileComments = ({
  fileId,
  dataRoomId,
  organizationId,
  userId,
  userName,
  userEmail,
}: DataRoomFileCommentsProps) => {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["data-room-file-comments", fileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_file_comments")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!fileId,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const { error } = await supabase.from("data_room_file_comments").insert({
        file_id: fileId,
        data_room_id: dataRoomId,
        organization_id: organizationId,
        commenter_id: userId,
        commenter_name: userName,
        commenter_email: userEmail,
        comment,
        is_guest: false,
      });

      if (error) throw error;

      // Log activity for comment
      await supabase.from("data_room_activity").insert({
        data_room_id: dataRoomId,
        organization_id: organizationId,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        action: "comment_added",
        is_guest: false,
        details: { file_id: fileId },
      });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["data-room-file-comments", fileId] });
      queryClient.invalidateQueries({ queryKey: ["data-room-activity", dataRoomId] });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="w-4 h-4" />
        <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet</p>
      ) : (
        <div className="space-y-3 max-h-[200px] overflow-y-auto">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="w-7 h-7 flex-shrink-0">
                <AvatarFallback className="text-xs bg-muted">
                  {comment.commenter_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {comment.commenter_name}
                    {comment.is_guest && (
                      <span className="text-muted-foreground font-normal"> (Guest)</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-foreground">{comment.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px] resize-none"
        />
        <Button
          size="icon"
          className="self-end"
          onClick={handleSubmit}
          disabled={!newComment.trim() || addCommentMutation.isPending}
        >
          {addCommentMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default DataRoomFileComments;
