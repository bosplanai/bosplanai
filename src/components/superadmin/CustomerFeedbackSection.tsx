import { useState, useEffect } from "react";
import { MessageSquare, User, Building2, Mail, Calendar, Trash2, Loader2, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TOOL_LABELS: Record<string, string> = {
  general: "General Feedback",
  tasks: "Tasks",
  projects: "Projects",
  calendar: "Calendar",
  bosdrive: "Bosdrive",
  dataroom: "Data Room",
  "magic-merge": "Magic Merge",
  taskflow: "TaskFlow",
  taskpopulate: "TaskPopulate",
  "virtual-assistants": "Remote Assistants",
};

interface FeedbackEntry {
  id: string;
  created_at: string;
  name: string;
  organisation: string;
  email: string;
  feedback: string;
  relatedTool: string;
}

const CustomerFeedbackSection = () => {
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFeedbackEntries();
  }, []);

  const fetchFeedbackEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_usage_logs")
        .select("id, created_at, page_path")
        .eq("feature_name", "beta_feedback")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsed: FeedbackEntry[] = (data || []).map((entry) => {
        let p = { name: "", organisation: "", email: "", feedback: "", relatedTool: "general" };
        try {
          if (entry.page_path) p = { ...p, ...JSON.parse(entry.page_path) };
        } catch { /* ignore */ }
        return {
          id: entry.id,
          created_at: entry.created_at,
          name: p.name || "Unknown",
          organisation: p.organisation || "N/A",
          email: p.email || "N/A",
          feedback: p.feedback || "No feedback provided",
          relatedTool: p.relatedTool || "general",
        };
      });

      setFeedbackEntries(parsed);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback entries");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("feature_usage_logs")
        .delete()
        .eq("id", feedbackToDelete);
      if (error) throw error;
      setFeedbackEntries((prev) => prev.filter((f) => f.id !== feedbackToDelete));
      toast.success("Feedback entry deleted");
    } catch {
      toast.error("Failed to delete feedback entry");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setFeedbackToDelete(null);
    }
  };

  return (
    <>
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-yellow-400" />
            Customer Feedback
          </h3>
          <p className="text-sm text-slate-400">
            Beta feedback submissions from users
            {!loading && (
              <span className="ml-2 text-slate-500">
                ({feedbackEntries.length} submission{feedbackEntries.length !== 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : feedbackEntries.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center text-slate-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No feedback submissions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbackEntries.map((entry) => (
              <Card key={entry.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs gap-1"
                      >
                        <Wrench className="w-3 h-3" />
                        {TOOL_LABELS[entry.relatedTool] || entry.relatedTool}
                      </Badge>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-slate-400 hover:text-red-400 hover:bg-red-400/10 h-8 w-8"
                      onClick={() => {
                        setFeedbackToDelete(entry.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{entry.organisation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <a href={`mailto:${entry.email}`} className="hover:text-amber-400 transition-colors">
                        {entry.email}
                      </a>
                    </div>
                  </div>

                  <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/50 p-3 rounded-lg leading-relaxed">
                    {entry.feedback}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Feedback</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this feedback entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFeedback}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomerFeedbackSection;
