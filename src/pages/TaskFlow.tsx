import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Activity, RefreshCw, ArrowLeft, Users, ListTodo, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import MobileHeaderMenu from "@/components/MobileHeaderMenu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SideNavigation from "@/components/SideNavigation";
import BetaFooter from "@/components/BetaFooter";
import { WorkloadHeatmap } from "@/components/taskflow/WorkloadHeatmap";
import { PrioritizedTaskList } from "@/components/taskflow/PrioritizedTaskList";

import { WorkingHoursDialog } from "@/components/taskflow/WorkingHoursDialog";
import { TaskReassignDialog } from "@/components/taskflow/TaskReassignDialog";
import { AlertDetailDialog } from "@/components/taskflow/AlertDetailDialog";
import { useTaskFlowData, type Alert } from "@/hooks/useTaskFlowData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "default" | "warning" | "danger" | "success";
}

const StatCard = ({ title, value, subtitle, icon, variant = "default" }: StatCardProps) => {
  const variantStyles = {
    default: "bg-card border-border",
    warning: "bg-brand-orange/5 border-brand-orange/20",
    danger: "bg-destructive/5 border-destructive/20",
    success: "bg-brand-green/5 border-brand-green/20",
  };
  
  const iconStyles = {
    default: "bg-muted text-muted-foreground",
    warning: "bg-brand-orange/10 text-brand-orange",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-brand-green/10 text-brand-green",
  };

  return (
    <div className={cn("rounded-xl border p-3 sm:p-4 transition-all hover:shadow-sm", variantStyles[variant])}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</p>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0", iconStyles[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
};

const TaskFlow = () => {
  const { navigate } = useOrgNavigation();
  const { toast } = useToast();
  const {
    teamWorkloads,
    prioritizedTasks,
    alerts,
    workingHours,
    loading,
    fetchData,
    updateWorkingHours,
    reassignTask,
  } = useTaskFlowData();

  const [selectedMember, setSelectedMember] = useState<{ id: string; full_name: string } | null>(null);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string; assigned_user_id: string | null } | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  const handleMemberClick = (memberId: string) => {
    const member = teamWorkloads.find(m => m.id === memberId);
    if (member) {
      setSelectedMember({ id: member.id, full_name: member.full_name });
      setHoursDialogOpen(true);
    }
  };

  const handleTaskReassign = (taskId: string) => {
    const task = prioritizedTasks.find(t => t.id === taskId);
    if (task) {
      setSelectedTask({
        id: task.id,
        title: task.title,
        assigned_user_id: task.assigned_user_id,
      });
      setReassignDialogOpen(true);
    }
  };

  const handleAlertClick = (alert: Alert) => {
    setSelectedAlert(alert);
    setAlertDialogOpen(true);
  };

  const handleAlertAction = (alert: Alert) => {
    if (alert.taskId) {
      const task = prioritizedTasks.find(t => t.id === alert.taskId);
      if (task) {
        setSelectedTask({
          id: task.id,
          title: task.title,
          assigned_user_id: task.assigned_user_id,
        });
        setReassignDialogOpen(true);
      }
    } else if (alert.userId) {
      const member = teamWorkloads.find(m => m.id === alert.userId);
      if (member) {
        setSelectedMember({ id: member.id, full_name: member.full_name });
        setHoursDialogOpen(true);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({ title: "Data refreshed" });
  };

  const currentMemberHours = selectedMember 
    ? workingHours.find(h => h.user_id === selectedMember.id)
    : undefined;

  // Calculate stats
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  const overloadedCount = teamWorkloads.filter(m => m.estimatedWorkload > 100).length;
  const totalPending = prioritizedTasks.length;
  const highPriorityCount = prioritizedTasks.filter(t => t.priority === "high").length;
  const avgWorkload = teamWorkloads.length > 0 
    ? Math.round(teamWorkloads.reduce((sum, m) => sum + m.estimatedWorkload, 0) / teamWorkloads.length)
    : 0;

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
                onClick={() => navigate("/")}
                className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-teal to-brand-teal/70 flex items-center justify-center shadow-sm">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground">TaskFlow Manager</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Monitor team capacity, predict completion & allocate efficiently</p>
                </div>
              </div>
            </div>

            {/* Desktop: All controls */}
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <OrganizationSwitcher />
              <NotificationBell />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
            {/* Mobile: Notification + Burger menu */}
            <div className="flex md:hidden items-center gap-1.5 self-end">
              <NotificationBell />
              <MobileHeaderMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {loading ? (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-20 sm:h-24 rounded-xl" />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-[300px] sm:h-[400px] rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <StatCard
                  title="Team Members"
                  value={teamWorkloads.length}
                  subtitle={`${avgWorkload}% avg workload`}
                  icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}
                  variant={overloadedCount > 0 ? "warning" : "default"}
                />
                <StatCard
                  title="Pending Tasks"
                  value={totalPending}
                  subtitle={`${highPriorityCount} high priority`}
                  icon={<ListTodo className="w-4 h-4 sm:w-5 sm:h-5" />}
                  variant={highPriorityCount > 5 ? "warning" : "default"}
                />
                <StatCard
                  title="Critical Alerts"
                  value={criticalCount}
                  subtitle={`${warningCount} warnings`}
                  icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
                  variant={criticalCount > 0 ? "danger" : "success"}
                />
                <StatCard
                  title="Team Health"
                  value={overloadedCount === 0 ? "Good" : `${overloadedCount} Overloaded`}
                  subtitle={overloadedCount === 0 ? "All members balanced" : "Needs attention"}
                  icon={overloadedCount === 0 ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                  variant={overloadedCount === 0 ? "success" : "danger"}
                />
              </div>

              {/* Tabs for mobile-friendly navigation */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="lg:hidden">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="capacity" className="text-xs">
                    <Users className="w-4 h-4 mr-1.5" />
                    Capacity
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs">
                    <ListTodo className="w-4 h-4 mr-1.5" />
                    Tasks
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="capacity" className="mt-4">
                  <WorkloadHeatmap
                    workloads={teamWorkloads}
                    onMemberClick={handleMemberClick}
                  />
                </TabsContent>
                
                <TabsContent value="tasks" className="mt-4">
                  <PrioritizedTaskList
                    tasks={prioritizedTasks}
                    onReassign={handleTaskReassign}
                  />
                </TabsContent>
              </Tabs>

              {/* Desktop Grid Layout */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-6">
                {/* Left Column - Team Capacity */}
                <div className="lg:col-span-5">
                  <WorkloadHeatmap
                    workloads={teamWorkloads}
                    onMemberClick={handleMemberClick}
                  />
                </div>
                
                {/* Right Column - Prioritized Tasks */}
                <div className="lg:col-span-7">
                  <PrioritizedTaskList
                    tasks={prioritizedTasks}
                    onReassign={handleTaskReassign}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
        </div>
      
        <SideNavigation />
      </div>
      <BetaFooter />
      
      {/* Dialogs */}
      <WorkingHoursDialog
        open={hoursDialogOpen}
        onOpenChange={setHoursDialogOpen}
        member={selectedMember}
        currentHours={currentMemberHours as any}
        onSave={updateWorkingHours}
      />
      
      <TaskReassignDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        task={selectedTask}
        teamMembers={teamWorkloads}
        onReassign={reassignTask}
      />

      <AlertDetailDialog
        open={alertDialogOpen}
        onOpenChange={setAlertDialogOpen}
        alert={selectedAlert}
        onTakeAction={handleAlertAction}
      />
    </div>
  );
};

export default TaskFlow;
