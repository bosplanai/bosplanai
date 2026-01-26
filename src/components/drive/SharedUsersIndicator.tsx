import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SharedUser {
  id: string;
  name: string;
  permission: string;
}

interface SharedUsersIndicatorProps {
  shareCount: number;
  sharedUsers: SharedUser[];
  isOwner: boolean;
  onEditSharing: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getPermissionLabel = (permission: string) => {
  switch (permission) {
    case "view":
      return "Can View";
    case "edit":
      return "Can Edit";
    case "manage":
      return "Can Manage";
    default:
      return permission;
  }
};

export function SharedUsersIndicator({
  shareCount,
  sharedUsers,
  isOwner,
  onEditSharing,
}: SharedUsersIndicatorProps) {
  if (shareCount === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{shareCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Shared with</h4>
            {isOwner && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={onEditSharing}
              >
                Edit
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sharedUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-orange-100 text-orange-600 text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm truncate max-w-[100px]">
                    {user.name}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getPermissionLabel(user.permission)}
                </span>
              </div>
            ))}
          </div>

          {sharedUsers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Shared via link only
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
