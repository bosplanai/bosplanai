import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";

interface CustomerBroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CustomerBroadcastDialog = ({ open, onOpenChange }: CustomerBroadcastDialogProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc("send_customer_broadcast", {
        broadcast_message: message.trim(),
      });

      if (error) throw error;

      const result = data as { success: boolean; recipient_count: number; error?: string };

      if (!result.success) {
        throw new Error(result.error || "Failed to send broadcast");
      }

      toast({
        title: "Broadcast Sent",
        description: `Notification delivered to ${result.recipient_count} user(s).`,
      });
      setMessage("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Broadcast error:", err);
      toast({
        title: "Failed to send broadcast",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Create Broadcast</DialogTitle>
          <DialogDescription className="text-slate-400">
            This message will be sent to all Bosplan users as a notification.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-500">
            Preview: <span className="text-slate-300 italic">An update from your Bosplan admins: </span>
            <span className="text-slate-300 italic">{message || "..."}</span>
          </p>
          <Textarea
            placeholder="Type your broadcast message here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 focus-visible:ring-amber-500"
            maxLength={500}
          />
          <p className="text-xs text-slate-500 text-right">{message.length}/500</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Send Broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerBroadcastDialog;
