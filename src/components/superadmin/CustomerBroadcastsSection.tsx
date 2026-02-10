import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, Plus } from "lucide-react";
import CustomerBroadcastDialog from "./CustomerBroadcastDialog";

const CustomerBroadcastsSection = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-indigo-400" />
          Customer Broadcasts
        </h3>
        <p className="text-sm text-slate-400">Send platform-wide update notifications to all Bosplan users</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all duration-200 cursor-pointer group" onClick={() => setOpen(true)}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Plus className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                  Create Broadcast
                </h4>
                <p className="text-sm text-slate-400 mt-1">Send an update notification to all users across every organisation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <CustomerBroadcastDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default CustomerBroadcastsSection;
