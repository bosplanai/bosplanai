import { useState, useCallback } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Send, Sparkles, Loader2, AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";
import SideNavigation from "@/components/SideNavigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useTasks, TaskPriority } from "@/hooks/useTasks";
import { usePersonalChecklist } from "@/hooks/usePersonalChecklist";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import TaskChecklistPreview from "@/components/taskpopulate/TaskChecklistPreview";
import { ParsedTask } from "@/components/taskpopulate/GeneratedTaskItem";
import { TaskDetails } from "@/components/taskpopulate/TaskDetailSheet";

// Generate a concise title from a longer task description
const generateTitleFromText = (text: string): string => {
  // If text is already short enough, use as-is
  if (text.length <= 60) return text;
  
  // Try to find a natural break point
  const breakPoints = ['. ', ': ', ' - ', ' – ', ' — ', ', '];
  for (const bp of breakPoints) {
    const idx = text.indexOf(bp);
    if (idx > 10 && idx < 60) {
      return text.substring(0, idx);
    }
  }
  
  // Truncate at word boundary
  const truncated = text.substring(0, 57);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 30) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
};

// Parse AI response into individual tasks - handles both JSON and text formats
const parseTasksFromContent = (content: string): ParsedTask[] => {
  const tasks: ParsedTask[] = [];
  let taskIndex = 0;

  // First, try to parse as JSON array (preferred format from AI)
  try {
    // Clean up the content - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.slice(7);
    } else if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    cleanedContent = cleanedContent.trim();

    // Try to find JSON array in the content
    const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          if (item.title || item.description || item.text) {
            const title = (item.title || generateTitleFromText(item.description || item.text || "")).slice(0, 60);
            const description = item.description || item.text || "";
            tasks.push({
              id: `task-${taskIndex++}`,
              text: description,
              title: title,
              description: description.length > 60 ? description : undefined,
              selected: true,
              destination: undefined,
              priority: "medium",
            });
          }
        }
        if (tasks.length > 0) return tasks;
      }
    }
  } catch {
    // JSON parsing failed, fall back to text parsing
    console.log("JSON parsing failed, falling back to text parsing");
  }

  // Fallback: Parse as line-based format
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match numbered lists: "1.", "1)", "1:"
    // Match bullet points: "-", "*", "•", "→", ">"
    // Match checkbox-style: "[ ]", "[x]", "☐", "☑"
    const listPatterns = [
      /^(\d+)[.):\s]+(.+)$/,           // Numbered: 1. Task, 1) Task, 1: Task
      /^[-*•→>]\s*(.+)$/,              // Bullets: - Task, * Task, • Task
      /^\[[ xX]?\]\s*(.+)$/,           // Checkboxes: [ ] Task, [x] Task
      /^[☐☑✓✗]\s*(.+)$/,               // Unicode checkboxes
    ];

    let taskText: string | null = null;

    for (const pattern of listPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        taskText = match[match.length - 1].trim();
        break;
      }
    }

    if (taskText && taskText.length > 3) {
      const cleanedText = taskText.replace(/:\s*$/, "").trim();
      
      if (cleanedText.length > 5 || /[a-z]/.test(cleanedText)) {
        const title = generateTitleFromText(cleanedText);
        tasks.push({
          id: `task-${taskIndex++}`,
          text: cleanedText,
          title: title,
          description: cleanedText.length > 60 ? cleanedText : undefined,
          selected: true,
          destination: undefined,
          priority: "medium",
        });
      }
    }
  }

  return tasks;
};

const TaskPopulate = () => {
  const { navigate } = useOrgNavigation();
  const { isAdmin, isMember, canAccessOperational, canAccessStrategic, canUseTaskPopulate, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const { addTask } = useTasks();
  const { addItem: addChecklistItem } = usePersonalChecklist();
  const { organization } = useOrganization();

  const [prompt, setPrompt] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Only Full Access (admin) and Manager (member) users can access TaskPopulate
  // Viewer (Team) users have NO access
  const canAccess = canUseTaskPopulate;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Please enter a prompt",
        description: "Describe the tasks you want to generate",
        variant: "destructive",
      });
      return;
    }

    if (!organization?.id) {
      toast({
        title: "Organization not found",
        description: "Please ensure you are logged in to an organization",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setStreamingContent("");
    setParsedTasks([]);

    try {
      // Get session token for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Please log in to use this feature");
      }

      const response = await fetch(
        `https://qiikjhvzlwzysbtzhdcd.supabase.co/functions/v1/generate-tasks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ 
            prompt: prompt.trim(),
            organization_id: organization.id 
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate tasks");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      let doneFromServer = false;

      const processSseLine = (rawLine: string): boolean => {
        let line = rawLine;
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return false;

        // Accept both `data: ...` and `data:...`
        if (!line.startsWith("data:")) return false;
        const jsonStr = line.replace(/^data:\s?/, "").trim();

        if (jsonStr === "[DONE]") return true;

        try {
          const parsed = JSON.parse(jsonStr);
          const choice = parsed?.choices?.[0];
          const delta =
            choice?.delta?.content ??
            choice?.message?.content ??
            choice?.text ??
            parsed?.content;

          if (typeof delta === "string" && delta.length > 0) {
            content += delta;
            setStreamingContent(content);
          }
        } catch {
          // Not enough data yet; keep buffering.
          buffer = rawLine + "\n" + buffer;
        }

        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (processSseLine(line)) {
            doneFromServer = true;
            break;
          }
        }

        if (doneFromServer) break;
      }

      // Process any remaining buffered content (some streams don't end with a newline).
      if (!doneFromServer && buffer.trim().length > 0) {
        for (const line of buffer.split("\n")) {
          if (processSseLine(line)) break;
        }
      }

      // Debugging aid for stubborn cases (won't show to users unless they open console)
      console.debug("[TaskPopulate] streamed content length:", content.length);

      // Parse tasks from the completed content
      const tasks = parseTasksFromContent(content);
      if (tasks.length === 0) {
        toast({
          title: "No tasks detected",
          description: "The response didn't contain a recognizable task list. Try rephrasing your prompt.",
          variant: "destructive",
        });
      } else {
        // Set default destination based on role permissions
        // Managers (member role) can ONLY generate tasks for Product Management
        // They cannot access Operational or Strategic boards
        const defaultDestination = "product"; // Always default to product
        const tasksWithDefaults = tasks.map(task => ({
          ...task,
          destination: task.destination || defaultDestination,
        }));
        setParsedTasks(tasksWithDefaults);
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate tasks",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleToggleSelect = useCallback((id: string) => {
    setParsedTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, selected: !task.selected } : task
      )
    );
  }, []);

  const handleEditTask = useCallback((id: string, details: TaskDetails) => {
    setParsedTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              title: details.title,
              description: details.description,
              destination: details.destination,
              projectId: details.projectId,
              dueDate: details.dueDate,
              priority: details.priority,
              assignedUserId: details.assignedUserId,
              organizationId: details.organizationId,
            }
          : task
      )
    );
  }, []);

  const handleQuickUpdate = useCallback((id: string, updates: Partial<ParsedTask>) => {
    setParsedTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, ...updates } : task
      )
    );
  }, []);

  const handleRemoveTask = useCallback((id: string) => {
    setParsedTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const handleSelectAll = useCallback(() => {
    setParsedTasks((prev) => prev.map((task) => ({ ...task, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setParsedTasks((prev) => prev.map((task) => ({ ...task, selected: false })));
  }, []);

  const handleCreateSelected = async () => {
    const selected = parsedTasks.filter((t) => t.selected);
    if (selected.length === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select at least one task to create",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    let successCount = 0;

    try {
      for (const task of selected) {
        try {
          const destination = task.destination || "personal";
          // Use title if set, otherwise fall back to text
          const taskTitle = (task.title || task.text).trim();
          // Use description if set, otherwise use text as description if title differs
          const taskDescription = task.description?.trim() || 
            (task.title && task.title !== task.text ? task.text.trim() : "");
          
          if (destination === "personal") {
            await addChecklistItem({
              title: taskTitle,
              description: taskDescription || undefined,
              dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
              priority: (task.priority || "medium") as TaskPriority,
              projectId: task.projectId || undefined,
            });
          } else {
            // Map destination to category - strategic must be explicitly set
            let category: string;
            if (destination === "strategic") {
              category = "strategic";
            } else if (destination === "operational") {
              category = "operational";
            } else {
              category = "product"; // Default to product for any other case
            }

            await addTask(
              taskTitle,
              "ListTodo",
              category,
              (task.priority || "medium") as TaskPriority,
              taskDescription,
              "weekly",
              task.projectId || null,
              task.dueDate ? task.dueDate.toISOString().split("T")[0] : null,
              task.assignedUserId || null,
              task.assignedUserId ? [task.assignedUserId] : [],
              false
            );
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to create task:`, error);
        }
      }

      toast({
        title: `Created ${successCount} of ${selected.length} tasks`,
        description: successCount === selected.length ? "All tasks created successfully!" : undefined,
      });

      // Clear everything after successful creation
      setPrompt("");
      setStreamingContent("");
      setParsedTasks([]);
    } catch (error) {
      console.error("Failed to create tasks:", error);
      toast({
        title: "Failed to create some tasks",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setStreamingContent("");
    setParsedTasks([]);
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex min-h-screen bg-background">
        <SideNavigation />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground">
                TaskPopulate is only available for Full Access and Manager users.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const selectedTasks = parsedTasks.filter((t) => t.selected);

  return (
    <div className="min-h-screen bg-background flex pb-20 md:pb-0">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-4 sm:py-5 shadow-sm">
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
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-orange to-brand-orange/70 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground">TaskPopulate</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Generate task checklists from natural language prompts</p>
                </div>
              </div>
            </div>

            {(parsedTasks.length > 0 || streamingContent) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="shrink-0 self-end sm:self-auto gap-2 rounded-full border-brand-green hover:shadow-md transition-all duration-300"
              >
                <RotateCcw className="w-4 h-4" />
                Start Over
              </Button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto bg-card/50">
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-brand-orange/10 via-brand-coral/5 to-transparent rounded-2xl p-4 sm:p-6 border border-brand-orange/20">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl bg-brand-orange/20 shrink-0">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-brand-orange" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">AI-Powered Task Generation</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-2xl">
                    Describe what you need to accomplish and let AI generate a comprehensive task checklist for you. Perfect for project planning, onboarding, and complex workflows.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 1: Prompt Input Card */}
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 overflow-hidden">
              <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-orange text-white text-sm font-semibold">1</span>
                  <CardTitle className="text-base font-semibold">Enter Your Prompt</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                <Textarea
                  placeholder="E.g., Create a product launch checklist with marketing, development, and QA tasks..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[120px] resize-none rounded-xl bg-background/80 backdrop-blur-sm shadow-sm focus:shadow-md transition-all duration-300 border-brand-green"
                  disabled={isGenerating}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="gap-2 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Generate Tasks
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Checklist Preview */}
            {(parsedTasks.length > 0 || isGenerating || streamingContent) && (
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 overflow-hidden">
                <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-orange text-white text-sm font-semibold">2</span>
                    <CardTitle className="text-base font-semibold">Review & Create Tasks</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <TaskChecklistPreview
                    tasks={parsedTasks}
                    isGenerating={isGenerating}
                    streamingContent={streamingContent}
                    onToggleSelect={handleToggleSelect}
                    onEditTask={handleEditTask}
                    onRemoveTask={handleRemoveTask}
                    onQuickUpdate={handleQuickUpdate}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                    onCreateSelected={handleCreateSelected}
                    isCreating={isCreating}
                    canAccessOperational={canAccessOperational}
                    canAccessStrategic={canAccessStrategic}
                    canCreateProject={isAdmin}
                  />
                </CardContent>
              </Card>
            )}

            {/* Example Prompts - Only show when no content */}
            {!parsedTasks.length && !isGenerating && !streamingContent && (
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 overflow-hidden">
                <CardHeader className="bg-secondary/30 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-muted-foreground text-sm font-semibold">?</span>
                    <CardTitle className="text-base font-semibold">Example Prompts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      "Create a product launch checklist",
                      "Outline steps to onboard a new team member",
                      "Create a project plan for updating our website",
                      "List tasks for setting up a Shopify store",
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setPrompt(example)}
                        className="text-left p-4 rounded-xl border-2 border-border/60 bg-background/80 backdrop-blur-sm hover:border-brand-orange/50 hover:bg-brand-orange/5 hover:shadow-md transition-all duration-300 text-sm text-muted-foreground hover:text-foreground"
                      >
                        "{example}"
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
      
      <SideNavigation />
    </div>
  );
};

export default TaskPopulate;
