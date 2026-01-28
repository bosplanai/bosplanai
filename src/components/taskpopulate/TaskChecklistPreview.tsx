import { useMemo } from "react";
import { CheckSquare, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import GeneratedTaskItem, { ParsedTask } from "./GeneratedTaskItem";
import { TaskDetails } from "./TaskDetailSheet";

interface TaskChecklistPreviewProps {
  tasks: ParsedTask[];
  isGenerating: boolean;
  streamingContent: string;
  onToggleSelect: (id: string) => void;
  onEditTask: (id: string, details: TaskDetails) => void;
  onRemoveTask: (id: string) => void;
  onQuickUpdate: (id: string, updates: Partial<ParsedTask>) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateSelected: () => void;
  isCreating?: boolean;
  canAccessOperational?: boolean;
  canAccessStrategic?: boolean;
  canCreateProject?: boolean;
}

const TaskChecklistPreview = ({
  tasks,
  isGenerating,
  streamingContent,
  onToggleSelect,
  onEditTask,
  onRemoveTask,
  onQuickUpdate,
  onSelectAll,
  onDeselectAll,
  onCreateSelected,
  isCreating = false,
  canAccessOperational = true,
  canAccessStrategic = true,
  canCreateProject = true,
}: TaskChecklistPreviewProps) => {
  const selectedCount = useMemo(
    () => tasks.filter((t) => t.selected).length,
    [tasks]
  );

  const allSelected = tasks.length > 0 && selectedCount === tasks.length;
  const someSelected = selectedCount > 0;

  // Show streaming content while generating
  if (isGenerating) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-brand-orange" />
            Generating Tasks...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] sm:h-[400px] w-full rounded-md border p-4">
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-muted-foreground">
              {streamingContent || "Waiting for response..."}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base font-medium">Generated Tasks</CardTitle>
            <span className="text-sm text-muted-foreground">
              {selectedCount} of {tasks.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="gap-2"
            >
              {allSelected ? (
                <>
                  <Square className="w-4 h-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Select All
                </>
              )}
            </Button>
            <Button
              onClick={onCreateSelected}
              disabled={!someSelected || isCreating}
              size="sm"
              className="gap-2 bg-brand-green hover:bg-brand-green/90 text-white"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>Create {selectedCount} Task{selectedCount !== 1 ? "s" : ""}</>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] sm:h-[500px] w-full rounded-md">
          <div className="space-y-3 pr-4">
            {tasks.map((task) => (
              <GeneratedTaskItem
                key={task.id}
                task={task}
                onToggleSelect={onToggleSelect}
                onEdit={onEditTask}
                onRemove={onRemoveTask}
                onQuickUpdate={onQuickUpdate}
                canAccessOperational={canAccessOperational}
                canAccessStrategic={canAccessStrategic}
                canCreateProject={canCreateProject}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TaskChecklistPreview;
