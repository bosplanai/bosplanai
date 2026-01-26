import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Activity, FileUp, UserPlus, MessageSquare, Eye, FileSignature, Trash2, Loader2, FolderInput } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface DataRoomActivityProps {
  dataRoomId: string;
}

interface ActivityItem {
  id: string;
  user_name: string;
  user_email: string;
  action: string;
  details: Record<string, unknown> | null;
  is_guest: boolean;
  created_at: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "file_upload":
      return <FileUp className="w-4 h-4 text-emerald-500" />;
    case "invite_sent":
    case "member_added":
      return <UserPlus className="w-4 h-4 text-blue-500" />;
    case "comment_added":
    case "message_sent":
      return <MessageSquare className="w-4 h-4 text-purple-500" />;
    case "file_viewed":
      return <Eye className="w-4 h-4 text-amber-500" />;
    case "file_edited":
    case "version_created":
      return <FileSignature className="w-4 h-4 text-blue-500" />;
    case "file_moved":
      return <FolderInput className="w-4 h-4 text-amber-500" />;
    case "nda_signed":
      return <FileSignature className="w-4 h-4 text-emerald-500" />;
    case "file_deleted":
    case "invite_revoked":
      return <Trash2 className="w-4 h-4 text-destructive" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
};

const getActionLabel = (action: string, details: Record<string, unknown> | null) => {
  switch (action) {
    case "file_upload":
      return `uploaded ${(details?.file_name as string) || (details?.fileName as string) || "a file"}`;
    case "invite_sent":
      return `invited ${(details?.email as string) || "a user"}`;
    case "member_added":
      return `added ${(details?.member_name as string) || "a team member"}`;
    case "comment_added":
      return `commented on ${(details?.file_name as string) || (details?.fileName as string) || "a file"}`;
    case "message_sent":
      return "sent a message";
    case "file_viewed":
      return `viewed ${(details?.file_name as string) || (details?.fileName as string) || "a file"}`;
    case "file_edited":
      return `edited ${(details?.file_name as string) || (details?.fileName as string) || "a file"}`;
    case "version_created":
      return `saved version of ${(details?.file_name as string) || (details?.fileName as string) || "a file"}`;
    case "file_moved":
      const folderName = (details?.folder_name as string) || "root";
      return `moved ${(details?.file_name as string) || "a file"} to ${folderName}`;
    case "nda_signed":
      return "signed the NDA";
    case "file_deleted":
      return `deleted ${(details?.file_name as string) || (details?.fileName as string) || "a file"}`;
    case "invite_revoked":
      return `revoked invite for ${(details?.email as string) || "a user"}`;
    case "room_created":
      return "created this data room";
    case "settings_updated":
      return "updated room settings";
    default:
      return action.replace(/_/g, " ");
  }
};

const DataRoomActivity = ({ dataRoomId }: DataRoomActivityProps) => {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["data-room-activity", dataRoomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_room_activity")
        .select("*")
        .eq("data_room_id", dataRoomId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActivityItem[];
    },
    enabled: !!dataRoomId,
  });

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-emerald-500" />
        <h3 className="font-semibold">Activity Log</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No activity recorded yet
        </p>
      ) : (
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">{getActionIcon(activity.action)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{activity.user_name}</span>
                    {activity.is_guest && (
                      <Badge variant="secondary" className="ml-1 text-[10px] py-0">
                        Guest
                      </Badge>
                    )}
                    <span className="text-muted-foreground">
                      {" "}
                      {getActionLabel(activity.action, activity.details as Record<string, unknown>)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.created_at), "MMM d, yyyy 'at' HH:mm")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};

export default DataRoomActivity;
