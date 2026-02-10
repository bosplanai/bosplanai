import { useState, useMemo } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { ArrowLeft, Download, Calendar as CalendarIcon, Check, X, Paperclip, AlertCircle, History, Wand2 } from "lucide-react";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SideNavigation from "@/components/SideNavigation";
import BetaFooter from "@/components/BetaFooter";
import { NotificationBell } from "@/components/NotificationBell";
import MobileHeaderMenu from "@/components/MobileHeaderMenu";
import HeaderLogo from "@/components/HeaderLogo";
import ActionBar from "@/components/ActionBar";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
interface TaskToMerge {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  project_id: string | null;
  project_title?: string;
  attachment_name: string | null;
  selected: boolean;
}
const MagicMergeTool = () => {
  const { navigate } = useOrgNavigation();
  const queryClient = useQueryClient();
  const {
    members,
    loading: membersLoading
  } = useTeamMembers();
  const {
    organization
  } = useOrganization();
  const [mergeType, setMergeType] = useState<"temporary" | "permanent">("temporary");
  const [sourceUserId, setSourceUserId] = useState<string>("");
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});
  const [isMerging, setIsMerging] = useState(false);

  // Fetch tasks for the source user
  const {
    data: sourceTasks = [],
    isLoading: tasksLoading
  } = useQuery({
    queryKey: ["merge-tasks", sourceUserId, organization?.id],
    queryFn: async () => {
      if (!sourceUserId || !organization?.id) return [];

      // Get tasks where user is assigned via task_assignments
      const {
        data: assignments,
        error: assignError
      } = await supabase.from("task_assignments").select("task_id").eq("user_id", sourceUserId);
      if (assignError) throw assignError;
      const taskIdsFromAssignments = assignments?.map(a => a.task_id) || [];

      // Also get tasks where user is assigned directly via assigned_user_id
      const {
        data: directTasks,
        error: directError
      } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          created_at,
          project_id,
          attachment_name
        `)
        .eq("organization_id", organization.id)
        .eq("assigned_user_id", sourceUserId)
        .eq("status", "todo")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      
      if (directError) throw directError;

      // Get tasks from task_assignments if any exist
      let assignmentTasks: typeof directTasks = [];
      if (taskIdsFromAssignments.length > 0) {
        const { data: tasksFromAssignments, error: tasksError } = await supabase
          .from("tasks")
          .select(`
            id,
            title,
            description,
            status,
            priority,
            due_date,
            created_at,
            project_id,
            attachment_name
          `)
          .in("id", taskIdsFromAssignments)
          .eq("organization_id", organization.id)
          .eq("status", "todo")
          .is("deleted_at", null)
          .order("created_at", { ascending: false });
        
        if (tasksError) throw tasksError;
        assignmentTasks = tasksFromAssignments || [];
      }

      // Merge and deduplicate tasks
      const allTasks = [...(directTasks || []), ...assignmentTasks];
      const uniqueTasks = allTasks.reduce((acc, task) => {
        if (!acc.find(t => t.id === task.id)) {
          acc.push(task);
        }
        return acc;
      }, [] as typeof allTasks);

      if (uniqueTasks.length === 0) return [];

      // Fetch project titles
      const projectIds = uniqueTasks.filter(t => t.project_id).map(t => t.project_id) || [];
      let projectMap: Record<string, string> = {};
      if (projectIds.length > 0) {
        const {
          data: projects
        } = await supabase.from("projects").select("id, title").in("id", projectIds as string[]);
        projectMap = (projects || []).reduce((acc, p) => {
          acc[p.id] = p.title;
          return acc;
        }, {} as Record<string, string>);
      }
      return uniqueTasks.map(t => ({
        ...t,
        project_title: t.project_id ? projectMap[t.project_id] : undefined,
        selected: true
      }));
    },
    enabled: !!sourceUserId && !!organization?.id
  });

  // Initialize selected tasks when source tasks load
  useMemo(() => {
    if (sourceTasks.length > 0 && Object.keys(selectedTasks).length === 0) {
      const initial: Record<string, boolean> = {};
      sourceTasks.forEach(t => {
        initial[t.id] = true;
      });
      setSelectedTasks(initial);
    }
  }, [sourceTasks]);

  // Reset selections when source user changes
  const handleSourceChange = (userId: string) => {
    setSourceUserId(userId);
    setSelectedTasks({});
  };
  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };
  const removeTask = (taskId: string) => {
    setSelectedTasks(prev => ({
      ...prev,
      [taskId]: false
    }));
  };
  const selectedTaskCount = Object.values(selectedTasks).filter(Boolean).length;
  const tasksToTransfer = sourceTasks.filter(t => selectedTasks[t.id]);
  const sourceUser = members.find(m => m.user_id === sourceUserId);
  const targetUser = members.find(m => m.user_id === targetUserId);

  // Perform the merge
  const mergeMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id || !sourceUserId || !targetUserId) {
        throw new Error("Missing required data");
      }
      if (tasksToTransfer.length === 0) {
        throw new Error("No tasks selected for transfer");
      }
      if (mergeType === "temporary" && !startDate) {
        throw new Error("Please select a start date for temporary merge");
      }
      if (mergeType === "temporary" && !endDate) {
        throw new Error("Please select an end date for temporary merge");
      }
      if (mergeType === "temporary" && startDate && endDate && startDate >= endDate) {
        throw new Error("Start date must be before end date");
      }

      // Get current user
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const taskIds = tasksToTransfer.map(t => t.id);

      // Start transaction-like operations
      // 1. Update task_assignments: remove source user, add target user
      for (const taskId of taskIds) {
        // Remove source user assignment
        const { error: deleteError } = await supabase.from("task_assignments").delete().eq("task_id", taskId).eq("user_id", sourceUserId);
        if (deleteError) {
          console.error("Merge: delete assignment failed", deleteError);
          throw new Error(`Failed to remove source assignment: ${deleteError.message}`);
        }

        // Check if target already assigned
        const { data: existing } = await supabase
          .from("task_assignments")
          .select("id")
          .eq("task_id", taskId)
          .eq("user_id", targetUserId)
          .maybeSingle();
          
        if (!existing) {
          // Add target user assignment
          const { error: insertError } = await supabase.from("task_assignments").insert({
            task_id: taskId,
            user_id: targetUserId,
            assigned_by: user.id,
            assignment_status: 'accepted'
          });
          if (insertError) {
            console.error("Merge: insert assignment failed", insertError);
            throw new Error(`Failed to create target assignment: ${insertError.message}`);
          }
        }

        // Use SECURITY DEFINER function to bypass RLS for merge reassignment
        const { error: rpcError } = await supabase.rpc("magic_merge_reassign_task", {
          _task_id: taskId,
          _new_user_id: targetUserId,
        });
        if (rpcError) {
          console.error("Merge: RPC reassign failed", rpcError);
          throw new Error(`Failed to reassign task: ${rpcError.message}`);
        }
      }

      // Get user names for notifications
      const sourceMember = members.find(m => m.user_id === sourceUserId);
      const targetMember = members.find(m => m.user_id === targetUserId);
      const sourceName = sourceMember?.full_name || "A team member";
      const targetName = targetMember?.full_name || "A team member";
      const mergeLabel = mergeType === "temporary" ? "temporarily transferred" : "permanently transferred";

      // Notify departing user (source) and receiving user (target)
      // Wrapped in try-catch as notification RLS may block cross-user inserts
      if (organization?.id) {
        try {
          await supabase.from("notifications").insert([
            {
              user_id: sourceUserId,
              organization_id: organization.id,
              type: "task_merge",
              title: "Tasks Transferred",
              message: `${tasksToTransfer.length} task(s) have been ${mergeLabel} to ${targetName}.`,
            },
            {
              user_id: targetUserId,
              organization_id: organization.id,
              type: "task_merge",
              title: "Tasks Received",
              message: `${tasksToTransfer.length} task(s) have been ${mergeLabel} to you from ${sourceName}.`,
            },
          ]);
        } catch {
          // Non-critical: merge still proceeds if notifications fail
          console.warn("Could not send merge notifications");
        }
      }

      // 2. Create audit log
      const {
        data: logData,
        error: logError
      } = await supabase.from("task_merge_logs").insert({
        organization_id: organization.id,
        performed_by: user.id,
        source_user_id: sourceUserId,
        target_user_id: targetUserId,
        merge_type: mergeType,
        temporary_start_date: mergeType === "temporary" ? startDate?.toISOString().split("T")[0] : null,
        temporary_end_date: mergeType === "temporary" ? endDate?.toISOString().split("T")[0] : null,
        tasks_transferred: tasksToTransfer.map(t => ({
          id: t.id,
          title: t.title,
          due_date: t.due_date,
          priority: t.priority,
          project_title: t.project_title
        })),
        task_count: tasksToTransfer.length,
        completed_at: new Date().toISOString(),
        status: mergeType === "temporary" ? "pending_revert" : "completed"
      }).select().single();
      if (logError) throw logError;
      return logData;
    },
    onSuccess: data => {
      toast.success(`Successfully transferred ${tasksToTransfer.length} tasks`);
      queryClient.invalidateQueries({
        queryKey: ["merge-tasks"]
      });
      queryClient.invalidateQueries({
        queryKey: ["tasks"]
      });

      // Reset form
      setSourceUserId("");
      setTargetUserId("");
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedTasks({});
    },
    onError: error => {
      toast.error(error instanceof Error ? error.message : "Failed to merge tasks");
    }
  });
  const handleConfirmMerge = () => {
    if (!sourceUserId) {
      toast.error("Please select a source (departing) user");
      return;
    }
    if (!targetUserId) {
      toast.error("Please select a target (receiving) user");
      return;
    }
    if (sourceUserId === targetUserId) {
      toast.error("Source and target users must be different");
      return;
    }
    if (selectedTaskCount === 0) {
      toast.error("Please select at least one task to transfer");
      return;
    }
    if (mergeType === "temporary" && !startDate) {
      toast.error("Please select a start date for temporary merge");
      return;
    }
    if (mergeType === "temporary" && !endDate) {
      toast.error("Please select an end date for temporary merge");
      return;
    }
    if (mergeType === "temporary" && startDate && endDate && startDate >= endDate) {
      toast.error("Start date must be before end date");
      return;
    }
    mergeMutation.mutate();
  };
  const generateAuditDocument = () => {
    const doc = `
MAGIC MERGE TOOL - AUDIT LOG
=============================
Date: ${format(new Date(), "PPpp")}
Organization: ${organization?.name || "N/A"}

TRANSFER DETAILS
----------------
Transfer Type: ${mergeType === "permanent" ? "Permanent" : "Temporary"}
${mergeType === "temporary" && endDate ? `End Date: ${format(endDate, "PP")}` : ""}

Source (Departing) User: ${sourceUser?.full_name || "N/A"} (${sourceUser?.email || "N/A"})
Target (Receiving) User: ${targetUser?.full_name || "N/A"} (${targetUser?.email || "N/A"})

TASKS TRANSFERRED (${selectedTaskCount})
-----------------------------------------
${tasksToTransfer.map((t, i) => `
${i + 1}. ${t.title}
   Status: ${t.status}
   Priority: ${t.priority}
   Due Date: ${t.due_date ? format(new Date(t.due_date), "PP") : "Not set"}
   Project: ${t.project_title || "No project"}
   Created: ${format(new Date(t.created_at), "PP")}
   Has Attachments: ${t.attachment_name ? "Yes" : "No"}
`).join("")}

=============================
End of Audit Log
    `.trim();
    const blob = new Blob([doc], {
      type: "text/plain"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `merge-audit-${format(new Date(), "yyyy-MM-dd-HHmm")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, string> = {
      high: "bg-destructive/10 text-destructive border-destructive/20",
      medium: "bg-brand-orange/10 text-brand-orange border-brand-orange/20",
      low: "bg-brand-green/10 text-brand-green border-brand-green/20"
    };
    return variants[priority] || variants.medium;
  };
  return <div className="flex flex-col min-h-screen bg-background">
      <div className="flex flex-1">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border/60 bg-card/80 backdrop-blur-sm px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <HeaderLogo />
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-xl hover:bg-secondary/80 transition-all duration-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-green to-brand-green/70 flex items-center justify-center shadow-sm">
                  <Wand2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">Magic Merge Tool</h1>
              </div>
            </div>
            {/* Desktop: All controls */}
            <div className="hidden md:flex items-center gap-3">
              <OrganizationSwitcher />
              <NotificationBell />
              <Button variant="outline" onClick={() => navigate("/magic-merge/history")} className="gap-2 rounded-full border-brand-green hover:shadow-md transition-all duration-300">
                <History className="w-4 h-4" />
                View History
              </Button>
              <ActionBar />
            </div>
            {/* Mobile: Notification + Burger menu */}
            <div className="flex md:hidden items-center gap-1.5">
              <NotificationBell />
              <MobileHeaderMenu />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-card/50">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-brand-green/10 via-brand-teal/5 to-transparent rounded-2xl p-6 border border-brand-green/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-brand-green/20">
                  <History className="w-6 h-6 text-brand-green" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">Task Transfer Made Simple</h2>
                  <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                    Seamlessly transfer tasks permanently or temporarily to teammates during absences, ensuring nothing is missed and work keeps moving.
                  </p>
                </div>
              </div>
            </div>

            {/* Main Configuration Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Configuration */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Transfer Type */}
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 overflow-hidden">
                  <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-green text-white text-sm font-semibold">1</span>
                      <CardTitle className="text-base font-semibold">Choose Transfer Type</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <RadioGroup value={mergeType} onValueChange={v => setMergeType(v as "temporary" | "permanent")} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200", mergeType === "temporary" ? "border-brand-green bg-brand-green/5" : "border-border/60 hover:border-brand-green/50")}>
                        <RadioGroupItem value="temporary" id="temporary" />
                        <Label htmlFor="temporary" className="flex flex-col cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            
                            <span className="font-medium">Temporary Merge</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">Tasks return after end date</span>
                        </Label>
                      </div>
                      <div className={cn("flex items-center space-x-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200", mergeType === "permanent" ? "border-brand-green bg-brand-green/5" : "border-border/60 hover:border-brand-green/50")}>
                        <RadioGroupItem value="permanent" id="permanent" />
                        <Label htmlFor="permanent" className="flex flex-col cursor-pointer flex-1">
                          <div className="flex items-center gap-2">
                            
                            <span className="font-medium">Permanent Merge</span>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">Tasks transfer permanently</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Step 2: User Selection */}
                <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 overflow-hidden">
                  <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-green text-white text-sm font-semibold">2</span>
                      <CardTitle className="text-base font-semibold">Select Team Members</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-destructive/70" />
                          <Label className="text-sm font-medium">Source (departing)</Label>
                        </div>
                        <Select value={sourceUserId} onValueChange={handleSourceChange}>
                          <SelectTrigger className="rounded-xl border-border hover:border-brand-green/50 focus:border-brand-green transition-colors duration-200 h-11">
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.filter(m => m.user_id !== targetUserId).map(member => <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.full_name}
                                </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Tasks will be transferred from this user
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand-green" />
                          <Label className="text-sm font-medium">Target (receiving)</Label>
                        </div>
                        <Select value={targetUserId} onValueChange={setTargetUserId}>
                          <SelectTrigger className="rounded-xl border-border hover:border-brand-green/50 focus:border-brand-green transition-colors duration-200 h-11">
                            <SelectValue placeholder="Select a team member" />
                          </SelectTrigger>
                          <SelectContent>
                            {members.filter(m => m.user_id !== sourceUserId).map(member => <SelectItem key={member.user_id} value={member.user_id}>
                                  {member.full_name}
                                </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          This user will receive the tasks
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Date Range (for temporary) */}
                {mergeType === "temporary" && <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-green text-white text-sm font-semibold">3</span>
                        <CardTitle className="text-base font-semibold">Set Date Range</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Start Date */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl border-border hover:border-brand-green/50 transition-colors duration-200 h-11", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : "Select start date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar 
                                mode="single" 
                                selected={startDate} 
                                onSelect={setStartDate} 
                                disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))} 
                                initialFocus 
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                          <p className="text-xs text-muted-foreground">
                            When the task transfer becomes active
                          </p>
                        </div>

                        {/* End Date */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl border-border hover:border-brand-green/50 transition-colors duration-200 h-11", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : "Select end date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar 
                                mode="single" 
                                selected={endDate} 
                                onSelect={setEndDate} 
                                disabled={date => date < (startDate || new Date(new Date().setHours(0, 0, 0, 0)))} 
                                initialFocus 
                                className={cn("p-3 pointer-events-auto")}
                              />
                            </PopoverContent>
                          </Popover>
                          <p className="text-xs text-muted-foreground">
                            Tasks will revert to source user after this date
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>}
              </div>

              {/* Right Column - Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                  <Card className="shadow-sm border-border/60 overflow-hidden">
                    <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Transfer Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Type</span>
                          <Badge variant="outline" className={cn("rounded-full", mergeType === "temporary" ? "border-brand-green text-brand-green" : "border-muted-foreground")}>
                            {mergeType === "temporary" ? "Temporary" : "Permanent"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">From</span>
                          <span className="font-medium truncate max-w-[120px]">{sourceUser?.full_name || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">To</span>
                          <span className="font-medium truncate max-w-[120px]">{targetUser?.full_name || "—"}</span>
                        </div>
                        {mergeType === "temporary" && <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">From</span>
                              <span className="font-medium">{startDate ? format(startDate, "MMM d, yyyy") : "—"}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Until</span>
                              <span className="font-medium">{endDate ? format(endDate, "MMM d, yyyy") : "—"}</span>
                            </div>
                          </>}
                        <div className="pt-3 border-t border-border/60">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground text-sm">Tasks Selected</span>
                            <span className="text-2xl font-bold text-brand-green">{selectedTaskCount}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  {sourceUserId && tasksToTransfer.length > 0 && <Button variant="outline" onClick={generateAuditDocument} className="w-full gap-2 rounded-xl border-border hover:border-brand-green/50 transition-all duration-200">
                      <Download className="w-4 h-4" />
                      Download Audit Log
                    </Button>}
                </div>
              </div>
            </div>

            {/* Task Preview - Full Width */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 overflow-hidden">
              <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-teal text-white text-sm font-semibold">
                      {mergeType === "temporary" ? "4" : "3"}
                    </span>
                    <div>
                      <CardTitle className="text-base font-semibold">Preview Tasks to Transfer</CardTitle>
                      {sourceUser && <p className="text-sm text-muted-foreground mt-0.5">
                          Showing tasks from <span className="font-medium text-foreground">{sourceUser.full_name}</span>
                        </p>}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {!sourceUserId ? <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">No source user selected</p>
                    <p className="text-sm mt-1">Select a source user above to see their tasks</p>
                  </div> : tasksLoading ? <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <History className="w-8 h-8 opacity-50" />
                    </div>
                    <p>Loading tasks...</p>
                  </div> : sourceTasks.length === 0 ? <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-brand-green" />
                    </div>
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm mt-1">No active (to do) tasks found for this user</p>
                  </div> : <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                      <span className="text-sm text-muted-foreground">{sourceTasks.length} task{sourceTasks.length !== 1 ? "s" : ""} available</span>
                      <span className="text-sm font-medium text-brand-green">{selectedTaskCount} selected</span>
                    </div>
                    <div className="grid gap-3">
                      {sourceTasks.map(task => <div key={task.id} className={cn("border border-border/60 rounded-xl p-4 transition-all duration-200 bg-card hover:shadow-sm", selectedTasks[task.id] ? "ring-1 ring-brand-green/30" : "opacity-50")}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox checked={selectedTasks[task.id] ?? true} onCheckedChange={() => toggleTask(task.id)} className="mt-1" />
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{task.title}</span>
                                  <Badge variant="outline" className={getPriorityBadge(task.priority)}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                  </Badge>
                                  {task.project_title && <Badge variant="secondary" className="text-xs">
                                      {task.project_title}
                                    </Badge>}
                                </div>
                                {task.description && <p className="text-sm text-muted-foreground line-clamp-1">
                                    {task.description}
                                  </p>}
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Created: {format(new Date(task.created_at), "MMM d, yyyy")}</span>
                                  {task.due_date && <span className={cn(new Date(task.due_date) < new Date() && "text-destructive font-medium")}>
                                      Due: {format(new Date(task.due_date), "MMM d, yyyy")}
                                    </span>}
                                  {task.attachment_name && <span className="flex items-center gap-1">
                                      <Paperclip className="w-3 h-3" />
                                      Attachment
                                    </span>}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeTask(task.id)} className="text-muted-foreground hover:text-destructive rounded-lg h-8 w-8">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>)}
                    </div>
                  </div>}
              </CardContent>
            </Card>

            {/* Confirm Action - Sticky Bottom Bar */}
            {sourceUserId && targetUserId && selectedTaskCount > 0 && <div className="sticky bottom-6">
                <Card className="border-brand-green/40 bg-gradient-to-r from-brand-green/10 to-brand-teal/5 shadow-lg backdrop-blur-sm">
                  <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">
                          Ready to transfer {selectedTaskCount} task{selectedTaskCount !== 1 ? "s" : ""}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          From <span className="font-medium text-foreground">{sourceUser?.full_name}</span> → <span className="font-medium text-foreground">{targetUser?.full_name}</span>
                          {mergeType === "temporary" && endDate && <span className="ml-2 text-brand-green">until {format(endDate, "PP")}</span>}
                        </p>
                      </div>
                      <Button onClick={handleConfirmMerge} disabled={mergeMutation.isPending} size="lg" className="gap-2 rounded-full bg-brand-green hover:bg-brand-green/90 transition-all duration-200 shadow-md hover:shadow-lg px-6">
                        {mergeMutation.isPending ? "Merging..." : "Confirm Merge"}
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>}
          </div>
        </div>
        </div>

        {/* Right Side Navigation */}
        <SideNavigation />
      </div>
      <BetaFooter />
    </div>;
};
export default MagicMergeTool;