import { Pencil, Trash2, Calendar, AlertCircle, ListTodo, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { useAppearance } from "@/contexts/AppearanceContext";
import { Badge } from "./ui/badge";

interface ProjectCardProps {
  title: string;
  description: string | null;
  dueDate?: string | null;
  status?: "todo" | "in_progress" | "done";
  onEdit?: () => void;
  onDelete?: () => void;
  onViewTasks?: () => void;
  onClick?: () => void;
  className?: string;
}

const getDueDateStatus = (dueDate: string, isComplete: boolean) => {
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isComplete) {
    return { label: "Complete", className: "bg-green-500/10 text-green-600 border-green-500/20" };
  }

  if (isPast(date) && !isToday(date)) {
    return { label: "Overdue", className: "bg-destructive/10 text-destructive border-destructive/20" };
  }

  const daysUntil = differenceInDays(date, today);

  if (isToday(date)) {
    return { label: "Due today", className: "bg-primary/10 text-primary border-primary/20" };
  }

  if (daysUntil <= 3) {
    return { label: `${daysUntil}d left`, className: "bg-primary/10 text-primary border-primary/20" };
  }

  if (daysUntil <= 7) {
    return { label: `${daysUntil}d left`, className: "bg-muted text-muted-foreground border-border" };
  }

  return { label: format(date, "MMM d"), className: "bg-muted text-muted-foreground border-border" };
};

const getStatusConfig = (status?: string) => {
  switch (status) {
    case "in_progress":
      return { label: "In Progress", className: "bg-primary/10 text-primary border-primary/20" };
    case "done":
      return { label: "Complete", className: "bg-green-500/10 text-green-600 border-green-500/20" };
    default:
      return { label: "To Do", className: "bg-muted text-muted-foreground border-border" };
  }
};

const ProjectCard = ({
  title,
  description,
  dueDate,
  status,
  onEdit,
  onDelete,
  onViewTasks,
  onClick,
  className,
}: ProjectCardProps) => {
  const { pendingSettings } = useAppearance();
  const isComplete = status === "done";
  const dueDateStatus = dueDate ? getDueDateStatus(dueDate, isComplete) : null;
  const isOverdue = dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)) && !isComplete;
  const textSizeMultiplier = pendingSettings.projectCardTextSize;
  const statusConfig = getStatusConfig(status);

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out border border-border/40 hover:border-primary/25 group overflow-hidden",
        isOverdue && "border-destructive/40",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Status accent strip */}
      <div
        className={cn(
          "h-1 w-full",
          status === "done" && "bg-green-500",
          status === "in_progress" && "bg-primary",
          (!status || status === "todo") && "bg-muted-foreground/20"
        )}
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Header: Title + actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-semibold leading-snug truncate text-foreground",
                isComplete && "line-through opacity-60"
              )}
              style={{ fontSize: `${1 * textSizeMultiplier}rem` }}
            >
              {title}
            </h3>
            {description && (
              <p
                className="mt-1.5 line-clamp-2 text-muted-foreground leading-relaxed"
                style={{ fontSize: `${0.813 * textSizeMultiplier}rem` }}
              >
                {description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Edit project"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metadata row: status + due date */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>

          {dueDateStatus && (
            <div className="flex items-center gap-1">
              {isOverdue ? (
                <AlertCircle className="w-3 h-3 text-destructive" />
              ) : (
                <Calendar className="w-3 h-3 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                  dueDateStatus.className
                )}
              >
                {dueDateStatus.label}
              </span>
            </div>
          )}
        </div>

        {/* Footer: View Tasks CTA */}
        <div className="pt-2 border-t border-border/40">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewTasks?.();
            }}
            className="flex items-center justify-between w-full px-3 py-2 rounded-lg bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200 text-xs font-medium group/btn"
            title="View tasks"
          >
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              <span>View Tasks</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover/btn:opacity-100 transition-opacity -translate-x-1 group-hover/btn:translate-x-0 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
