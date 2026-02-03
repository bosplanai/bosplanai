import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LucideIcon, Pencil, Check, UserCircle, Calendar, CalendarCheck, FolderKanban, X as XIcon, Users, Flag, MoreVertical, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CSSProperties, useRef, useState, memo, useCallback } from "react";
import { TaskPriority, TaskUser, TaskProject, TaskAssignmentUser } from "@/hooks/useTasks";
import { useTaskAssignments } from "@/hooks/useTaskAssignments";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";
import { format, parseISO } from "date-fns";
import TaskAttachmentsList from "./TaskAttachmentsList";
import TaskUrlsList from "./TaskUrlsList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TaskReassignmentReasonDialog } from "./taskflow/TaskReassignmentReasonDialog";

interface TeamMember {
  id: string;
  full_name: string;
}

interface ProjectOption {
  id: string;
  title: string;
}

interface SortableTaskCardProps {
  id: string;
  title: string;
  description?: string | null;
  icon: LucideIcon;
  priority?: TaskPriority;
  organizationId?: string;
  assignedUser?: TaskUser | null;
  assignedUsers?: TaskAssignmentUser[];
  createdByUser?: TaskUser | null;
  project?: TaskProject | null;
  teamMembers?: TeamMember[];
  projects?: ProjectOption[];
  createdAt?: string;
  dueDate?: string | null;
  completedAt?: string | null;
  status?: "todo" | "in_progress" | "complete";
  canEditAttachments?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDescriptionChange?: (newDescription: string) => void;
  onAssignmentChange?: (userId: string | null, reassignmentReason?: string) => void;
  onDueDateChange?: (date: string | null) => void;
  onProjectChange?: (projectId: string | null) => void;
  onPriorityChange?: (priority: TaskPriority) => void;
  onStatusChange?: (status: "todo" | "complete") => void;
  onAssignmentsRefetch?: () => void;
  onTaskBecamePending?: (taskId: string) => void;
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

const SortableTaskCard = memo(({ 
  id, 
  title, 
  description,
  icon: Icon, 
  priority = "medium",
  organizationId,
  assignedUser,
  assignedUsers = [],
  createdByUser,
  project,
  teamMembers = [],
  projects = [],
  createdAt,
  dueDate,
  completedAt,
  status,
  canEditAttachments = true,
  onTitleChange,
  onDescriptionChange,
  onAssignmentChange,
  onDueDateChange,
  onProjectChange,
  onPriorityChange,
  onStatusChange,
  onAssignmentsRefetch,
  onTaskBecamePending,
  className, 
  style 
}: SortableTaskCardProps) => {
  // Task is considered complete if status is "complete" OR completedAt is set
  const isComplete = status === "complete" || !!completedAt;
  const { pendingSettings } = useAppearance();
  const { user } = useAuth();
  const textSizeMultiplier = pendingSettings.taskCardTextSize;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedDescription, setEditedDescription] = useState(description || "");
  const [isAssignmentOpenMobile, setIsAssignmentOpenMobile] = useState(false);
  const [isAssignmentOpenDesktop, setIsAssignmentOpenDesktop] = useState(false);
  const [isDueDateOpen, setIsDueDateOpen] = useState(false);
  const [isProjectOpenMobile, setIsProjectOpenMobile] = useState(false);
  const [isProjectOpenDesktop, setIsProjectOpenDesktop] = useState(false);
  const [isPriorityOpenMobile, setIsPriorityOpenMobile] = useState(false);
  const [isPriorityOpenDesktop, setIsPriorityOpenDesktop] = useState(false);
  
  // Reassignment reason dialog state
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [pendingReassignUserId, setPendingReassignUserId] = useState<string | null>(null);
  const [pendingReassignUserName, setPendingReassignUserName] = useState<string>("");
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const priorityInfo = priorityConfig[priority];

  // Use the multi-assignment hook for mutations
  const { 
    assignments: hookAssignments, 
    toggleAssignment, 
    isUserAssigned: hookIsUserAssigned 
  } = useTaskAssignments(id, onTaskBecamePending);


  // Use prop assignments if available (from parent's prefetch), otherwise fall back to hook data
  const effectiveAssignments = assignedUsers && assignedUsers.length > 0 
    ? assignedUsers 
    : hookAssignments;

  // Combine legacy single assignedUser with multi-assignments for display
  const allAssignedUsers = [
    ...(assignedUser ? [{ id: assignedUser.id, user_id: assignedUser.id, user: assignedUser }] : []),
    ...effectiveAssignments.filter(a => a.user_id !== assignedUser?.id),
  ];

  // Check if user is assigned using both prop data and hook data
  const isUserAssigned = (userId: string) => {
    const inProps = assignedUsers?.some(a => a.user_id === userId) ?? false;
    return inProps || hookIsUserAssigned(userId);
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const sortableStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    cursor: isDragging ? "grabbing" : "grab",
  };

  const handleStartEditingTitle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedTitle(title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleSaveTitle = () => {
    const trimmed = editedTitle.trim();
    if (trimmed && trimmed !== title && onTitleChange) {
      onTitleChange(trimmed);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === "Escape") {
      setEditedTitle(title);
      setIsEditingTitle(false);
    }
  };

  const handleStartEditingDescription = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditedDescription(description || "");
    setIsEditingDescription(true);
    setTimeout(() => descriptionInputRef.current?.focus(), 0);
  };

  const handleSaveDescription = () => {
    if (editedDescription !== (description || "") && onDescriptionChange) {
      onDescriptionChange(editedDescription);
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setEditedDescription(description || "");
      setIsEditingDescription(false);
    }
  };

  // Check if current user is the primary assignee
  const isCurrentUserPrimaryAssignee = user?.id === assignedUser?.id;

  // Handle assignment click - show dialog if reassigning to someone else while being the current assignee
  const handleAssignmentClick = (memberId: string, memberName: string) => {
    const isAssigned = isUserAssigned(memberId) || assignedUser?.id === memberId;
    
    // If clicking to unassign the current primary assignee
    if (assignedUser?.id === memberId) {
      onAssignmentChange?.(null);
      return;
    }
    
    // If the current user is the primary assignee and selecting a different user
    // They need to provide a reason for reassignment
    if (isCurrentUserPrimaryAssignee && !isAssigned && onAssignmentChange) {
      setPendingReassignUserId(memberId);
      setPendingReassignUserName(memberName);
      setIsReassignDialogOpen(true);
      setIsAssignmentOpenMobile(false);
      setIsAssignmentOpenDesktop(false);
      return;
    }
    
    // Otherwise, use multi-assignment toggle
    toggleAssignment(memberId);
    onAssignmentsRefetch?.();
  };

  // Handle confirmed reassignment with reason
  const handleConfirmReassignment = async (reason: string) => {
    if (pendingReassignUserId && onAssignmentChange) {
      onAssignmentChange(pendingReassignUserId, reason);
    }
    setPendingReassignUserId(null);
    setPendingReassignUserName("");
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex items-start gap-2.5 sm:gap-3.5 bg-card rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300 ease-out border border-border/40 hover:border-primary/25 group task-card-smooth",
        isDragging && "opacity-60 shadow-xl scale-[1.02] rotate-1",
        className
      )}
      style={sortableStyle}
    >
      {/* Status toggle + Drag handle */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {/* Clickable status toggle */}
        {onStatusChange && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(isComplete ? "todo" : "complete");
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "hidden sm:flex w-6 h-6 rounded-md items-center justify-center transition-all duration-200 hover:scale-110",
              isComplete 
                ? "bg-green-500/20 hover:bg-green-500/30" 
                : "bg-muted hover:bg-muted/80"
            )}
            title={isComplete ? "Mark as To Do" : "Mark as Complete"}
          >
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
        
        {/* Drag handle */}
        <div 
          {...listeners}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-taskIcon/90 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 cursor-grab active:cursor-grabbing touch-none"
        >
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          ) : (
            <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          )}
        </div>
      </div>
      
      {/* Mobile-only status dropdown menu */}
      {onStatusChange && (
        <div className="sm:hidden flex-shrink-0 -ml-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 bg-popover z-50">
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
                  onStatusChange("complete");
                }}
                className={cn(
                  "flex items-center gap-2 cursor-pointer",
                  isComplete && "bg-accent"
                )}
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Complete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <div className="flex-1 min-w-0 pr-10 sm:pr-0 overflow-hidden">
        {/* Title row - no priority badge on mobile to avoid overlap */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <Input
                ref={titleInputRef}
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value.slice(0, 200))}
                onBlur={handleSaveTitle}
                onKeyDown={handleTitleKeyDown}
                className="h-7 text-sm py-0 px-2"
                maxLength={200}
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <>
              <p 
                className="font-medium text-foreground leading-snug group-hover:text-primary transition-colors duration-200 cursor-text flex-1 line-clamp-2 sm:truncate sm:line-clamp-none"
                style={{ fontSize: `${0.875 * textSizeMultiplier}rem` }}
                onClick={handleStartEditingTitle}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {title}
              </p>
              <button
                onClick={handleStartEditingTitle}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 flex"
                title="Edit title"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </>
          )}
          {/* Priority badge - desktop only inline */}
          <div className="hidden sm:block">
            {onPriorityChange ? (
              <Popover open={isPriorityOpenDesktop} onOpenChange={setIsPriorityOpenDesktop}>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 transition-colors duration-200 hover:opacity-80 cursor-pointer",
                      priorityInfo.className
                    )}
                    title="Change priority"
                  >
                    {priorityInfo.label}
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-32 p-2" 
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Set priority</p>
                    {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                          priority === p ? "bg-primary/10" : "hover:bg-muted"
                        )}
                        onClick={() => {
                          onPriorityChange(p);
                          setIsPriorityOpenDesktop(false);
                        }}
                      >
                        <Flag className={cn("w-3 h-3", priorityConfig[p].className.split(' ')[1])} />
                        <span>{priorityConfig[p].label}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 transition-colors duration-200", priorityInfo.className)}>
                {priorityInfo.label}
              </span>
            )}
          </div>
        </div>
        
        {/* Mobile-only priority and project badges row */}
        <div className="flex items-center gap-2 mt-1.5 sm:hidden flex-wrap">
          {onPriorityChange ? (
            <Popover open={isPriorityOpenMobile} onOpenChange={setIsPriorityOpenMobile}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 transition-colors duration-200 hover:opacity-80 cursor-pointer",
                    priorityInfo.className
                  )}
                  title="Change priority"
                >
                  {priorityInfo.label}
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-32 p-2" 
                align="start"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Set priority</p>
                  {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                        priority === p ? "bg-primary/10" : "hover:bg-muted"
                      )}
                      onClick={() => {
                        onPriorityChange(p);
                        setIsPriorityOpenMobile(false);
                      }}
                    >
                      <Flag className={cn("w-3 h-3", priorityConfig[p].className.split(' ')[1])} />
                      <span>{priorityConfig[p].label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 transition-colors duration-200", priorityInfo.className)}>
              {priorityInfo.label}
            </span>
          )}
          
          {/* Project badge - inline on mobile badges row */}
          {onProjectChange ? (
            <Popover open={isProjectOpenMobile} onOpenChange={setIsProjectOpenMobile}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/60 border border-border/50 hover:bg-muted transition-colors touch-manipulation"
                  title={project ? `Project: ${project.title}` : "Assign to project"}
                >
                  <FolderKanban className="w-3 h-3 text-[#676f7e] dark:text-white" />
                  <span className="text-[10px] font-medium truncate max-w-[100px] text-[#676f7e] dark:text-white">
                    {project ? project.title : "Project"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-56 p-2" 
                align="start"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Assign to project</p>
                  {projects.map((proj) => (
                    <Button
                      key={proj.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 h-8",
                        project?.id === proj.id && "bg-primary/10"
                      )}
                      onClick={() => {
                        onProjectChange(proj.id);
                        setIsProjectOpenMobile(false);
                      }}
                    >
                      <FolderKanban className="w-4 h-4" />
                      <span className="truncate">{proj.title}</span>
                    </Button>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No projects available</p>
                  )}
                  {project && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-8 text-muted-foreground"
                      onClick={() => {
                        onProjectChange(null);
                        setIsProjectOpenMobile(false);
                      }}
                    >
                      <XIcon className="w-4 h-4" />
                      <span>Remove from project</span>
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border/50 bg-muted/60">
              <FolderKanban className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-primary font-medium truncate max-w-[100px]">
                {project ? project.title : "No Project"}
              </span>
            </div>
          )}
        </div>
        
        {/* Project badge - inline on desktop */}
        <div className="hidden sm:flex items-center gap-2 mt-1">
          {onProjectChange ? (
            <Popover open={isProjectOpenDesktop} onOpenChange={setIsProjectOpenDesktop}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50 hover:bg-muted transition-colors flex-shrink-0"
                  title={project ? `Project: ${project.title}` : "Assign to project"}
                >
                  <FolderKanban className="w-3 h-3 text-[#676f7e] dark:text-white" />
                  <span className="text-xs font-medium truncate max-w-[100px] text-[#676f7e] dark:text-white">
                    {project ? project.title : "Project"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-56 p-2" 
                align="start"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Assign to project</p>
                  {projects.map((proj) => (
                    <Button
                      key={proj.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 h-8",
                        project?.id === proj.id && "bg-primary/10"
                      )}
                      onClick={() => {
                        onProjectChange(proj.id);
                        setIsProjectOpenDesktop(false);
                      }}
                    >
                      <FolderKanban className="w-4 h-4" />
                      <span className="truncate">{proj.title}</span>
                    </Button>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No projects available</p>
                  )}
                  {project && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 h-8 text-muted-foreground"
                      onClick={() => {
                        onProjectChange(null);
                        setIsProjectOpenDesktop(false);
                      }}
                    >
                      <XIcon className="w-4 h-4" />
                      <span>Remove from project</span>
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border/50 flex-shrink-0 bg-muted/60">
              <FolderKanban className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium truncate max-w-[100px]">
                {project ? project.title : "No Project"}
              </span>
            </div>
          )}
        </div>
        {isEditingDescription ? (
          <div className="mt-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <Textarea
              ref={descriptionInputRef}
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value.slice(0, 2000))}
              onBlur={handleSaveDescription}
              onKeyDown={handleDescriptionKeyDown}
              className="text-xs min-h-[60px] p-2"
              placeholder="Add a description..."
              maxLength={2000}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">{editedDescription.length}/2000</span>
              <button
                onClick={handleSaveDescription}
                className="text-xs text-primary hover:underline"
              >
                Save
              </button>
            </div>
          </div>
        ) : description ? (
          <p 
            className="mt-1 line-clamp-2 cursor-text hover:text-foreground transition-colors text-[#676f7e] dark:text-white"
            style={{ fontSize: `${0.75 * textSizeMultiplier}rem` }}
            onClick={handleStartEditingDescription}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {description}
          </p>
        ) : onDescriptionChange && (
          <button
            onClick={handleStartEditingDescription}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-sm text-muted-foreground/60 mt-1 hover:text-muted-foreground transition-colors"
          >
            + Add description
          </button>
        )}
        {/* Dates section - compact on mobile */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 text-xs">
          {/* Created date - hidden on mobile to reduce clutter */}
          {createdAt && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full border border-border/50 bg-[#F5F6F7] dark:bg-[#1D2128]" title="Created date">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground dark:text-white" />
              <span className="text-muted-foreground text-[10px] dark:text-white">Created:</span>
              <span className="font-medium text-[#676f7e] dark:text-white">{format(parseISO(createdAt), "MMM d, yyyy")}</span>
            </div>
          )}
          
          {/* Due date with edit capability - shows "Complete" when task is complete */}
          {isComplete ? (
            <div 
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400"
              title="Task completed"
            >
              <CalendarCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="font-medium text-[10px]">Done</span>
            </div>
          ) : onDueDateChange ? (
            <Popover open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border transition-colors touch-manipulation",
                    dueDate && new Date(dueDate).setHours(23, 59, 59, 999) < new Date().getTime()
                      ? "bg-destructive/10 border-destructive/30 text-destructive" 
                      : "border-border/50 hover:bg-[#e5e6e8] bg-[#F5F6F7] dark:bg-[#1D2128] dark:hover:bg-[#1D2128]/80"
                  )}
                  title={dueDate ? "Planned completion date" : "Set due date"}
                >
                  <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-muted-foreground dark:text-white" />
                  <span className={cn("text-[10px] hidden sm:inline", dueDate && new Date(dueDate).setHours(23, 59, 59, 999) < new Date().getTime() ? "" : "text-[#676f7e] dark:text-white")}>Due:</span>
                  <span className={cn("font-medium text-[10px] sm:text-xs", dueDate && new Date(dueDate).setHours(23, 59, 59, 999) < new Date().getTime() ? "" : "text-[#676f7e] dark:text-white")}>{dueDate ? format(parseISO(dueDate), "MMM d") : "Set"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0" 
                align="start"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CalendarComponent
                  mode="single"
                  selected={dueDate ? parseISO(dueDate) : undefined}
                  onSelect={(date) => {
                    onDueDateChange(date ? format(date, "yyyy-MM-dd") : null);
                    setIsDueDateOpen(false);
                  }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
                {dueDate && (
                  <div className="px-3 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-muted-foreground"
                      onClick={() => {
                        onDueDateChange(null);
                        setIsDueDateOpen(false);
                      }}
                    >
                      <XIcon className="w-3 h-3 mr-1" />
                      Clear due date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          ) : dueDate && (
            <div 
              className={cn(
                "flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border",
                new Date(dueDate) < new Date()
                  ? "bg-destructive/10 border-destructive/30 text-destructive" 
                  : "border-border/50"
              )}
              style={new Date(dueDate) < new Date() ? undefined : { backgroundColor: '#F5F6F7' }}
              title="Planned completion date"
            >
              <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
              <span className="font-medium text-[10px] sm:text-xs" style={{ color: new Date(dueDate) < new Date() ? undefined : '#676f7e' }}>{format(parseISO(dueDate), "MMM d")}</span>
            </div>
          )}
          {completedAt && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-700" title="Actual completion date">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span className="font-medium">{format(parseISO(completedAt), "MMM d, yyyy")}</span>
            </div>
          )}
          
          {/* Assigned user - clickable on mobile to open assignment popover */}
          {onAssignmentChange ? (
            <div className="sm:hidden">
              <Popover open={isAssignmentOpenMobile} onOpenChange={setIsAssignmentOpenMobile}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full border transition-colors touch-manipulation",
                      allAssignedUsers.length > 0 
                        ? "border-border/50 hover:bg-muted/80 bg-[#F5F6F7] dark:bg-[#1D2128]" 
                        : "bg-muted/40 border-dashed border-muted-foreground/30 hover:border-primary"
                    )}
                    title={allAssignedUsers.length > 0 ? `Assigned to: ${allAssignedUsers.map(a => a.user?.full_name || 'Unknown').join(', ')}` : "Assign users"}
                  >
                    {allAssignedUsers.length > 0 ? (
                      <>
                        <div className="flex items-center -space-x-1">
                          {allAssignedUsers.slice(0, 2).map((assignment, idx) => (
                            <Avatar
                              key={assignment.user_id}
                              className="w-4 h-4 border border-brand-teal"
                              style={{ zIndex: 2 - idx }}
                            >
                              <AvatarFallback className="text-[6px] font-semibold bg-brand-teal text-white">
                                {assignment.user ? getInitials(assignment.user.full_name) : "?"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {allAssignedUsers.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{allAssignedUsers.length - 2}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <Users className="w-3 h-3 text-muted-foreground/60" />
                        <span className="text-[9px] text-muted-foreground/60">Assign</span>
                      </>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 p-2"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Assign to (select multiple)</p>
                    {teamMembers.map((member) => {
                      const isAssigned = isUserAssigned(member.id) || assignedUser?.id === member.id;
                      return (
                        <div
                          key={member.id}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                            isAssigned ? "bg-primary/10" : "hover:bg-muted"
                          )}
                          onClick={() => handleAssignmentClick(member.id, member.full_name)}
                        >
                          <Checkbox checked={isAssigned} className="pointer-events-none" />
                          <Avatar className="w-5 h-5 border border-border">
                            <AvatarFallback className="text-[8px] bg-muted text-muted-foreground font-semibold">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs truncate">{member.full_name}</span>
                        </div>
                      );
                    })}
                    {teamMembers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No team members available</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ) : allAssignedUsers.length > 0 && (
            <div className="sm:hidden flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border/50 bg-[#F5F6F7] dark:bg-[#1D2128]">
              <div className="flex items-center -space-x-1">
                {allAssignedUsers.slice(0, 2).map((assignment, idx) => (
                  <Avatar
                    key={assignment.user_id}
                    className="w-4 h-4 border border-brand-teal"
                    style={{ zIndex: 2 - idx }}
                  >
                    <AvatarFallback className="text-[6px] font-semibold bg-brand-teal text-white">
                      {assignment.user ? getInitials(assignment.user.full_name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {allAssignedUsers.length > 2 && (
                <span className="text-[9px] text-muted-foreground">+{allAssignedUsers.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* User avatars section - hidden on mobile (shown inline above) */}
        <div className="hidden sm:flex items-center gap-2 mt-2">
          {/* Created by button */}
          {createdByUser && (
            <button
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-border/50 bg-[#F5F6F7] dark:bg-[#1D2128] hover:bg-[#e5e6e8] dark:hover:bg-[#1D2128]/80 transition-colors cursor-default"
              title={`Created by ${createdByUser.full_name}`}
            >
              <span className="text-[10px] text-muted-foreground dark:text-white">By:</span>
              <Avatar className="w-5 h-5 border border-border">
                <AvatarFallback className="text-[8px] bg-muted text-muted-foreground font-semibold">
                  {getInitials(createdByUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-[#676f7e] dark:text-white">{createdByUser.full_name.split(' ')[0]}</span>
            </button>
          )}
          
          {/* Assigned users avatars */}
          {onAssignmentChange ? (
            <Popover open={isAssignmentOpenDesktop} onOpenChange={setIsAssignmentOpenDesktop}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full border transition-colors",
                    allAssignedUsers.length > 0 
                      ? "border-border/50 hover:bg-[#e5e6e8] bg-[#F5F6F7] dark:bg-[#1D2128] dark:hover:bg-[#1D2128]/80" 
                      : "bg-muted/40 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                  )}
                  title={
                    allAssignedUsers.length > 0
                      ? `Assigned to: ${allAssignedUsers
                          .map((a) => a.user?.full_name || "Unknown")
                          .join(", ")}`
                      : "Assign users"
                  }
                >
                  {allAssignedUsers.length > 0 ? (
                    <>
                      <span className="text-[10px] text-muted-foreground dark:text-white">To:</span>
                      <div className="flex items-center -space-x-1">
                        {allAssignedUsers.slice(0, 3).map((assignment, idx) => (
                          <Avatar
                            key={assignment.user_id}
                            className="w-5 h-5 border-2 border-brand-teal"
                            style={{ zIndex: 3 - idx }}
                          >
                            <AvatarFallback 
                              className="text-[8px] font-semibold bg-brand-teal text-white"
                            >
                              {assignment.user
                                ? getInitials(assignment.user.full_name)
                                : "?"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-xs font-medium text-[#676f7e] dark:text-white">
                        {allAssignedUsers.length === 1 
                          ? allAssignedUsers[0].user?.full_name?.split(' ')[0] || 'Assigned'
                          : `${allAssignedUsers.length} assigned`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground/60">Assign</span>
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-56 p-2"
                align="start"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Assign to (select multiple)
                  </p>
                  {teamMembers.map((member) => {
                    const isAssigned =
                      isUserAssigned(member.id) || assignedUser?.id === member.id;
                    return (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors",
                          isAssigned && "bg-primary/10"
                        )}
                        onClick={() => handleAssignmentClick(member.id, member.full_name)}
                      >
                        <Checkbox checked={isAssigned} className="pointer-events-none" />
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[8px]">
                            {getInitials(member.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-xs">{member.full_name}</span>
                      </div>
                    );
                  })}
                  {teamMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      No team members available
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : allAssignedUsers.length > 0 ? (
            <div
              className="flex items-center -space-x-1"
              title={`Assigned to: ${allAssignedUsers
                .map((a) => a.user?.full_name || "Unknown")
                .join(", ")}`}
            >
              {allAssignedUsers.slice(0, 3).map((assignment, idx) => (
                <Avatar
                  key={assignment.user_id}
                  className="w-5 h-5 border-2 border-primary"
                  style={{ zIndex: 3 - idx }}
                >
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">
                    {assignment.user ? getInitials(assignment.user.full_name) : "?"}
                  </AvatarFallback>
                </Avatar>
              ))}
              {allAssignedUsers.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-muted border-2 border-primary flex items-center justify-center text-[8px] font-semibold text-muted-foreground">
                  +{allAssignedUsers.length - 3}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Multi-attachment section */}
        {organizationId && (
          <div
            className="mt-2 sm:mt-3 flex flex-wrap items-center gap-x-4 gap-y-2"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <TaskAttachmentsList
              taskId={id}
              organizationId={organizationId}
              canEdit={canEditAttachments}
            />
            <TaskUrlsList
              taskId={id}
              organizationId={organizationId}
              canEdit={canEditAttachments}
            />
          </div>
        )}
      </div>
      
      {/* Reassignment Reason Dialog */}
      <TaskReassignmentReasonDialog
        open={isReassignDialogOpen}
        onOpenChange={setIsReassignDialogOpen}
        taskTitle={title}
        newAssigneeName={pendingReassignUserName}
        onConfirm={handleConfirmReassignment}
      />
    </div>
  );
});

SortableTaskCard.displayName = "SortableTaskCard";

export default SortableTaskCard;