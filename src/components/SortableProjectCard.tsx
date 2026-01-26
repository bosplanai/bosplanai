import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, Circle, Clock, CheckCircle2 } from "lucide-react";
import ProjectCard from "./ProjectCard";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SortableProjectCardProps {
  id: string;
  title: string;
  description: string | null;
  dueDate?: string | null;
  status?: "todo" | "in_progress" | "done";
  onEdit?: () => void;
  onDelete?: () => void;
  onViewTasks?: () => void;
  onClick?: () => void;
  onStatusChange?: (status: "todo" | "in_progress" | "done") => void;
}

const SortableProjectCard = ({
  id,
  title,
  description,
  dueDate,
  status,
  onEdit,
  onDelete,
  onViewTasks,
  onClick,
  onStatusChange,
}: SortableProjectCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="relative">
      {/* Mobile-only status dropdown menu */}
      {onStatusChange && (
        <div className="sm:hidden absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 bg-background/80 backdrop-blur-sm shadow-sm"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 bg-popover z-50">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange("todo");
                }}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  status === "todo" && "bg-accent"
                )}
              >
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span>To Do</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange("in_progress");
                }}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  status === "in_progress" && "bg-accent"
                )}
              >
                <Clock className="h-4 w-4 text-amber-500" />
                <span>In Progress</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange("done");
                }}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  status === "done" && "bg-accent"
                )}
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Complete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div {...listeners}>
        <ProjectCard
          title={title}
          description={description}
          dueDate={dueDate}
          status={status}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewTasks={onViewTasks}
          onClick={onClick}
        />
      </div>
    </div>
  );
};

export default SortableProjectCard;