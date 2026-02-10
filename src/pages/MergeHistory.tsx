import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { ArrowLeft, RotateCcw, Eye, Download, Clock, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import SideNavigation from "@/components/SideNavigation";
import ActionBar from "@/components/ActionBar";
import { useOrganization } from "@/hooks/useOrganization";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MergeLog {
  id: string;
  organization_id: string;
  performed_by: string;
  source_user_id: string;
  target_user_id: string;
  merge_type: "permanent" | "temporary";
  temporary_end_date: string | null;
  tasks_transferred: Array<{
    id: string;
    title: string;
    due_date: string | null;
    priority: string;
    project_title?: string;
  }>;
  task_count: number;
  created_at: string;
  completed_at: string | null;
  reverted_at: string | null;
  status: "completed" | "pending_revert" | "reverted";
}

const MergeHistory = () => {
  const { navigate } = useOrgNavigation();
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const { members } = useTeamMembers();
  
  const [selectedLog, setSelectedLog] = useState<MergeLog | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);

  // Fetch merge logs
  const { data: mergeLogs = [], isLoading } = useQuery({
    queryKey: ["merge-logs", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from("task_merge_logs")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(log => ({
        ...log,
        tasks_transferred: Array.isArray(log.tasks_transferred) 
          ? log.tasks_transferred 
          : JSON.parse(log.tasks_transferred as string || "[]"),
      })) as MergeLog[];
    },
    enabled: !!organization?.id,
  });

  const getUserName = (userId: string) => {
    const member = members.find(m => m.user_id === userId);
    return member?.full_name || "Unknown User";
  };

  // Revert mutation
  const revertMutation = useMutation({
    mutationFn: async (log: MergeLog) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const taskIds = log.tasks_transferred.map(t => t.id);

      // Revert task assignments: remove target user, add back source user
      for (const taskId of taskIds) {
        // Remove target user assignment
        await supabase
          .from("task_assignments")
          .delete()
          .eq("task_id", taskId)
          .eq("user_id", log.target_user_id);
        
        // Check if source already assigned
        const { data: existing } = await supabase
          .from("task_assignments")
          .select("id")
          .eq("task_id", taskId)
          .eq("user_id", log.source_user_id)
          .single();
        
        if (!existing) {
          // Add source user assignment back
          await supabase
            .from("task_assignments")
            .insert({
              task_id: taskId,
              user_id: log.source_user_id,
              assigned_by: user.id,
              status: 'accepted',
            });
        }
        
        // Use SECURITY DEFINER function to bypass RLS for merge revert
        const { error: rpcError } = await supabase.rpc("magic_merge_reassign_task", {
          _task_id: taskId,
          _new_user_id: log.source_user_id,
        });
        if (rpcError) throw rpcError;
      }

      // Update merge log status
      const { error: updateError } = await supabase
        .from("task_merge_logs")
        .update({
          status: "reverted",
          reverted_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Merge successfully reverted");
      queryClient.invalidateQueries({ queryKey: ["merge-logs"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setRevertConfirmOpen(false);
      setSelectedLog(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to revert merge");
    },
  });

  const handleRevert = () => {
    if (selectedLog) {
      revertMutation.mutate(selectedLog);
    }
  };

  const openDetails = (log: MergeLog) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const openRevertConfirm = (log: MergeLog) => {
    setSelectedLog(log);
    setRevertConfirmOpen(true);
  };

  const generateAuditDocument = (log: MergeLog) => {
    const doc = `
MAGIC MERGE TOOL - AUDIT LOG
=============================
Merge ID: ${log.id}
Date: ${format(new Date(log.created_at), "PPpp")}
Status: ${log.status.toUpperCase()}
${log.reverted_at ? `Reverted At: ${format(new Date(log.reverted_at), "PPpp")}` : ""}

TRANSFER DETAILS
----------------
Transfer Type: ${log.merge_type === "permanent" ? "Permanent" : "Temporary"}
${log.merge_type === "temporary" && log.temporary_end_date ? `End Date: ${format(new Date(log.temporary_end_date), "PP")}` : ""}

Performed By: ${getUserName(log.performed_by)}
Source (Departing) User: ${getUserName(log.source_user_id)}
Target (Receiving) User: ${getUserName(log.target_user_id)}

TASKS TRANSFERRED (${log.task_count})
-----------------------------------------
${log.tasks_transferred.map((t, i) => `
${i + 1}. ${t.title}
   Priority: ${t.priority}
   Due Date: ${t.due_date ? format(new Date(t.due_date), "PP") : "Not set"}
   Project: ${t.project_title || "No project"}
`).join("")}

=============================
End of Audit Log
    `.trim();

    const blob = new Blob([doc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `merge-audit-${log.id.slice(0, 8)}-${format(new Date(log.created_at), "yyyy-MM-dd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (log: MergeLog) => {
    switch (log.status) {
      case "reverted":
        return <Badge variant="secondary" className="bg-muted">Reverted</Badge>;
      case "pending_revert":
        return <Badge variant="outline" className="border-brand-orange text-brand-orange">Pending Revert</Badge>;
      case "completed":
        return <Badge variant="outline" className="border-brand-green text-brand-green">Active</Badge>;
      default:
        return null;
    }
  };

  const getMergeTypeBadge = (type: string) => {
    return type === "permanent" 
      ? <Badge variant="outline">Permanent</Badge>
      : <Badge variant="outline" className="border-primary text-primary">Temporary</Badge>;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/magic-merge")} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">Merge History</h1>
            </div>
            <ActionBar />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading merge history...
              </div>
            ) : mergeLogs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="font-medium mb-2">No merge history yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Task merges will appear here once you start using the Magic Merge Tool.
                  </p>
                  <Button onClick={() => navigate("/magic-merge")}>
                    Go to Magic Merge Tool
                  </Button>
                </CardContent>
              </Card>
            ) : (
              mergeLogs.map((log) => (
                <Card key={log.id} className={log.status === "reverted" ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(log)}
                          {getMergeTypeBadge(log.merge_type)}
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{getUserName(log.source_user_id)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{getUserName(log.target_user_id)}</span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {log.task_count} task{log.task_count !== 1 ? "s" : ""} transferred
                          {log.merge_type === "temporary" && log.temporary_end_date && (
                            <> • Ends {format(new Date(log.temporary_end_date), "PP")}</>
                          )}
                        </p>
                        
                        {log.reverted_at && (
                          <p className="text-xs text-muted-foreground">
                            Reverted on {format(new Date(log.reverted_at), "PPp")}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetails(log)}
                          className="gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => generateAuditDocument(log)}
                          className="gap-1"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {log.status !== "reverted" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRevertConfirm(log)}
                            className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Revert
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Side Navigation */}
      <SideNavigation />

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Merge Details</DialogTitle>
            <DialogDescription>
              Merge performed on {selectedLog && format(new Date(selectedLog.created_at), "PPpp")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedLog)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <div className="mt-1">{getMergeTypeBadge(selectedLog.merge_type)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">From:</span>
                  <p className="font-medium">{getUserName(selectedLog.source_user_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">To:</span>
                  <p className="font-medium">{getUserName(selectedLog.target_user_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Performed By:</span>
                  <p className="font-medium">{getUserName(selectedLog.performed_by)}</p>
                </div>
                {selectedLog.merge_type === "temporary" && selectedLog.temporary_end_date && (
                  <div>
                    <span className="text-muted-foreground">End Date:</span>
                    <p className="font-medium">{format(new Date(selectedLog.temporary_end_date), "PP")}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Tasks Transferred ({selectedLog.task_count})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedLog.tasks_transferred.map((task, i) => (
                    <div key={task.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div>
                        <span className="font-medium">{task.title}</span>
                        {task.project_title && (
                          <span className="text-muted-foreground ml-2">• {task.project_title}</span>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {selectedLog && selectedLog.status !== "reverted" && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  setDetailsOpen(false);
                  openRevertConfirm(selectedLog);
                }}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Revert This Merge
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation Dialog */}
      <Dialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Confirm Revert
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revert this merge? This will reassign all {selectedLog?.task_count} task(s) 
              back to <strong>{selectedLog && getUserName(selectedLog.source_user_id)}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original merge:</span>
                <span>{format(new Date(selectedLog.created_at), "PP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tasks affected:</span>
                <span>{selectedLog.task_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Will return to:</span>
                <span className="font-medium">{getUserName(selectedLog.source_user_id)}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRevert}
              disabled={revertMutation.isPending}
              className="gap-2"
            >
              {revertMutation.isPending ? "Reverting..." : "Confirm Revert"}
              <RotateCcw className="w-4 h-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MergeHistory;
