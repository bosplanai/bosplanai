import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { differenceInDays, parseISO, isAfter, isBefore, addDays, startOfDay } from "date-fns";

interface TeamMemberWorkload {
  id: string;
  full_name: string;
  job_role: string;
  todoTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  highPriorityTasks: number;
  overdueTasks: number;
  weeklyHours: number;
  estimatedWorkload: number; // percentage
  avgCompletionTime: number; // days
}

interface TaskWithRisk {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  project_id: string | null;
  project_title: string | null;
  category: string | null;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskReason: string;
  predictedCompletionDays: number;
}

interface WorkingHours {
  user_id: string;
  monday_hours: number;
  tuesday_hours: number;
  wednesday_hours: number;
  thursday_hours: number;
  friday_hours: number;
  saturday_hours: number;
  sunday_hours: number;
}

export interface Alert {
  id: string;
  type: "overdue" | "at-risk" | "overload" | "near-capacity" | "unassigned" | "on-track" | "workload-summary";
  severity: "info" | "success" | "warning" | "critical";
  message: string;
  details?: string;
  taskId?: string;
  userId?: string;
  category: "live-overview" | "tasks-at-risk" | "capacity" | "on-track";
}

export interface WorkloadSummary {
  totalTeamMembers: number;
  totalCapacity: number; // aggregate weekly hours
  totalAssignedTasks: number;
  averageWorkload: number; // percentage
  membersAtCapacity: number;
  membersNearCapacity: number;
  membersUnderCapacity: number;
}

export const useTaskFlowData = () => {
  const [teamWorkloads, setTeamWorkloads] = useState<TeamMemberWorkload[]>([]);
  const [prioritizedTasks, setPrioritizedTasks] = useState<TaskWithRisk[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [workloadSummary, setWorkloadSummary] = useState<WorkloadSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const { user } = useAuth();

  const calculateRiskLevel = useCallback((
    task: any,
    avgCompletionTime: number,
    assignedUserWorkload?: TeamMemberWorkload
  ): { level: "low" | "medium" | "high" | "critical"; reason: string } => {
    const now = startOfDay(new Date());
    
    // Check if overdue
    if (task.due_date) {
      const dueDate = startOfDay(parseISO(task.due_date));
      if (isBefore(dueDate, now) && task.status !== "complete") {
        return { level: "critical", reason: "Task is overdue" };
      }
      
      const daysUntilDue = differenceInDays(dueDate, now);
      
      // Task still in To Do one day before deadline
      if (daysUntilDue <= 1 && task.status === "todo") {
        return { level: "critical", reason: "Due tomorrow but still in To Do" };
      }
      
      // Check if assigned user has 3+ To Do tasks 2 days before deadline
      if (daysUntilDue <= 2 && assignedUserWorkload && assignedUserWorkload.todoTasks >= 3) {
        return { level: "high", reason: `Assignee has ${assignedUserWorkload.todoTasks} pending tasks before deadline` };
      }
      
      // If predicted completion time exceeds days until due
      if (daysUntilDue < avgCompletionTime) {
        return { level: "high", reason: "May not complete before deadline" };
      }
      
      if (daysUntilDue <= 2) {
        return { level: "medium", reason: "Due within 2 days" };
      }
    }
    
    // High priority without assignment (exclude operational/strategic as they are self-assigned by design)
    if (task.priority === "high" && !task.assigned_user_id && 
        task.category !== "operational" && task.category !== "strategic") {
      return { level: "high", reason: "High priority task unassigned" };
    }
    
    // Task age check
    const taskAge = differenceInDays(now, parseISO(task.created_at));
    if (taskAge > 14 && task.status === "todo") {
      return { level: "medium", reason: "Task pending for over 2 weeks" };
    }
    
    if (task.priority === "high") {
      return { level: "medium", reason: "High priority task" };
    }
    
    return { level: "low", reason: "On track" };
  }, []);

  const fetchData = useCallback(async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    
    try {
      // Fetch team members
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", organization.id);
      
      if (!roles?.length) {
        setLoading(false);
        return;
      }
      
      const userIds = roles.map(r => r.user_id);
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, job_role")
        .in("id", userIds);
      
      // Fetch all tasks for the organization
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          created_at,
          completed_at,
          assigned_user_id,
          project_id,
          category,
          assigned_user:profiles!tasks_assigned_user_id_fkey(id, full_name)
        `)
        .eq("organization_id", organization.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      
      // Gracefully handle missing table/relationship errors
      if (tasksError) {
        const ignoredCodes = ['PGRST205', 'PGRST200'];
        if (!ignoredCodes.includes(tasksError?.code)) {
          throw tasksError;
        }
      }
      
      // Fetch task assignments for multi-user support
      const { data: assignments } = await supabase
        .from("task_assignments")
        .select("task_id, user_id");
      
      // Fetch working hours
      const { data: hours } = await supabase
        .from("team_working_hours")
        .select("*")
        .eq("organization_id", organization.id);
      
      setWorkingHours(hours || []);
      
      // Calculate average completion time from historical data
      const completedTasks = tasks?.filter(t => t.status === "complete" && t.completed_at) || [];
      let avgCompletionTime = 3; // default 3 days
      if (completedTasks.length > 0) {
        const totalDays = completedTasks.reduce((sum, t) => {
          const created = parseISO(t.created_at);
          const completed = parseISO(t.completed_at!);
          return sum + Math.max(1, differenceInDays(completed, created));
        }, 0);
        avgCompletionTime = totalDays / completedTasks.length;
      }
      
      // Build workload data per team member
      const workloadMap: Record<string, TeamMemberWorkload> = {};
      
      profiles?.forEach(profile => {
        const userHours = hours?.find(h => h.user_id === profile.id);
        const weeklyHours = userHours
          ? Number(userHours.monday_hours || 0) + Number(userHours.tuesday_hours || 0) + 
            Number(userHours.wednesday_hours || 0) + Number(userHours.thursday_hours || 0) + 
            Number(userHours.friday_hours || 0) + Number(userHours.saturday_hours || 0) + 
            Number(userHours.sunday_hours || 0)
          : 40;
        
        workloadMap[profile.id] = {
          id: profile.id,
          full_name: profile.full_name,
          job_role: profile.job_role,
          todoTasks: 0,
          inProgressTasks: 0,
          completedTasks: 0,
          highPriorityTasks: 0,
          overdueTasks: 0,
          weeklyHours,
          estimatedWorkload: 0,
          avgCompletionTime,
        };
      });
      
      // Count tasks per user
      const now = new Date();
      tasks?.forEach(task => {
        // Get all assigned users (direct + multi-assignment)
        const assignedUsers: string[] = [];
        if (task.assigned_user_id) {
          assignedUsers.push(task.assigned_user_id);
        }
        assignments?.filter(a => a.task_id === task.id).forEach(a => {
          if (!assignedUsers.includes(a.user_id)) {
            assignedUsers.push(a.user_id);
          }
        });
        
        assignedUsers.forEach(userId => {
          if (workloadMap[userId]) {
            if (task.status === "complete") {
              workloadMap[userId].completedTasks++;
            } else if (task.status === "in-progress") {
              workloadMap[userId].inProgressTasks++;
              if (task.priority === "high") {
                workloadMap[userId].highPriorityTasks++;
              }
              if (task.due_date && isBefore(parseISO(task.due_date), now)) {
                workloadMap[userId].overdueTasks++;
              }
            } else {
              workloadMap[userId].todoTasks++;
              if (task.priority === "high") {
                workloadMap[userId].highPriorityTasks++;
              }
              if (task.due_date && isBefore(parseISO(task.due_date), now)) {
                workloadMap[userId].overdueTasks++;
              }
            }
          }
        });
      });
      
      // Calculate workload percentage (tasks * avg completion time / weekly hours)
      Object.values(workloadMap).forEach(wl => {
        const activeTasks = wl.todoTasks + wl.inProgressTasks;
        const hoursNeeded = activeTasks * avgCompletionTime * 2; // 2 hours per day per task estimate
        wl.estimatedWorkload = wl.weeklyHours > 0 
          ? Math.min(150, Math.round((hoursNeeded / wl.weeklyHours) * 100))
          : 0;
      });
      
      const workloads = Object.values(workloadMap);
      setTeamWorkloads(workloads);
      
      // Calculate workload summary
      const totalCapacity = workloads.reduce((sum, wl) => sum + wl.weeklyHours, 0);
      const totalAssignedTasks = workloads.reduce((sum, wl) => sum + wl.todoTasks + wl.inProgressTasks, 0);
      const averageWorkload = workloads.length > 0 
        ? Math.round(workloads.reduce((sum, wl) => sum + wl.estimatedWorkload, 0) / workloads.length)
        : 0;
      const membersAtCapacity = workloads.filter(wl => wl.estimatedWorkload >= 100).length;
      const membersNearCapacity = workloads.filter(wl => wl.estimatedWorkload >= 80 && wl.estimatedWorkload < 100).length;
      const membersUnderCapacity = workloads.filter(wl => wl.estimatedWorkload < 80).length;
      
      setWorkloadSummary({
        totalTeamMembers: workloads.length,
        totalCapacity,
        totalAssignedTasks,
        averageWorkload,
        membersAtCapacity,
        membersNearCapacity,
        membersUnderCapacity,
      });
      
      // Build prioritized task list with risk levels
      const tasksWithRisk: TaskWithRisk[] = (tasks?.filter(t => t.status !== "complete") || [])
        .map(task => {
          const assigneeWorkload = task.assigned_user_id ? workloadMap[task.assigned_user_id] : undefined;
          const risk = calculateRiskLevel(task, avgCompletionTime, assigneeWorkload);
          return {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            due_date: task.due_date,
            created_at: task.created_at,
            completed_at: task.completed_at,
            assigned_user_id: task.assigned_user_id,
            assigned_user_name: (task.assigned_user as any)?.full_name || null,
            project_id: task.project_id,
            project_title: null, // Projects table not yet available
            category: task.category,
            riskLevel: risk.level,
            riskReason: risk.reason,
            predictedCompletionDays: avgCompletionTime,
          };
        })
        .sort((a, b) => {
          // Sort by risk level, then priority, then due date
          const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          
          if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
            return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
          }
          if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
            return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
          }
          if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          }
          return 0;
        });
      
      setPrioritizedTasks(tasksWithRisk);
      
      // Generate alerts
      const newAlerts: Alert[] = [];
      
      // === LIVE WORKLOAD OVERVIEW ===
      newAlerts.push({
        id: "workload-summary",
        type: "workload-summary",
        severity: "info",
        category: "live-overview",
        message: "Team Capacity Overview",
        details: `${workloads.length} members | ${totalAssignedTasks} active tasks | ${averageWorkload}% avg workload`,
      });
      
      // === TASKS AT RISK OF DELAY ===
      // 1. Overdue tasks
      tasksWithRisk
        .filter(t => t.due_date && isBefore(parseISO(t.due_date), startOfDay(now)) && t.status !== "complete")
        .forEach(task => {
          const daysOverdue = differenceInDays(now, parseISO(task.due_date!));
          newAlerts.push({
            id: `overdue-${task.id}`,
            type: "overdue",
            severity: "critical",
            category: "tasks-at-risk",
            message: `"${task.title}" is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
            details: task.assigned_user_name ? `Assigned to ${task.assigned_user_name}` : "Unassigned",
            taskId: task.id,
          });
        });
      
      // 2. Tasks still in To Do one day before deadline
      tasksWithRisk
        .filter(t => {
          if (!t.due_date || t.status !== "todo") return false;
          const daysUntilDue = differenceInDays(parseISO(t.due_date), startOfDay(now));
          return daysUntilDue === 1;
        })
        .forEach(task => {
          newAlerts.push({
            id: `due-tomorrow-${task.id}`,
            type: "at-risk",
            severity: "critical",
            category: "tasks-at-risk",
            message: `"${task.title}" is due tomorrow but still in To Do`,
            details: task.assigned_user_name ? `Assigned to ${task.assigned_user_name}` : "Unassigned",
            taskId: task.id,
          });
        });
      
      // 3. Tasks assigned to overloaded team members (3+ To Do tasks 2 days before deadline)
      tasksWithRisk
        .filter(t => {
          if (!t.due_date || !t.assigned_user_id) return false;
          const daysUntilDue = differenceInDays(parseISO(t.due_date), startOfDay(now));
          const assigneeWorkload = workloadMap[t.assigned_user_id];
          return daysUntilDue <= 2 && daysUntilDue > 0 && assigneeWorkload && assigneeWorkload.todoTasks >= 3;
        })
        .forEach(task => {
          const assigneeWorkload = workloadMap[task.assigned_user_id!];
          newAlerts.push({
            id: `overloaded-assignee-${task.id}`,
            type: "at-risk",
            severity: "warning",
            category: "tasks-at-risk",
            message: `"${task.title}" at risk - assignee has heavy workload`,
            details: `${task.assigned_user_name} has ${assigneeWorkload.todoTasks} tasks pending`,
            taskId: task.id,
            userId: task.assigned_user_id!,
          });
        });
      
      // Unassigned high priority alerts (exclude operational/strategic as they are self-assigned by design)
      tasksWithRisk
        .filter(t => t.priority === "high" && !t.assigned_user_id && 
                     t.category !== "operational" && t.category !== "strategic")
        .forEach(task => {
          newAlerts.push({
            id: `unassigned-${task.id}`,
            type: "unassigned",
            severity: "warning",
            category: "tasks-at-risk",
            message: `High priority task "${task.title}" is unassigned`,
            taskId: task.id,
          });
        });
      
      // === TEAM MEMBERS AT/NEAR CAPACITY ===
      workloads.filter(wl => wl.estimatedWorkload >= 100).forEach(member => {
        newAlerts.push({
          id: `overload-${member.id}`,
          type: "overload",
          severity: member.estimatedWorkload > 120 ? "critical" : "warning",
          category: "capacity",
          message: `${member.full_name} is at full capacity`,
          details: `${member.estimatedWorkload}% workload | ${member.todoTasks + member.inProgressTasks} active tasks`,
          userId: member.id,
        });
      });
      
      workloads.filter(wl => wl.estimatedWorkload >= 80 && wl.estimatedWorkload < 100).forEach(member => {
        newAlerts.push({
          id: `near-capacity-${member.id}`,
          type: "near-capacity",
          severity: "warning",
          category: "capacity",
          message: `${member.full_name} is approaching capacity`,
          details: `${member.estimatedWorkload}% workload | ${member.todoTasks + member.inProgressTasks} active tasks`,
          userId: member.id,
        });
      });
      
      // === TASKS ON TRACK ===
      const inProgressOnTrack = tasksWithRisk.filter(t => 
        t.status === "in-progress" && t.riskLevel === "low"
      );
      
      if (inProgressOnTrack.length > 0) {
        newAlerts.push({
          id: "on-track-summary",
          type: "on-track",
          severity: "success",
          category: "on-track",
          message: `${inProgressOnTrack.length} task${inProgressOnTrack.length !== 1 ? 's' : ''} progressing on schedule`,
          details: inProgressOnTrack.slice(0, 3).map(t => t.title).join(", ") + (inProgressOnTrack.length > 3 ? ` +${inProgressOnTrack.length - 3} more` : ""),
        });
      }
      
      // Add individual on-track tasks with due dates coming up (positive reinforcement)
      tasksWithRisk
        .filter(t => {
          if (!t.due_date || t.riskLevel !== "low" || t.status !== "in-progress") return false;
          const daysUntilDue = differenceInDays(parseISO(t.due_date), startOfDay(now));
          return daysUntilDue >= 2 && daysUntilDue <= 7;
        })
        .slice(0, 3)
        .forEach(task => {
          const daysUntilDue = differenceInDays(parseISO(task.due_date!), startOfDay(now));
          newAlerts.push({
            id: `on-track-${task.id}`,
            type: "on-track",
            severity: "success",
            category: "on-track",
            message: `"${task.title}" is on track`,
            details: `Due in ${daysUntilDue} days${task.assigned_user_name ? ` • ${task.assigned_user_name}` : ""}`,
            taskId: task.id,
          });
        });
      
      setAlerts(newAlerts);
      
    } catch (error: any) {
      // Silently handle missing table/relationship errors for new organizations
      // PGRST205 = missing table, PGRST200 = missing relationship
      const ignoredCodes = ['PGRST205', 'PGRST200'];
      if (!ignoredCodes.includes(error?.code)) {
        console.error("Error fetching TaskFlow data:", error);
      }
    } finally {
      setLoading(false);
    }
  }, [organization?.id, calculateRiskLevel]);

  const updateWorkingHours = async (
    userId: string,
    hours: Partial<WorkingHours>
  ) => {
    if (!organization?.id) return;
    
    const { error } = await supabase
      .from("team_working_hours")
      .upsert({
        organization_id: organization.id,
        user_id: userId,
        ...hours,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "organization_id,user_id",
      });
    
    if (error) throw error;
    await fetchData();
  };

  const reassignTask = async (taskId: string, newUserId: string | null) => {
    if (newUserId) {
      // Use the SECURITY DEFINER RPC for reassignment - this sets assignment_status to 'pending',
      // clears decline_reason and last_reminder_sent_at, and triggers the notification
      const { error } = await supabase.rpc("reassign_task", {
        p_task_id: taskId,
        p_new_assignee_id: newUserId,
      });
      
      if (error) throw error;
    } else {
      // Unassigning - direct update is fine, set to 'accepted' since there's no pending request
      const { error } = await supabase
        .from("tasks")
        .update({ 
          assigned_user_id: null,
          assignment_status: 'accepted',
          decline_reason: null,
          last_reminder_sent_at: null,
        })
        .eq("id", taskId);
      
      if (error) throw error;

      // Clean up task_assignments so visibility filters work correctly on refetch
      await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId);
    }
    
    await fetchData();
  };

  useEffect(() => {
    if (organization?.id && user) {
      fetchData();
    }
  }, [organization?.id, user, fetchData]);

  const clearAlerts = () => {
    setAlerts([]);
  };

  return {
    teamWorkloads,
    prioritizedTasks,
    alerts,
    workingHours,
    workloadSummary,
    loading,
    fetchData,
    updateWorkingHours,
    reassignTask,
    clearAlerts,
  };
};
