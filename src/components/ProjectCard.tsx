import { Pencil, Trash2, Calendar, AlertCircle, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { useAppearance } from "@/contexts/AppearanceContext";

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
  
  // If project is complete, show "Complete" instead of overdue
  if (isComplete) {
    return { label: "Complete", className: "text-green-600 bg-green-100" };
  }
  
  if (isPast(date) && !isToday(date)) {
    return { label: "Overdue", className: "text-destructive bg-destructive/10" };
  }
  
  const daysUntil = differenceInDays(date, today);
  
  if (isToday(date)) {
    return { label: "Due today", className: "text-primary bg-primary/10" };
  }
  
  if (daysUntil <= 3) {
    return { label: `${daysUntil}d left`, className: "text-primary bg-primary/10" };
  }
  
  if (daysUntil <= 7) {
    return { label: `${daysUntil}d left`, className: "text-muted-foreground bg-muted" };
  }
  
  return { label: format(date, "MMM d"), className: "text-muted-foreground bg-muted" };
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

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 ease-out border border-border/40 hover:border-primary/25 group",
        isOverdue && "border-destructive/40",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 
              className="font-medium leading-snug truncate text-[#676f7e] dark:text-white" 
              style={{ fontSize: `${1 * textSizeMultiplier}rem` }}
            >
              {title}
            </h3>
            {description && (
              <p 
                className="mt-1 line-clamp-2 text-[#676f7e] dark:text-white" 
                style={{ fontSize: `${0.875 * textSizeMultiplier}rem` }}
              >
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.();
              }}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Edit project"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.();
              }}
              className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-200"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {dueDateStatus && (
            <div className="flex items-center gap-1.5">
              {isOverdue ? (
                <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              ) : (
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              )}
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", dueDateStatus.className)}>
                {dueDateStatus.label}
              </span>
            </div>
          )}
          {!dueDateStatus && <div />}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onViewTasks?.();
            }}
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-primary transition-all duration-200 text-xs font-medium"
            title="View tasks"
          >
            <ListTodo className="w-4 h-4" />
            <span>View Tasks</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;