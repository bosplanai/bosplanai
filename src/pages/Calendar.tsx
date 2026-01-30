import { useState } from 'react';
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useTasks, Task } from '@/hooks/useTasks';
import { usePersonalChecklist } from '@/hooks/usePersonalChecklist';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, CheckSquare, ListTodo, ArrowLeft, User, FileText, Clock, Paperclip, MessageSquare, Filter, X, RefreshCw } from 'lucide-react';
import OrganizationSwitcher from '@/components/OrganizationSwitcher';
import { NotificationBell } from '@/components/NotificationBell';
import SideNavigation from '@/components/SideNavigation';
import BetaFooter from '@/components/BetaFooter';
import { TaskNotesDialog } from '@/components/TaskNotesDialog';

interface CalendarItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  source: 'task' | 'checklist';
  project?: { id: string; title: string } | null;
  assigned_user?: { id: string; full_name: string } | null;
  task_assignments?: { id: string; user_id: string; user?: { id: string; full_name: string } }[];
  created_by_user?: { id: string; full_name: string } | null;
  created_at: string;
  attachment_name?: string | null;
  subcategory?: string;
  category?: string;
}

const Calendar = () => {
  const { navigate } = useOrgNavigation();
  const { tasks } = useTasks();
  const { items: checklistItems } = usePersonalChecklist();
  const { user } = useAuth();
  const { isAdmin, isMember, isViewer, loading: roleLoading } = useUserRole();
  const { members } = useTeamMembers();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedTaskForNotes, setSelectedTaskForNotes] = useState<{ id: string; title: string } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  // Managers (member) and Owners (admin) can see all tasks
  // Team members (viewer) only see tasks assigned to them
  const canSeeAllTasks = isAdmin || isMember;

  // Check if user is assigned to a task
  const isUserAssignedToTask = (task: Task) => {
    if (!user) return false;
    
    // Check primary assignment
    if (task.assigned_user_id === user.id) return true;
    
    // Check additional assignments
    if (task.task_assignments?.some(a => a.user_id === user.id)) return true;
    
    return false;
  };

  // Filter tasks based on user role
  const filteredTasks = tasks.filter((task) => {
    // Always filter by due_date and status
    if (!task.due_date || task.status === 'complete') return false;
    
    // Managers and owners see all tasks
    if (canSeeAllTasks) return true;
    
    // Team members (viewers) only see their assigned tasks
    return isUserAssignedToTask(task);
  });

  // Combine tasks and checklist items
  const allItems: CalendarItem[] = [
    ...filteredTasks
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        due_date: task.due_date!,
        priority: task.priority,
        status: task.status,
        source: 'task' as const,
        project: task.project,
        assigned_user: task.assigned_user,
        task_assignments: task.task_assignments,
        created_by_user: task.created_by_user,
        created_at: task.created_at,
        attachment_name: task.attachment_name,
        subcategory: task.subcategory,
        category: task.category,
      })),
    ...checklistItems
      .filter((item) => item.due_date && !item.is_completed)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || null,
        due_date: item.due_date!,
        priority: item.priority,
        status: item.is_completed ? 'complete' : 'pending',
        source: 'checklist' as const,
        project: null,
        assigned_user: null,
        task_assignments: [],
        created_by_user: null,
        created_at: item.created_at,
        attachment_name: item.attachment_name,
        subcategory: undefined,
      })),
  ];

  // Handle opening notes dialog (only for managers/owners and tasks)
  const handleOpenNotes = (item: CalendarItem) => {
    if (item.source !== 'task' || (!isAdmin && !isMember)) return;
    setSelectedTaskForNotes({ id: item.id, title: item.title });
    setNotesDialogOpen(true);
  };

  // Get all unique assignees from tasks for filter options
  const allAssignees = (() => {
    const assigneeMap = new Map<string, { id: string; full_name: string }>();
    allItems.forEach(item => {
      if (item.assigned_user) {
        assigneeMap.set(item.assigned_user.id, item.assigned_user);
      }
      item.task_assignments?.forEach(assignment => {
        if (assignment.user) {
          assigneeMap.set(assignment.user.id, assignment.user);
        }
      });
    });
    return Array.from(assigneeMap.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  })();

  // Check if any filters are active
  const hasActiveFilters = selectedCategories.length > 0 || selectedAssignees.length > 0;
  const activeFilterCount = selectedCategories.length + selectedAssignees.length;

  // Toggle category filter
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  // Toggle assignee filter
  const toggleAssignee = (assigneeId: string) => {
    setSelectedAssignees(prev => 
      prev.includes(assigneeId) ? prev.filter(a => a !== assigneeId) : [...prev, assigneeId]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedAssignees([]);
  };

  // Get items for selected date with filters
  const itemsForSelectedDate = selectedDate
    ? allItems.filter((item) => {
        const matchesDate = item.due_date && isSameDay(parseISO(item.due_date), selectedDate);
        if (!matchesDate) return false;
        
        // Apply category filter (if any selected)
        if (selectedCategories.length > 0) {
          if (selectedCategories.includes("personal") && item.source === "checklist") {
            // Personal checklist item matches
          } else if (item.source === "task" && selectedCategories.includes(item.category || "")) {
            // Task category matches
          } else if (!selectedCategories.includes("personal") && item.source === "checklist") {
            return false;
          } else if (item.source === "task" && !selectedCategories.includes(item.category || "")) {
            return false;
          }
        }

        // Apply assignee filter (if any selected)
        if (selectedAssignees.length > 0) {
          const itemAssigneeIds: string[] = [];
          if (item.assigned_user) {
            itemAssigneeIds.push(item.assigned_user.id);
          }
          item.task_assignments?.forEach(assignment => {
            if (assignment.user) {
              itemAssigneeIds.push(assignment.user.id);
            }
          });
          
          if (!selectedAssignees.some(id => itemAssigneeIds.includes(id))) {
            return false;
          }
        }
        
        return true;
      })
    : [];

  // Group items by category for organized display
  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case "product": return "Product Management";
      case "operational": return "Operational Management";
      case "strategic": return "Strategic Management";
      default: return "Other";
    }
  };

  // Sort items by category, then priority
  const sortedItemsForSelectedDate = [...itemsForSelectedDate].sort((a, b) => {
    // First sort by category
    const categoryOrder = { "product": 1, "operational": 2, "strategic": 3 };
    const aCatOrder = a.source === "checklist" ? 4 : (categoryOrder[a.category as keyof typeof categoryOrder] || 5);
    const bCatOrder = b.source === "checklist" ? 4 : (categoryOrder[b.category as keyof typeof categoryOrder] || 5);
    if (aCatOrder !== bCatOrder) return aCatOrder - bCatOrder;
    
    // Then by priority
    const priorityOrder = { "high": 1, "medium": 2, "low": 3 };
    return (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 4);
  });

  // Get dates that have deadlines for highlighting
  const datesWithDeadlines = allItems
    .map((item) => (item.due_date ? parseISO(item.due_date) : null))
    .filter((date): date is Date => date !== null);

  // Count items by priority
  const highPriorityCount = allItems.filter(i => i.priority === 'high').length;
  const mediumPriorityCount = allItems.filter(i => i.priority === 'medium').length;
  const lowPriorityCount = allItems.filter(i => i.priority === 'low').length;

  // Get initials from full name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get all assignees for a task
  const getAssignees = (item: CalendarItem) => {
    const assignees: { id: string; full_name: string }[] = [];
    
    if (item.assigned_user) {
      assignees.push(item.assigned_user);
    }
    
    if (item.task_assignments) {
      item.task_assignments.forEach((assignment) => {
        if (assignment.user && !assignees.find(a => a.id === assignment.user?.id)) {
          assignees.push(assignment.user);
        }
      });
    }
    
    return assignees;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex flex-1">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-card border-b border-border px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-teal to-brand-teal/70 flex items-center justify-center shadow-sm">
                    <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-semibold text-foreground">Task Calendar</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">View and manage your upcoming deadlines</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <OrganizationSwitcher />
                <NotificationBell />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="bg-destructive/5 border-destructive/20 rounded-xl transition-all hover:shadow-sm">
                <CardContent className="p-3 sm:p-4 flex items-start justify-between gap-2">
                  <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">High Priority</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{highPriorityCount}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-brand-orange/5 border-brand-orange/20 rounded-xl transition-all hover:shadow-sm">
                <CardContent className="p-3 sm:p-4 flex items-start justify-between gap-2">
                  <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Medium Priority</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{mediumPriorityCount}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-brand-orange/10 flex items-center justify-center shrink-0">
                    <ListTodo className="w-4 h-4 sm:w-5 sm:h-5 text-brand-orange" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-brand-green/5 border-brand-green/20 rounded-xl transition-all hover:shadow-sm col-span-2 sm:col-span-1">
                <CardContent className="p-3 sm:p-4 flex items-start justify-between gap-2">
                  <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Low Priority</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{lowPriorityCount}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-brand-green/10 flex items-center justify-center shrink-0">
                    <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-brand-green" />
                  </div>
                </CardContent>
              </Card>
            </div>

          {/* Main Content - Combined Card */}
          <Card>
            <CardContent className="p-3 sm:p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-12">
                {/* Calendar */}
                <div className="pb-4 lg:pb-0 lg:border-r lg:border-border/50 lg:pr-8 flex flex-col items-center">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 self-start">Calendar View</h3>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="pointer-events-auto p-0 [&_.rdp]:mx-auto [&_.rdp-table]:border-separate [&_.rdp-table]:border-spacing-2 sm:[&_.rdp-table]:border-spacing-3 lg:[&_.rdp-table]:border-spacing-4 [&_.rdp-head_cell]:text-base sm:[&_.rdp-head_cell]:text-lg lg:[&_.rdp-head_cell]:text-xl [&_.rdp-head_cell]:font-semibold [&_.rdp-head_cell]:py-4 sm:[&_.rdp-head_cell]:py-5 lg:[&_.rdp-head_cell]:py-6 [&_.rdp-cell]:p-1.5 lg:[&_.rdp-cell]:p-2 [&_.rdp-day]:w-12 sm:[&_.rdp-day]:w-14 lg:[&_.rdp-day]:w-16 [&_.rdp-day]:h-12 sm:[&_.rdp-day]:h-14 lg:[&_.rdp-day]:h-16 [&_.rdp-day]:text-lg sm:[&_.rdp-day]:text-xl lg:[&_.rdp-day]:text-2xl [&_.rdp-day]:rounded-xl [&_.rdp-caption]:text-2xl sm:[&_.rdp-caption]:text-3xl lg:[&_.rdp-caption]:text-4xl [&_.rdp-caption]:font-bold [&_.rdp-caption]:py-4 sm:[&_.rdp-caption]:py-6 lg:[&_.rdp-caption]:py-8 [&_.rdp-caption_label]:text-2xl sm:[&_.rdp-caption_label]:text-3xl lg:[&_.rdp-caption_label]:text-4xl [&_.rdp-nav]:gap-3 sm:[&_.rdp-nav]:gap-5 lg:[&_.rdp-nav]:gap-6 [&_.rdp-nav_button]:h-12 sm:[&_.rdp-nav_button]:h-14 lg:[&_.rdp-nav_button]:h-16 [&_.rdp-nav_button]:w-12 sm:[&_.rdp-nav_button]:w-14 lg:[&_.rdp-nav_button]:w-16"
                    modifiers={{
                      hasDeadline: datesWithDeadlines,
                    }}
                    modifiersClassNames={{
                      hasDeadline: 'bg-primary/20 text-primary font-semibold',
                    }}
                  />
                </div>

                {/* Selected Date Items - Full Task Details */}
                <div className="lg:pl-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      <h3 className="text-sm sm:text-lg font-semibold">
                        {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a date'}
                      </h3>
                      {sortedItemsForSelectedDate.length > 0 && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">
                          {sortedItemsForSelectedDate.length}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Filter Button with Popover */}
                    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className={cn(
                            "h-8 sm:h-9 gap-2 text-xs sm:text-sm",
                            hasActiveFilters && "border-primary bg-primary/5"
                          )}
                        >
                          <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Filter</span>
                          {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px]">
                              {activeFilterCount}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0 bg-popover border border-border shadow-lg" align="end">
                        <div className="p-3 border-b border-border">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm">Filters</h4>
                            {hasActiveFilters && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={clearFilters}
                              >
                                Clear all
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Categories Section */}
                        <div className="p-3 border-b border-border">
                          <h5 className="text-xs font-medium text-muted-foreground mb-2">Categories</h5>
                          <div className="space-y-2">
                            {[
                              { value: "product", label: "Product" },
                              { value: "operational", label: "Operational" },
                              { value: "strategic", label: "Strategic" },
                              { value: "personal", label: "Personal" },
                            ].map(({ value, label }) => (
                              <label 
                                key={value}
                                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2"
                              >
                                <Checkbox
                                  checked={selectedCategories.includes(value)}
                                  onCheckedChange={() => toggleCategory(value)}
                                />
                                <span className="text-sm">{label}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Assignees Section */}
                        <div className="p-3">
                          <h5 className="text-xs font-medium text-muted-foreground mb-2">Assignees</h5>
                          {allAssignees.length > 0 ? (
                            <ScrollArea className="max-h-40">
                              <div className="space-y-2">
                                {allAssignees.map((assignee) => (
                                  <label 
                                    key={assignee.id}
                                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2"
                                  >
                                    <Checkbox
                                      checked={selectedAssignees.includes(assignee.id)}
                                      onCheckedChange={() => toggleAssignee(assignee.id)}
                                    />
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {getInitials(assignee.full_name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm truncate">{assignee.full_name}</span>
                                  </label>
                                ))}
                              </div>
                            </ScrollArea>
                          ) : (
                            <p className="text-xs text-muted-foreground">No assignees found</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <ScrollArea className="h-[300px] sm:h-[480px]">
                    {sortedItemsForSelectedDate.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                        {sortedItemsForSelectedDate.map((item) => {
                          const assignees = getAssignees(item);
                          const canAddNotes = (isAdmin || isMember) && item.source === 'task';
                          
                          return (
                            <div
                              key={item.id}
                              onClick={() => canAddNotes && handleOpenNotes(item)}
                              className={cn(
                                'p-3 sm:p-5 rounded-xl bg-muted/30 border border-border/30 transition-all duration-200 hover:bg-muted/50',
                                item.priority === 'high' && 'border-l-4 border-l-destructive',
                                item.priority === 'medium' && 'border-l-4 border-l-yellow-500',
                                item.priority === 'low' && 'border-l-4 border-l-green-500',
                                canAddNotes && 'cursor-pointer hover:shadow-md'
                              )}
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                  <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{item.title}</h3>
                                  {canAddNotes && (
                                    <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                                  {item.source === 'task' && item.category && (
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        "text-[8px] sm:text-[10px] px-1 sm:px-1.5 hidden sm:flex",
                                        item.category === 'product' && "border-blue-500/50 text-blue-600 bg-blue-500/5",
                                        item.category === 'operational' && "border-orange-500/50 text-orange-600 bg-orange-500/5",
                                        item.category === 'strategic' && "border-purple-500/50 text-purple-600 bg-purple-500/5"
                                      )}
                                    >
                                      {getCategoryLabel(item.category)}
                                    </Badge>
                                  )}
                                  <Badge 
                                    variant="secondary" 
                                    className={cn(
                                      "text-[8px] sm:text-[10px] px-1 sm:px-1.5",
                                      item.source === 'checklist' && "bg-primary/10 text-primary"
                                    )}
                                  >
                                    {item.source === 'checklist' ? 'Personal' : 'Task'}
                                  </Badge>
                                </div>
                              </div>

                              {/* Description */}
                              {item.description && (
                                <div className="mb-3">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                    <FileText className="w-3 h-3" />
                                    <span>Description</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground line-clamp-3">
                                    {item.description}
                                  </p>
                                </div>
                              )}

                              {/* Project */}
                              {item.project && (
                                <div className="mb-3">
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Project:</span> {item.project.title}
                                  </p>
                                </div>
                              )}

                              {/* Assignees */}
                              {assignees.length > 0 && (
                                <div className="mb-3">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                                    <User className="w-3 h-3" />
                                    <span>Assignees</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {assignees.map((assignee) => (
                                      <div key={assignee.id} className="flex items-center gap-2 bg-background/50 rounded-full px-2 py-1">
                                        <Avatar className="h-5 w-5">
                                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                            {getInitials(assignee.full_name)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-foreground">{assignee.full_name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Created By */}
                              {item.created_by_user && (
                                <div className="mb-3">
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Created by:</span> {item.created_by_user.full_name}
                                  </p>
                                </div>
                              )}

                              {/* Attachment */}
                              {item.attachment_name && (
                                <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Paperclip className="w-3 h-3" />
                                  <span>{item.attachment_name}</span>
                                </div>
                              )}

                              {/* Footer with badges */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px]",
                                    item.priority === 'high' && "border-destructive text-destructive",
                                    item.priority === 'medium' && "border-yellow-500 text-yellow-500",
                                    item.priority === 'low' && "border-green-500 text-green-500"
                                  )}
                                >
                                  {item.priority} priority
                                </Badge>
                                {item.subcategory && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {item.subcategory}
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                                  <Clock className="w-3 h-3" />
                                  <span>Created {format(parseISO(item.created_at), 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                          <CalendarDays className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No deadlines on this date</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
          </main>
        </div>
    
        <SideNavigation />
      </div>

      {/* Task Notes Dialog */}
      {selectedTaskForNotes && (
        <TaskNotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          taskId={selectedTaskForNotes.id}
          taskTitle={selectedTaskForNotes.title}
        />
      )}
      
      <BetaFooter />
    </div>
  );
};

export default Calendar;
