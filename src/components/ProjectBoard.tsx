import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { ListTodo, Search, Users, BarChart3, Coins, TrendingUp, CheckSquare, Navigation, Lightbulb, FileText, ClipboardList, LogOut, X, SearchIcon, LucideIcon, Filter, Settings, ChevronDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "./ui/command";
import bosplanLogo from "@/assets/bosplan-logo.png";
import { isAfter, isBefore, isToday, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import TabNavigation from "./TabNavigation";
import ActionBar from "./ActionBar";
import SortableTaskCard from "./SortableTaskCard";
import SortableColumn from "./SortableColumn";
import TaskCard from "./TaskCard";
import SideNavigation from "./SideNavigation";
import RecyclingBin from "./RecyclingBin";
import ArchiveFolder from "./ArchiveFolder";
import ArchiveChoiceDialog from "./ArchiveChoiceDialog";
import OrganizationSwitcher from "./OrganizationSwitcher";
import AddTaskDialog from "./AddTaskDialog";
import PersonalChecklistModal from "./PersonalChecklistModal";
import TaskDraftsFolder from "./TaskDraftsFolder";
import { NotificationBell } from "./NotificationBell";
import PendingTaskRequests from "./PendingTaskRequests";
import { useArchive } from "@/hooks/useArchive";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { useTasks, Task, TaskPriority, TaskSubcategory } from "@/hooks/useTasks";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useProjects } from "@/hooks/useProjects";
import { useSparkle } from "@/contexts/SparkleContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
const iconMap: Record<string, LucideIcon> = {
  ListTodo,
  Search,
  Users,
  BarChart3,
  Coins,
  TrendingUp,
  CheckSquare,
  Navigation,
  Lightbulb,
  FileText,
  ClipboardList
};
const priorityFilterOptions = [{
  value: "all",
  label: "All Priorities"
}, {
  value: "high",
  label: "High",
  className: "text-priority-high"
}, {
  value: "medium",
  label: "Medium",
  className: "text-priority-medium"
}, {
  value: "low",
  label: "Low",
  className: "text-priority-low"
}];
type DueDateFilter = "all" | "overdue" | "today" | "this_week" | "this_month" | "no_date";
const dueDateFilterOptions: {
  value: DueDateFilter;
  label: string;
}[] = [{
  value: "all",
  label: "All Dates"
}, {
  value: "overdue",
  label: "Overdue"
}, {
  value: "today",
  label: "Due Today"
}, {
  value: "this_week",
  label: "Due This Week"
}, {
  value: "this_month",
  label: "Due This Month"
}, {
  value: "no_date",
  label: "No Due Date"
}];
const subcategoryOptions = [{
  value: "weekly",
  label: "Weekly Core Duties"
}, {
  value: "monthly",
  label: "Monthly Core"
}, {
  value: "quarterly",
  label: "Quarterly Core"
}, {
  value: "yearly",
  label: "Yearly Core"
}, {
  value: "misc",
  label: "MISC"
}];
const ProjectBoard = () => {
  // Default to Product Management; it's the only visible tab for non-admin users.
  const [activeTab, setActiveTab] = useState("product");
  const [activeSideItem, setActiveSideItem] = useState("calendar");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<TaskSubcategory | "all">("all");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned_to_me" | string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Debounce search query to reduce re-renders
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{
    id: string;
    title: string;
    status: string;
  } | null>(null);
  const {
    user,
    signOut
  } = useAuth();
  const {
    organization,
    profile
  } = useOrganization();
  const {
    tasks,
    loading,
    addTask,
    reorderTasks,
    deleteTask,
    updateTaskTitle,
    updateTaskDescription,
    updateTaskAssignment,
    updateTaskDueDate,
    updateTaskProject,
    updateTaskPriority,
    updateTaskStatus,
    refetch
  } = useTasks();
  const {
    members
  } = useTeamMembers();
  const {
    projects
  } = useProjects();
  const {
    archiveTask
  } = useArchive();
  const {
    canCreateTasks,
    canDeleteTasks,
    canEditOwnTasks,
    canAssignTasks,
    isAdmin,
    isMember,
    isViewer,
    canAccessOperational,
    canAccessStrategic,
  } = useUserRole();

  // Non-admin users only have access to Product Management; ensure the board isn't stuck on a hidden tab.
  useEffect(() => {
    if (!canAccessOperational && activeTab === "operational") {
      setActiveTab("product");
    }
    if (!canAccessStrategic && activeTab === "strategic") {
      setActiveTab("product");
    }
  }, [canAccessOperational, canAccessStrategic, activeTab]);

  // Client-side task request reminder check - runs when managers/admins load the board
  // This replaces the need for a cron job by checking on user activity
  const checkTaskRequestReminders = useCallback(async () => {
    if (!user || !organization?.id) return;
    // Only admins and members (managers) who can create tasks should trigger reminders
    if (!isAdmin && !isMember) return;
    try {
      await supabase.functions.invoke('task-request-reminders', {
        body: {
          organizationId: organization.id
        }
      });
    } catch (error) {
      // Silently fail - this is a background check
      console.error('Failed to check task request reminders:', error);
    }
  }, [user, organization?.id, isAdmin, isMember]);
  useEffect(() => {
    // Run reminder check once when the board loads for admins/managers
    checkTaskRequestReminders();
  }, [checkTaskRequestReminders]);
  const {
    triggerSparkle
  } = useSparkle();
  const completeColumnRef = useRef<HTMLDivElement>(null);

  // Memoize team members for reassignment purposes (viewers need this for task request reassignment)
  const allTeamMembers = useMemo(() => members.map(m => ({
    id: m.id,
    full_name: m.full_name
  })), [members]);

  // Memoize filtered team members for assignment based on current user's role
  // Full Access (admin): can assign to anyone
  // Manager (member): can assign to member or viewer only (not admin)
  // Team (viewer): cannot assign tasks (handled in UI)
  const teamMembers = useMemo(() => members.filter(m => {
    if (isAdmin) return true; // Admin can assign to anyone
    if (isMember) return m.role !== "admin"; // Manager can assign to member/viewer
    return false; // Viewer cannot assign
  }).map(m => ({
    id: m.id,
    full_name: m.full_name
  })), [members, isAdmin, isMember]);

  // Memoize project options
  const projectOptions = useMemo(() => projects.map(p => ({
    id: p.id,
    title: p.title
  })), [projects]);
  const {
    navigate
  } = useOrgNavigation();

  // Configure sensors with delay for touch to prevent accidental drags while scrolling
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5
    }
  }), useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 8
    }
  }));
  const showSubcategoryFilter = activeTab === "operational" || activeTab === "strategic";

  // Memoize filtered tasks to prevent recalculation on every render
  const {
    todoTasks,
    completeTasks
  } = useMemo(() => {
    const filtered = tasks.filter(task => {
      const matchesCategory = task.category === activeTab;
      const matchesSearch = debouncedSearchQuery.trim() === "" || task.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesSubcategory = !showSubcategoryFilter || subcategoryFilter === "all" || task.subcategory === subcategoryFilter;

      // Due date filter logic
      let matchesDueDate = true;
      if (dueDateFilter !== "all") {
        const today = new Date();
        const dueDate = task.due_date ? new Date(task.due_date) : null;
        switch (dueDateFilter) {
          case "overdue":
            matchesDueDate = dueDate !== null && isBefore(endOfDay(dueDate), startOfDay(today)) && task.status !== "complete";
            break;
          case "today":
            matchesDueDate = dueDate !== null && isToday(dueDate);
            break;
          case "this_week":
            matchesDueDate = dueDate !== null && !isBefore(dueDate, startOfWeek(today, {
              weekStartsOn: 1
            })) && !isAfter(dueDate, endOfWeek(today, {
              weekStartsOn: 1
            }));
            break;
          case "this_month":
            matchesDueDate = dueDate !== null && !isBefore(dueDate, startOfMonth(today)) && !isAfter(dueDate, endOfMonth(today));
            break;
          case "no_date":
            matchesDueDate = dueDate === null;
            break;
        }
      }
      // Assignment filter logic (only for admin/member users)
      let matchesAssignment = true;
      if (assignmentFilter === "assigned_to_me" && user) {
        const isDirectlyAssigned = task.assigned_user_id === user.id;
        const isInAssignments = task.task_assignments?.some(a => a.user_id === user.id);
        matchesAssignment = isDirectlyAssigned || isInAssignments;
      } else if (assignmentFilter !== "all" && assignmentFilter !== "assigned_to_me") {
        const isDirectlyAssigned = task.assigned_user_id === assignmentFilter;
        const isInAssignments = task.task_assignments?.some(a => a.user_id === assignmentFilter);
        matchesAssignment = isDirectlyAssigned || isInAssignments;
      }
      return matchesCategory && matchesSearch && matchesPriority && matchesSubcategory && matchesDueDate && matchesAssignment;
    });
    return {
      todoTasks: filtered.filter(task => task.status === "todo").sort((a, b) => a.position - b.position),
      completeTasks: filtered.filter(task => task.status === "complete").sort((a, b) => a.position - b.position)
    };
  }, [tasks, activeTab, debouncedSearchQuery, priorityFilter, subcategoryFilter, showSubcategoryFilter, dueDateFilter, assignmentFilter, user]);
  const handleAddTask = async (params: {
    title: string;
    icon: string;
    category: string;
    priority: TaskPriority;
    description: string;
    subcategory: TaskSubcategory;
    projectId: string | null;
    dueDate: string | null;
    assignedUserId: string | null;
    assignedUserIds: string[];
    isRecurring: boolean;
    isDraft?: boolean;
  }): Promise<string | null> => {
    const taskId = await addTask(params.title, params.icon, params.category, params.priority, params.description, params.subcategory, params.projectId, params.dueDate, params.assignedUserId, params.assignedUserIds, params.isRecurring, params.isDraft ?? false);
    // Note: Don't refetch here - wait for onComplete callback after attachments are uploaded
    return taskId;
  };

  // Callback to trigger refetch after task creation + attachment uploads complete
  const handleTaskCreationComplete = useCallback(() => {
    refetch();
  }, [refetch]);
  const handleDeleteTask = useCallback((task: {
    id: string;
    title: string;
    status: string;
  }) => {
    if (task.status === "complete") {
      // Show choice dialog for completed tasks
      setTaskToDelete(task);
      setArchiveDialogOpen(true);
    } else {
      // Direct delete for non-complete tasks
      deleteTask(task.id);
    }
  }, [deleteTask]);

  // Memoized task update callbacks to prevent unnecessary re-renders
  const handleTitleChange = useCallback((taskId: string, newTitle: string) => {
    updateTaskTitle(taskId, newTitle);
  }, [updateTaskTitle]);
  const handleDescriptionChange = useCallback((taskId: string, newDesc: string) => {
    updateTaskDescription(taskId, newDesc);
  }, [updateTaskDescription]);
  const handleAssignmentChange = useCallback((taskId: string, userId: string | null) => {
    updateTaskAssignment(taskId, userId);
  }, [updateTaskAssignment]);
  const handleDueDateChange = useCallback((taskId: string, date: string | null) => {
    updateTaskDueDate(taskId, date);
  }, [updateTaskDueDate]);
  const handleProjectChange = useCallback((taskId: string, projectId: string | null) => {
    updateTaskProject(taskId, projectId);
  }, [updateTaskProject]);
  const handlePriorityChange = useCallback((taskId: string, priority: TaskPriority) => {
    updateTaskPriority(taskId, priority);
  }, [updateTaskPriority]);
  const handleStatusChange = useCallback((taskId: string, status: "todo" | "complete") => {
    updateTaskStatus(taskId, status);
  }, [updateTaskStatus]);
  const handleArchiveTask = async () => {
    if (taskToDelete) {
      await archiveTask(taskToDelete.id);
      refetch();
      setTaskToDelete(null);
    }
  };
  const handleRecycleBinTask = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
  };
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveTask(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTaskData = tasks.find(t => t.id === activeId);
    if (!activeTaskData) return;

    // Determine target status
    let targetStatus: "todo" | "complete";
    let targetPosition: number;
    if (overId === "todo" || overId === "complete") {
      // Dropped on empty column or column area
      targetStatus = overId;
      // Use todo/complete tasks for position when filters are active
      const relevantTasks = targetStatus === "todo" ? todoTasks : completeTasks;
      // When dropping on column, position at end of the filtered list
      const allColumnTasks = tasks.filter(t => t.category === activeTab && t.status === targetStatus);
      targetPosition = allColumnTasks.length;
    } else {
      // Dropped on another task - find it in filtered or unfiltered list
      const allFilteredTasks = [...todoTasks, ...completeTasks];
      const overTask = allFilteredTasks.find(t => t.id === overId) || tasks.find(t => t.id === overId);
      if (!overTask) return;
      targetStatus = overTask.status;
      // Use all tasks for position calculation to maintain correct ordering
      const columnTasks = tasks.filter(t => t.category === activeTab && t.status === targetStatus).sort((a, b) => a.position - b.position);
      const overIndex = columnTasks.findIndex(t => t.id === overId);
      targetPosition = overIndex >= 0 ? overIndex : columnTasks.length;
    }

    // Only update if something changed
    if (activeTaskData.status !== targetStatus || activeTaskData.position !== targetPosition) {
      reorderTasks(activeId, targetStatus, targetPosition, activeTab);
      // Trigger sparkle animation when task is moved to complete
      if (targetStatus === "complete" && activeTaskData.status !== "complete") {
        triggerSparkle(completeColumnRef);
      }
    }
  };
  const getActiveIcon = () => {
    if (!activeTask) return ListTodo;
    return iconMap[activeTask.icon] || ListTodo;
  };
  // Get display label for user filter
  const getUserFilterLabel = () => {
    if (assignmentFilter === "all") return "All Tasks";
    if (assignmentFilter === "assigned_to_me") return "Assigned to Me";
    const selectedMember = members.find(m => m.id === assignmentFilter);
    return selectedMember?.full_name || "User";
  };

  // Filter members for user search
  const filteredMembers = members.filter(m => m.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || m.email?.toLowerCase().includes(userSearchQuery.toLowerCase()));
  return <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
        <div className="flex-1 flex flex-col bg-card/50 w-full max-w-full">
          {/* Fixed Header Area */}
          <div className="bg-background border-b border-border/50 p-3 sm:p-6 md:px-8 md:pt-8 md:pb-6 w-full max-w-full overflow-x-hidden">
            {/* Header - responsive layout */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 sm:gap-5">
                <img alt="Bosplan" className="h-9 w-auto cursor-pointer sm:h-10 transition-transform duration-200 hover:scale-105" onClick={() => navigate("/")} src="/lovable-uploads/ae2e0e00-979d-4807-aba7-9534bd9a71ed.png" />
                <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
              </div>
              {user && <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <OrganizationSwitcher />
                  <span className="hidden sm:inline text-sm text-muted-foreground font-medium truncate max-w-[150px]">{profile?.full_name || user.email}</span>
                  <NotificationBell />
                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth h-9 w-9 sm:h-10 sm:w-10" onClick={() => navigate("/settings")} title="Settings">
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-xl hover:bg-secondary/80 transition-all duration-200 btn-smooth text-xs sm:text-sm" onClick={signOut}>
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </Button>
                </div>}
            </div>
            
          {/* Filters and actions - responsive layout */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground mr-1 sm:mr-2">
                  {activeTab === "product" ? "Product" : activeTab === "operational" ? "Operational" : "Strategic"}
                  <span className="hidden sm:inline"> Management</span>
                </h2>
                <ActionBar />
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full">
                <div className="relative group flex-1 min-w-[120px] max-w-[200px] sm:max-w-[280px]">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
                  <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-full rounded-full bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-md focus:shadow-md transition-all duration-300 border-brand-green text-sm h-9" />
                  {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200 p-0.5 rounded-full hover:bg-muted">
                      <X className="w-4 h-4" />
                    </button>}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={`w-auto sm:w-[160px] justify-between rounded-full bg-card shadow-sm hover:shadow-md transition-all duration-300 border-brand-green text-sm gap-2 ${priorityFilter !== "all" || dueDateFilter !== "all" || assignmentFilter !== "all" ? "border-primary/50 bg-primary/5" : ""}`}>
                      <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="hidden sm:inline">Filter Tasks</span>
                      {(priorityFilter !== "all" || dueDateFilter !== "all" || assignmentFilter !== "all") && <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {[priorityFilter !== "all", dueDateFilter !== "all", assignmentFilter !== "all"].filter(Boolean).length}
                        </span>}
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0 bg-popover" align="start">
                    <div className="p-3 border-b border-border">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Filter Tasks</h4>
                        {(priorityFilter !== "all" || dueDateFilter !== "all" || assignmentFilter !== "all") && <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground" onClick={() => {
                        setPriorityFilter("all");
                        setDueDateFilter("all");
                        setAssignmentFilter("all");
                      }}>
                            Clear all
                          </Button>}
                      </div>
                    </div>
                    <div className="p-3 space-y-4">
                      {/* Priority Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
                        <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as TaskPriority | "all")}>
                          <SelectTrigger className="w-full rounded-lg bg-background border-border text-sm">
                            <SelectValue placeholder="All Priorities" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/60 shadow-lg bg-popover">
                            {priorityFilterOptions.map(option => <SelectItem key={option.value} value={option.value} className="rounded-lg">
                                <span className={option.className}>{option.label}</span>
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Due Date Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</label>
                        <Select value={dueDateFilter} onValueChange={v => setDueDateFilter(v as DueDateFilter)}>
                          <SelectTrigger className="w-full rounded-lg bg-background border-border text-sm">
                            <SelectValue placeholder="All Dates" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border/60 shadow-lg bg-popover">
                            {dueDateFilterOptions.map(option => <SelectItem key={option.value} value={option.value} className="rounded-lg">
                                {option.label}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Assignment Filter - only for admin/member */}
                      {(isAdmin || isMember) && <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned To</label>
                          <Command className="rounded-lg border border-border">
                            <CommandInput placeholder="Search users..." value={userSearchQuery} onValueChange={setUserSearchQuery} className="h-9" />
                            <CommandList className="max-h-[150px]">
                              <CommandEmpty>No users found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem value="all" onSelect={() => {
                              setAssignmentFilter("all");
                              setUserSearchQuery("");
                            }}>
                                  <Check className={`mr-2 h-4 w-4 ${assignmentFilter === "all" ? "opacity-100" : "opacity-0"}`} />
                                  All Tasks
                                </CommandItem>
                                <CommandItem value="assigned_to_me" onSelect={() => {
                              setAssignmentFilter("assigned_to_me");
                              setUserSearchQuery("");
                            }}>
                                  <Check className={`mr-2 h-4 w-4 ${assignmentFilter === "assigned_to_me" ? "opacity-100" : "opacity-0"}`} />
                                  Assigned to Me
                                </CommandItem>
                              </CommandGroup>
                              <CommandSeparator />
                              <CommandGroup heading="Team Members">
                                {filteredMembers.map(member => <CommandItem key={member.id} value={member.full_name || member.email || member.id} onSelect={() => {
                              setAssignmentFilter(member.id);
                              setUserSearchQuery("");
                            }}>
                                    <Check className={`mr-2 h-4 w-4 ${assignmentFilter === member.id ? "opacity-100" : "opacity-0"}`} />
                                    {member.full_name || member.email}
                                  </CommandItem>)}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </div>}
                    </div>
                  </PopoverContent>
                </Popover>
                {canCreateTasks && <AddTaskDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} activeTab={activeTab} showSubcategoryFilter={showSubcategoryFilter} teamMembers={teamMembers} organizationId={organization?.id || null} onAddTask={handleAddTask} onComplete={handleTaskCreationComplete} />}
                <PersonalChecklistModal />
                <ArchiveFolder onRestore={refetch} variant="tasks" />
                {canCreateTasks && <TaskDraftsFolder />}
                <RecyclingBin onRestore={refetch} />
              </div>
            </div>
          </div>
          
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6 md:p-8 w-full max-w-full">
          
          {loading ? <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground animate-pulse">Loading tasks...</div>
            </div> : <div className="space-y-6 w-full max-w-full">
              {/* Pending Task Requests Section */}
              <PendingTaskRequests teamMembers={allTeamMembers} currentUserId={user?.id} onTaskAccepted={refetch} />
              
              {/* Task Columns */}
              <div className="flex flex-col md:flex-row gap-4 sm:gap-6 w-full max-w-full">
              <SortableColumn id="todo" title="TO DO" variant="todo" items={todoTasks.map(t => t.id)}>
              {todoTasks.map(task => {
                  const IconComponent = iconMap[task.icon] || ListTodo;
                  // Team (viewer) users cannot change assignment, and assignment is only available in Product Management
                  const canAssign = canAssignTasks && activeTab === "product";
                  
                  // Determine if current user can edit this task
                  // Viewer: Cannot edit tasks at all (can only move their assigned tasks)
                  // Manager: Can edit own tasks only
                  // Admin: Can edit all tasks
                  const isOwnTask = task.created_by_user_id === user?.id || task.assigned_user_id === user?.id;
                  const canEditThisTask = isAdmin || (canEditOwnTasks && isOwnTask);
                  
                  return <div key={task.id} className="relative group animate-fade-in">
                      <SortableTaskCard id={task.id} title={task.title} description={task.description} icon={IconComponent} priority={task.priority} organizationId={task.organization_id || undefined} assignedUser={task.assigned_user} assignedUsers={task.task_assignments} createdByUser={task.created_by_user} project={task.project} teamMembers={teamMembers} projects={projectOptions} createdAt={task.created_at} dueDate={task.due_date} completedAt={task.completed_at} status="todo" canEditAttachments={canEditThisTask} onTitleChange={canEditThisTask ? newTitle => handleTitleChange(task.id, newTitle) : undefined} onDescriptionChange={canEditThisTask ? newDesc => handleDescriptionChange(task.id, newDesc) : undefined} onAssignmentChange={canAssign && canEditThisTask ? userId => handleAssignmentChange(task.id, userId) : undefined} onDueDateChange={canEditThisTask ? date => handleDueDateChange(task.id, date) : undefined} onProjectChange={canEditThisTask ? projectId => handleProjectChange(task.id, projectId) : undefined} onPriorityChange={canEditThisTask ? priority => handlePriorityChange(task.id, priority) : undefined} onStatusChange={status => handleStatusChange(task.id, status)} onTaskBecamePending={refetch} />
                      {canDeleteTasks && <button onClick={() => handleDeleteTask({
                      id: task.id,
                      title: task.title,
                      status: "todo"
                    })} className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 hover:scale-105" title="Delete">
                          <X className="w-3.5 h-3.5" />
                        </button>}
                    </div>;
                })}
                {todoTasks.length === 0 && <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                      <ListTodo className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
                    </div>
                    <p className="text-sm text-white">No tasks to do</p>
                    <p className="text-xs text-white/70 mt-1">Add one above to get started!</p>
                  </div>}
              </SortableColumn>
              
              <SortableColumn ref={completeColumnRef} id="complete" title="COMPLETE" variant="complete" items={completeTasks.map(t => t.id)}>
                {completeTasks.map(task => {
                  const IconComponent = iconMap[task.icon] || ListTodo;
                  // Team (viewer) users cannot change assignment, and assignment is only available in Product Management
                  const canAssign = canAssignTasks && activeTab === "product";
                  
                  // Determine if current user can edit this task
                  const isOwnTask = task.created_by_user_id === user?.id || task.assigned_user_id === user?.id;
                  const canEditThisTask = isAdmin || (canEditOwnTasks && isOwnTask);
                  
                  return <div key={task.id} className="relative group animate-fade-in">
                      <SortableTaskCard id={task.id} title={task.title} description={task.description} icon={IconComponent} priority={task.priority} organizationId={task.organization_id || undefined} assignedUser={task.assigned_user} assignedUsers={task.task_assignments} createdByUser={task.created_by_user} project={task.project} teamMembers={teamMembers} projects={projectOptions} createdAt={task.created_at} dueDate={task.due_date} completedAt={task.completed_at} status="complete" canEditAttachments={canEditThisTask} onTitleChange={canEditThisTask ? newTitle => handleTitleChange(task.id, newTitle) : undefined} onDescriptionChange={canEditThisTask ? newDesc => handleDescriptionChange(task.id, newDesc) : undefined} onAssignmentChange={canAssign && canEditThisTask ? userId => handleAssignmentChange(task.id, userId) : undefined} onDueDateChange={canEditThisTask ? date => handleDueDateChange(task.id, date) : undefined} onProjectChange={canEditThisTask ? projectId => handleProjectChange(task.id, projectId) : undefined} onPriorityChange={canEditThisTask ? priority => handlePriorityChange(task.id, priority) : undefined} onStatusChange={status => handleStatusChange(task.id, status)} onTaskBecamePending={refetch} />
                      {canDeleteTasks && <button onClick={() => handleDeleteTask({
                      id: task.id,
                      title: task.title,
                      status: "complete"
                    })} className="absolute top-2 right-2 p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 hover:scale-105" title="Delete">
                          <X className="w-3.5 h-3.5" />
                        </button>}
                    </div>;
                })}
                {completeTasks.length === 0 && <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                      <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white/70" />
                    </div>
                    <p className="text-sm text-white">No completed tasks yet</p>
                    <p className="text-xs text-white/70 mt-1">Drag tasks here when done</p>
                  </div>}
              </SortableColumn>
              </div>
            </div>}
          </div>
        </div>
        
        <SideNavigation activeItem={activeSideItem} onItemClick={setActiveSideItem} />
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard title={activeTask.title} description={activeTask.description} icon={getActiveIcon()} priority={activeTask.priority} assignedUser={activeTask.assigned_user} assignedUsers={activeTask.task_assignments} createdByUser={activeTask.created_by_user} project={activeTask.project} className="shadow-lg ring-2 ring-primary/20 rotate-2" /> : null}
      </DragOverlay>

      <ArchiveChoiceDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen} itemType="task" itemTitle={taskToDelete?.title || ""} onArchive={handleArchiveTask} onRecycleBin={handleRecycleBinTask} />
    </DndContext>;
};
export default ProjectBoard;