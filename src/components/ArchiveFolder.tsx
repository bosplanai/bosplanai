import { useState, useEffect, useMemo } from "react";
import { Archive, RotateCcw, Calendar, FolderArchive, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { formatDistanceToNow, format } from "date-fns";
import { useArchive, ArchiveFilter, ArchivedTask, ArchivedProject } from "@/hooks/useArchive";

const filterLabels: Record<ArchiveFilter, string> = {
  "30days": "Last 30 Days",
  "6months": "Last 6 Months",
  "12months": "Last 12 Months",
  "older": "Older",
};

interface ArchiveFolderProps {
  onRestore?: () => void;
  variant?: "tasks" | "projects" | "both";
}

const ArchiveFolder = ({ onRestore, variant = "both" }: ArchiveFolderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "projects">(
    variant === "projects" ? "projects" : "tasks"
  );
  const [filter, setFilter] = useState<ArchiveFilter>("30days");
  
  const {
    archivedTasks,
    archivedProjects,
    loading,
    fetchArchivedItems,
    restoreTask,
    restoreProject,
    filterByDate,
  } = useArchive();

  useEffect(() => {
    if (isOpen) {
      fetchArchivedItems();
    }
  }, [isOpen, fetchArchivedItems]);

  const filteredTasks = filterByDate(archivedTasks, filter);
  const filteredProjects = filterByDate(archivedProjects, filter);

  const totalCount = archivedTasks.length + archivedProjects.length;

  const handleRestoreTask = async (taskId: string) => {
    const success = await restoreTask(taskId);
    if (success) {
      onRestore?.();
    }
  };

  const handleRestoreProject = async (projectId: string) => {
    const success = await restoreProject(projectId);
    if (success) {
      onRestore?.();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-priority-high/10 text-priority-high";
      case "medium":
        return "bg-priority-medium/10 text-priority-medium";
      case "low":
        return "bg-priority-low/10 text-priority-low";
      default:
        return "";
    }
  };

  const renderTaskItem = (task: ArchivedTask) => (
    <div
      key={task.id}
      className="p-3 bg-card border rounded-lg space-y-2 transition-colors hover:border-primary/20"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary hover:text-primary shrink-0"
              onClick={() => handleRestoreTask(task.id)}
              title="Restore task"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="outline" className="text-xs">
              {task.category}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-xs ${getPriorityColor(task.priority)}`}
            >
              {task.priority}
            </Badge>
            {task.project && (
              <Badge variant="outline" className="text-xs">
                {task.project.title}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Calendar className="w-3 h-3" />
            <span>
              Archived{" "}
              {formatDistanceToNow(new Date(task.archived_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProjectItem = (project: ArchivedProject) => (
    <div
      key={project.id}
      className="p-3 bg-card border rounded-lg space-y-2 transition-colors hover:border-primary/20"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-2">{project.title}</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary hover:text-primary shrink-0"
              onClick={() => handleRestoreProject(project.id)}
              title="Restore project"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
          
          {project.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge variant="secondary" className="text-xs bg-green-100 text-green-600">
              Complete
            </Badge>
            {project.due_date && (
              <Badge variant="outline" className="text-xs">
                Due: {format(new Date(project.due_date), "MMM d, yyyy")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Calendar className="w-3 h-3" />
            <span>
              Archived{" "}
              {formatDistanceToNow(new Date(project.archived_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full gap-2 bg-brand-orange hover:bg-brand-orange/90 border-brand-orange text-white dark:text-black hover:text-white dark:hover:text-black"
        >
          <FolderArchive className="w-4 h-4" />
          Archive
          {totalCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-white/20 text-white dark:text-black">
              {totalCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Archive
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Completed items are auto-archived after 10 days.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  {filterLabels[filter]}
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(filterLabels) as ArchiveFilter[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setFilter(key)}
                    className={filter === key ? "bg-accent" : ""}
                  >
                    {filterLabels[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {variant === "both" ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "tasks" | "projects")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="tasks" className="gap-1">
                  Tasks
                  {filteredTasks.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {filteredTasks.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-1">
                  Projects
                  {filteredProjects.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {filteredProjects.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(100vh-280px)]">
                <TabsContent value="tasks" className="mt-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Archive className="w-12 h-12 mb-3 opacity-50" />
                      <p>No archived tasks</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTasks.map(renderTaskItem)}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="projects" className="mt-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="text-muted-foreground">Loading...</span>
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Archive className="w-12 h-12 mb-3 opacity-50" />
                      <p>No archived projects</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredProjects.map(renderProjectItem)}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          ) : (
            <ScrollArea className="h-[calc(100vh-220px)]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              ) : variant === "tasks" ? (
                filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Archive className="w-12 h-12 mb-3 opacity-50" />
                    <p>No archived tasks</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTasks.map(renderTaskItem)}
                  </div>
                )
              ) : (
                filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Archive className="w-12 h-12 mb-3 opacity-50" />
                    <p>No archived projects</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProjects.map(renderProjectItem)}
                  </div>
                )
              )}
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ArchiveFolder;
