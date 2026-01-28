import { LucideIcon, Paperclip, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import { CSSProperties, memo } from "react";
import { TaskPriority, TaskUser, TaskProject, TaskAssignmentUser } from "@/hooks/useTasks";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useAppearance } from "@/contexts/AppearanceContext";
interface TaskCardProps {
  title: string;
  description?: string | null;
  icon: LucideIcon;
  priority?: TaskPriority;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  assignedUser?: TaskUser | null;
  assignedUsers?: TaskAssignmentUser[];
  createdByUser?: TaskUser | null;
  project?: TaskProject | null;
  className?: string;
  style?: CSSProperties;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  high: { label: "High", className: "bg-priority-high/10 text-priority-high" },
  medium: { label: "Med", className: "bg-priority-medium/10 text-priority-medium" },
  low: { label: "Low", className: "bg-priority-low/10 text-priority-low" },
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const TaskCard = memo(({ 
  title, 
  description, 
  icon: Icon, 
  priority = "medium", 
  attachmentName, 
  attachmentUrl, 
  assignedUser,
  assignedUsers = [],
  createdByUser,
  project,
  className, 
  style 
}: TaskCardProps) => {
  const { pendingSettings } = useAppearance();
  const priorityInfo = priorityConfig[priority];
  const textSizeMultiplier = pendingSettings.taskCardTextSize;

  // Combine legacy single assignedUser with multi-assignments for display
  const allAssignedUsers = [
    ...(assignedUser ? [{ id: assignedUser.id, user_id: assignedUser.id, user: assignedUser }] : []),
    ...assignedUsers.filter(a => a.user_id !== assignedUser?.id),
  ];

  return (
    <div
      className={cn(
        "flex items-start gap-3.5 bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 ease-out cursor-pointer border border-border/40 hover:border-primary/25 group task-card-smooth",
        className
      )}
      style={style}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-taskIcon/90 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p 
            className="font-medium text-foreground leading-snug group-hover:text-primary transition-colors duration-200 truncate"
            style={{ fontSize: `${0.875 * textSizeMultiplier}rem` }}
          >
            {title}
          </p>
          <span className={cn("font-semibold px-2 py-0.5 rounded-full flex-shrink-0 transition-colors duration-200", priorityInfo.className)} style={{ fontSize: `${0.625 * textSizeMultiplier}rem` }}>
            {priorityInfo.label}
          </span>
        </div>
        {description && (
          <p 
            className="text-muted-foreground mt-1 line-clamp-2"
            style={{ fontSize: `${0.75 * textSizeMultiplier}rem` }}
          >
            {description}
          </p>
        )}
        {/* Project badge - always visible */}
        <div className="flex items-center gap-1 mt-2">
          <FolderKanban className="w-3 h-3 text-primary" />
          <span className="text-xs text-primary font-medium truncate max-w-[150px]">
            {project ? project.title : "No Project"}
          </span>
        </div>
        {/* User avatars */}
        <div className="flex items-center gap-2 mt-2">
          {createdByUser && (
            <div title={`Created by ${createdByUser.full_name}`}>
              <Avatar className="w-5 h-5 border border-border">
                <AvatarFallback className="text-[8px] bg-muted text-muted-foreground">
                  {getInitials(createdByUser.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          {/* Assigned users avatars */}
          {allAssignedUsers.length > 0 && (
            <div 
              className="flex items-center -space-x-1"
              title={`Assigned to: ${allAssignedUsers.map(a => a.user?.full_name || 'Unknown').join(', ')}`}
            >
              {allAssignedUsers.slice(0, 3).map((assignment, idx) => (
                <Avatar 
                  key={assignment.user_id} 
                  className="w-5 h-5 border-2 border-primary"
                  style={{ zIndex: 3 - idx }}
                >
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
                    {assignment.user ? getInitials(assignment.user.full_name) : '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {allAssignedUsers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted border-2 border-primary flex items-center justify-center text-[8px] font-semibold text-muted-foreground">
                  +{allAssignedUsers.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        {attachmentName && attachmentUrl && (
          <a
            href={attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Paperclip className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{attachmentName}</span>
          </a>
        )}
      </div>
    </div>
  );
});

TaskCard.displayName = "TaskCard";

export default TaskCard;