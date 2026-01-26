import { useState } from "react";
import { format } from "date-fns";
import { Clock, AlertCircle, ChevronDown, ChevronUp, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { TaskRequest, useTaskRequests } from "@/hooks/useTaskRequests";
import TaskRequestSheet from "./TaskRequestSheet";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  full_name: string;
}

interface PendingTaskRequestsProps {
  teamMembers: TeamMember[];
  currentUserId: string | undefined;
}

const priorityConfig = {
  high: { label: "High", className: "bg-priority-high/10 text-priority-high" },
  medium: { label: "Med", className: "bg-priority-medium/10 text-priority-medium" },
  low: { label: "Low", className: "bg-priority-low/10 text-priority-low" },
};

const PendingTaskRequests = ({ teamMembers, currentUserId }: PendingTaskRequestsProps) => {
  const { pendingRequests, loading, acceptTask, declineTask, reassignTask } = useTaskRequests();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TaskRequest | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading || pendingRequests.length === 0) {
    return null;
  }

  const handleRequestClick = (request: TaskRequest) => {
    setSelectedRequest(request);
    setSheetOpen(true);
  };

  return (
    <>
      <Card className="border-primary/30 bg-primary/5 overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 flex items-center justify-between hover:bg-primary/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">Pending Task Requests</h3>
                  <p className="text-sm text-muted-foreground">
                    {pendingRequests.length} task{pendingRequests.length !== 1 ? "s" : ""} awaiting your response
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary text-primary-foreground">
                  {pendingRequests.length}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {pendingRequests.map((request) => {
                const priorityInfo = priorityConfig[request.priority] || priorityConfig.medium;
                
                return (
                  <button
                    key={request.id}
                    onClick={() => handleRequestClick(request)}
                    className="w-full text-left p-3 rounded-lg bg-card border border-border/50 hover:border-primary/50 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {request.title}
                          </span>
                          <Badge className={cn("text-xs", priorityInfo.className)} variant="outline">
                            {priorityInfo.label}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {request.created_by_user && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              From: {request.created_by_user.full_name}
                            </span>
                          )}
                          {request.due_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {format(new Date(request.due_date), "MMM d")}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Respond
                      </Button>
                    </div>
                  </button>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <TaskRequestSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        request={selectedRequest}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        onAccept={acceptTask}
        onDecline={declineTask}
        onReassign={reassignTask}
      />
    </>
  );
};

export default PendingTaskRequests;
