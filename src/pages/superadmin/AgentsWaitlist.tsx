import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowLeft, Trash2, Loader2, Mail, Building2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface WaitlistEntry {
  id: string;
  name: string;
  company_name: string;
  email: string;
  created_at: string;
}

const AgentsWaitlist = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: adminLoading } = useSuperAdmin();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_waitlist")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching waitlist:", error);
    } else {
      setEntries((data as WaitlistEntry[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) fetchEntries();
  }, [isSuperAdmin]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("agent_waitlist").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to remove entry.", variant: "destructive" });
    } else {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Removed", description: "Waitlist entry deleted." });
    }
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Card className="max-w-md w-full mx-4 bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <CardTitle className="text-white text-2xl">Access Denied</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => navigate("/superadmin")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Agents Waiting List</h1>
              <p className="text-sm text-slate-400">{entries.length} signup{entries.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-12 text-center">
              <p className="text-slate-400">No waitlist signups yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <Card key={entry.id} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="text-white font-medium">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">{entry.company_name}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-300">{entry.email}</span>
                    </div>
                    <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                      {format(new Date(entry.created_at), "dd MMM yyyy, HH:mm")}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(entry.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AgentsWaitlist;
