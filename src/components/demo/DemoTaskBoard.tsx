import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  GripVertical, 
  CheckSquare,
  ListTodo,
  Search,
  Filter,
  Trash2,
  Calendar,
  Sparkles,
  ChevronDown,
  Paperclip,
  FolderKanban,
  RotateCcw,
  X,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DemoTask {
  id: string;
  title: string;
  description: string;
  status: "todo" | "completed";
  priority: "low" | "medium" | "high";
  project: string;
  createdAt: string;
  dueDate: string;
  assignedTo: string;
  createdBy: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

const SESSION_STORAGE_KEY = "bosplan_demo_tasks_v2";
const ARCHIVE_STORAGE_KEY = "bosplan_demo_archive";
const CHECKLIST_STORAGE_KEY = "bosplan_demo_checklist";

const generateId = () => `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const PRIORITY_COLORS = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-teal-100 text-teal-700 border-teal-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_LABELS = {
  low: "Low",
  medium: "Med",
  high: "High",
};

const SAMPLE_PROJECTS = ["Marketing", "Development", "Operations", "Sales"];

export function DemoTaskBoard() {
  const [tasks, setTasks] = useState<DemoTask[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<DemoTask[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draggedTask, setDraggedTask] = useState<DemoTask | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    project: "Marketing",
    dueDate: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
  });

  // Load tasks from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        setTasks(JSON.parse(stored));
      } else {
        const sampleTasks: DemoTask[] = [
          {
            id: generateId(),
            title: "Welcome to Bosplan!",
            description: "This is an interactive demo. Try creating tasks, dragging them between columns, and exploring the features.",
            status: "todo",
            priority: "high",
            project: "Marketing",
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            assignedTo: "You",
            createdBy: "Bosplan",
          },
          {
            id: generateId(),
            title: "Website Structure",
            description: "Prioritise courses on the home page that we sell courses. The home page of the site currently shows a section on Business and Leadership.",
            status: "todo",
            priority: "medium",
            project: "Development",
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            assignedTo: "Team",
            createdBy: "You",
          },
          {
            id: generateId(),
            title: "Review Account Settings",
            description: "Setting of discount for each courses the account include: Clear pricing training modules.",
            status: "todo",
            priority: "medium",
            project: "Operations",
            createdAt: new Date().toISOString(),
            dueDate: new Date().toISOString(),
            assignedTo: "You",
            createdBy: "You",
          },
        ];
        setTasks(sampleTasks);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sampleTasks));
      }

      // Load archived tasks
      const storedArchive = sessionStorage.getItem(ARCHIVE_STORAGE_KEY);
      if (storedArchive) {
        setArchivedTasks(JSON.parse(storedArchive));
      }

      // Load checklist
      const storedChecklist = sessionStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (storedChecklist) {
        setChecklist(JSON.parse(storedChecklist));
      } else {
        const sampleChecklist: ChecklistItem[] = [
          { id: generateId(), text: "Check emails", completed: false },
          { id: generateId(), text: "Review daily tasks", completed: true },
        ];
        setChecklist(sampleChecklist);
        sessionStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(sampleChecklist));
      }
    } catch (e) {
      console.error("Failed to load demo data:", e);
    }
  }, []);

  // Save tasks to sessionStorage whenever they change
  useEffect(() => {
    if (tasks.length > 0) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks]);

  // Save archive to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(archivedTasks));
  }, [archivedTasks]);

  // Save checklist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
  }, [checklist]);

  const addTask = () => {
    if (!newTask.title.trim()) return;
    
    const task: DemoTask = {
      id: generateId(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      status: "todo",
      priority: newTask.priority,
      project: newTask.project,
      createdAt: new Date().toISOString(),
      dueDate: new Date(newTask.dueDate).toISOString(),
      assignedTo: "You",
      createdBy: "You",
    };
    
    setTasks(prev => [task, ...prev]);
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      project: "Marketing",
      dueDate: format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
    });
    setIsAdding(false);
  };

  // Archive task instead of deleting
  const archiveTask = (taskId: string) => {
    const taskToArchive = tasks.find(t => t.id === taskId);
    if (taskToArchive) {
      setArchivedTasks(prev => [taskToArchive, ...prev]);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // Restore task from archive
  const restoreTask = (taskId: string) => {
    const taskToRestore = archivedTasks.find(t => t.id === taskId);
    if (taskToRestore) {
      setTasks(prev => [taskToRestore, ...prev]);
      setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  // Permanently delete from archive
  const permanentlyDeleteTask = (taskId: string) => {
    setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, status: task.status === "todo" ? "completed" : "todo" }
        : task
    ));
  };

  // Checklist functions
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    const item: ChecklistItem = {
      id: generateId(),
      text: newChecklistItem.trim(),
      completed: false,
    };
    setChecklist(prev => [...prev, item]);
    setNewChecklistItem("");
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteChecklistItem = (itemId: string) => {
    setChecklist(prev => prev.filter(item => item.id !== itemId));
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, task: DemoTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetStatus: "todo" | "completed") => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== targetStatus) {
      setTasks(prev => prev.map(task =>
        task.id === draggedTask.id ? { ...task, status: targetStatus } : task
      ));
    }
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = !filterPriority || task.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const todoTasks = filteredTasks.filter(t => t.status === "todo");
  const completedTasks = filteredTasks.filter(t => t.status === "completed");
  const completedChecklistCount = checklist.filter(c => c.completed).length;

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#F5B536]" />
          <h3 className="text-lg font-semibold text-foreground">Interactive Task Demo</h3>
        </div>
        <Badge variant="secondary" className="bg-[#176884]/10 text-[#176884] border-0 text-xs">
          Session Only • No Sign Up Required
        </Badge>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white rounded-xl border shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[150px] max-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-full border-slate-200"
          />
        </div>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full">
              <Filter className="w-4 h-4" />
              Filter Tasks
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setFilterPriority(null)}>
              All Priorities
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterPriority("high")}>
              High Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterPriority("medium")}>
              Medium Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterPriority("low")}>
              Low Priority
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Task */}
        <Button 
          size="sm" 
          className="h-9 gap-2 bg-[#176884] hover:bg-[#176884]/90 rounded-full"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4" />
          Add Task
        </Button>

        {/* My Checklist */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-2 bg-[#8CC646] text-white border-0 hover:bg-[#8CC646]/90 rounded-full"
          onClick={() => setShowChecklist(true)}
        >
          <ListTodo className="w-4 h-4" />
          <span className="hidden sm:inline">My Checklist</span>
          {checklist.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 bg-white/20 text-white text-xs">
              {completedChecklistCount}/{checklist.length}
            </Badge>
          )}
        </Button>

        {/* Archive */}
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-2 bg-[#F5B536] text-white border-0 hover:bg-[#F5B536]/90 rounded-full"
          onClick={() => setShowArchive(true)}
        >
          <FolderKanban className="w-4 h-4" />
          <span className="hidden sm:inline">Archive</span>
          {archivedTasks.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 bg-white/20 text-white text-xs">
              {archivedTasks.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Add Task Modal */}
      {isAdding && (
        <Card className="p-4 mb-4 border-[#176884] shadow-lg animate-fade-in">
          <h4 className="font-semibold mb-3 text-foreground">Create New Task</h4>
          <div className="space-y-3">
            <Input
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
              autoFocus
            />
            <Input
              placeholder="Description (optional)..."
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2">
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                className="h-9 px-3 rounded-md border border-input text-sm bg-background"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <select
                value={newTask.project}
                onChange={(e) => setNewTask(prev => ({ ...prev, project: e.target.value }))}
                className="h-9 px-3 rounded-md border border-input text-sm bg-background"
              >
                {SAMPLE_PROJECTS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Input
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                className="h-9 w-auto"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addTask} className="bg-[#176884] hover:bg-[#176884]/90">
                Create Task
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Task Board */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* To Do Column */}
        <div
          className={cn(
            "rounded-xl border-2 transition-colors duration-200 overflow-hidden",
            draggedTask?.status === "completed" 
              ? "border-[#176884] bg-[#176884]/5" 
              : "border-[#e0f4fc] bg-[#f0faff]"
          )}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "todo")}
        >
          <div className="px-4 py-3 bg-[#e0f4fc]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#176884] tracking-wide">TO DO</span>
              <span className="text-sm text-[#176884]/70 font-medium">{todoTasks.length}</span>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="p-3 space-y-3">
              {todoTasks.map((task) => (
                <DemoTaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskStatus(task.id)}
                  onDelete={() => archiveTask(task.id)}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedTask?.id === task.id}
                />
              ))}

              {todoTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTodo className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tasks to do</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-[#176884] mt-1"
                    onClick={() => setIsAdding(true)}
                  >
                    Create your first task
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Completed Column */}
        <div
          className={cn(
            "rounded-xl border-2 transition-colors duration-200 overflow-hidden",
            draggedTask?.status === "todo" 
              ? "border-[#8CC646] bg-[#8CC646]/10" 
              : "border-[#8CC646]/30 bg-[#8CC646]"
          )}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, "completed")}
        >
          <div className="px-4 py-3 bg-[#7bb53a]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white tracking-wide">COMPLETE</span>
              <span className="text-sm text-white/80 font-medium">{completedTasks.length}</span>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="p-3 space-y-3">
              {completedTasks.map((task) => (
                <DemoTaskCard
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskStatus(task.id)}
                  onDelete={() => archiveTask(task.id)}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedTask?.id === task.id}
                  isCompleted
                />
              ))}

              {completedTasks.length === 0 && (
                <div className="text-center py-12 text-white/90">
                  <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No completed tasks yet</p>
                  <p className="text-sm text-white/70 mt-1">Drag tasks here when done</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        💡 Tip: Drag and drop tasks between columns, or click a task to toggle its status
      </p>

      {/* My Checklist Dialog */}
      <Dialog open={showChecklist} onOpenChange={setShowChecklist}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-[#8CC646]" />
              My Checklist
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Add new item */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a quick task..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addChecklistItem();
                }}
              />
              <Button size="sm" onClick={addChecklistItem} className="bg-[#8CC646] hover:bg-[#8CC646]/90">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Checklist items */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      item.completed ? "bg-[#8CC646]/10 border-[#8CC646]/30" : "bg-white border-slate-200"
                    )}
                  >
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => toggleChecklistItem(item.id)}
                      className="data-[state=checked]:bg-[#8CC646] data-[state=checked]:border-[#8CC646]"
                    />
                    <span className={cn(
                      "flex-1 text-sm",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteChecklistItem(item.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {checklist.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Your checklist is empty</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {checklist.length > 0 && (
              <div className="text-xs text-muted-foreground text-center">
                {completedChecklistCount} of {checklist.length} completed
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-[#F5B536]" />
              Archived Tasks
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {archivedTasks.map((task) => (
                <Card key={task.id} className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate">{task.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {task.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className={cn("text-xs h-5", PRIORITY_COLORS[task.priority])}>
                          {PRIORITY_LABELS[task.priority]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.project}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-[#176884]"
                        onClick={() => restoreTask(task.id)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => permanentlyDeleteTask(task.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              {archivedTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No archived tasks</p>
                  <p className="text-xs mt-1">Deleted tasks will appear here</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DemoTaskCardProps {
  task: DemoTask;
  onToggle: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  isCompleted?: boolean;
}

function DemoTaskCard({ 
  task, 
  onToggle, 
  onDelete, 
  onDragStart, 
  onDragEnd, 
  isDragging,
  isCompleted 
}: DemoTaskCardProps) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onToggle}
      className={cn(
        "p-4 group cursor-grab active:cursor-grabbing transition-all duration-200 bg-white hover:shadow-md",
        isDragging && "opacity-50 scale-95 rotate-2",
        isCompleted && "opacity-90"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-[#F5B536] flex items-center justify-center flex-shrink-0">
          <ListTodo className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={cn(
              "font-semibold text-sm text-foreground leading-tight",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h4>
            <Badge 
              variant="outline" 
              className={cn("text-xs flex-shrink-0 h-5", PRIORITY_COLORS[task.priority])}
            >
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>

          {/* Project Badge */}
          <Badge variant="outline" className="text-xs h-5 mb-2 border-slate-200 text-slate-600">
            <FolderKanban className="w-3 h-3 mr-1" />
            {task.project}
          </Badge>

          {/* Description */}
          {task.description && (
            <p className={cn(
              "text-xs text-muted-foreground line-clamp-2 mb-2",
              isCompleted && "line-through"
            )}>
              {task.description}
            </p>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-2 mb-2 text-xs">
            <Badge variant="secondary" className="h-5 gap-1 bg-slate-100 text-slate-600 font-normal">
              <Calendar className="w-3 h-3" />
              Created: {format(new Date(task.createdAt), "MMM d, yyyy")}
            </Badge>
            <Badge variant="secondary" className="h-5 gap-1 bg-slate-100 text-slate-600 font-normal">
              <Calendar className="w-3 h-3" />
              Due: {format(new Date(task.dueDate), "MMM d")}
            </Badge>
          </div>

          {/* Assignees */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>By:</span>
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[8px] bg-slate-200">
                  {task.createdBy.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{task.createdBy}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>To:</span>
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-[8px] bg-[#176884] text-white">
                  {task.assignedTo.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{task.assignedTo}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-[#176884] transition-colors">
              <Paperclip className="w-3 h-3" />
              Add Attachment
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
