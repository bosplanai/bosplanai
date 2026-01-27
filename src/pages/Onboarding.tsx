import { useState, useEffect, useMemo, useCallback } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Sparkles, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useTasks, TaskPriority } from "@/hooks/useTasks";
import { usePersonalChecklist } from "@/hooks/usePersonalChecklist";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import bosplanLogo from "@/assets/bosplan-logo-full.png";
interface BoardConfig {
  id: string;
  name: string;
  category: "product" | "operational" | "strategic";
  description: string;
  placeholder: string;
  examples: string[];
}
const BOARDS: BoardConfig[] = [{
  id: "product",
  name: "Product Management",
  category: "product",
  description: "Tasks for product development, features, and launches",
  placeholder: "Describe your product goals or tasks...",
  examples: ["Launch a new e-commerce website with Shopify", "Build a mobile app MVP for customer engagement", "Create a product roadmap for Q1"]
}, {
  id: "operational",
  name: "Operations Management",
  category: "operational",
  description: "Tasks for day-to-day operations and processes",
  placeholder: "Describe your operational goals or tasks...",
  examples: ["Set up accounting and invoicing system", "Hire and onboard 3 new team members", "Implement customer support workflow"]
}, {
  id: "strategic",
  name: "Strategic Management",
  category: "strategic",
  description: "Tasks for long-term strategy and business growth",
  placeholder: "Describe your strategic goals or tasks...",
  examples: ["Expand into 2 new markets this year", "Develop partnership strategy with key vendors", "Create 5-year business growth plan"]
}];
interface GeneratedTask {
  title: string;
  description: string;
}

// Parse AI response into structured tasks with title and description
const parseTasksFromContent = (content: string): GeneratedTask[] => {
  // Try to parse as JSON array first (new format)
  try {
    // Remove any markdown code block formatting if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith("```")) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();
    const parsed = JSON.parse(jsonContent);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && typeof item.title === "string").map(item => ({
        title: item.title.trim().slice(0, 100),
        // Limit title length
        description: typeof item.description === "string" ? item.description.trim() : ""
      }));
    }
  } catch {
    // Fall back to line-based parsing for legacy responses
  }

  // Fallback: parse as numbered list (legacy format)
  const lines = content.split("\n");
  const tasks: GeneratedTask[] = [];
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    const listPatterns = [/^(\d+)[.):\s]+(.+)$/, /^[-*•→>]\s*(.+)$/, /^\[[ xX]?\]\s*(.+)$/, /^[☐☑✓✗]\s*(.+)$/];
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
        // For legacy format, use full text as description and first 60 chars as title
        const title = cleanedText.length > 60 ? cleanedText.slice(0, 57) + "..." : cleanedText;
        tasks.push({
          title,
          description: cleanedText
        });
      }
    }
  }
  return tasks;
};
const Onboarding = () => {
  const {
    navigate
  } = useOrgNavigation();
  const {
    toast
  } = useToast();
  const {
    addTask
  } = useTasks();
  const {
    addItem: addChecklistItem
  } = usePersonalChecklist();
  const {
    organization,
    profile,
    refetch
  } = useOrganization();
  const {
    user
  } = useAuth();
  const {
    canAccessOperational,
    canAccessStrategic,
    loading: roleLoading
  } = useUserRole();
  const [currentStep, setCurrentStep] = useState(0);
  const [prompts, setPrompts] = useState<Record<string, string>>({
    product: "",
    operational: "",
    strategic: ""
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<Record<string, GeneratedTask[]>>({
    product: [],
    operational: [],
    strategic: []
  });
  const [completedBoards, setCompletedBoards] = useState<Set<string>>(new Set());
  const [managerDestination, setManagerDestination] = useState<"product" | "personal">("product");

  // Filter boards based on user role permissions
  // Full Access (admin) sees all boards, Manager (member) only sees Product
  const availableBoards = useMemo(() => {
    if (canAccessOperational && canAccessStrategic) {
      // Full Access (admin) - show all boards
      return BOARDS;
    }
    // Manager (member) - only Product board
    return BOARDS.filter(board => board.id === "product");
  }, [canAccessOperational, canAccessStrategic]);

  // Check if user has already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (user && profile) {
        const {
          data
        } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single();
        if (data?.onboarding_completed) {
          navigate("/", {
            replace: true
          });
        }
      }
    };
    checkOnboarding();
  }, [user, profile, navigate]);
  const currentBoard = availableBoards[currentStep];
  const isSingleBoardFlow = availableBoards.length === 1;
  const progress = completedBoards.size / availableBoards.length * 100;
  const handleUpdateGeneratedTask = useCallback((boardId: string, index: number, field: "title" | "description", value: string) => {
    setGeneratedTasks(prev => {
      const boardTasks = prev[boardId] || [];
      const next = boardTasks.map((t, i) => i === index ? {
        ...t,
        [field]: value
      } : t);
      return {
        ...prev,
        [boardId]: next
      };
    });
  }, []);
  const handleRemoveGeneratedTask = useCallback((boardId: string, index: number) => {
    setGeneratedTasks(prev => {
      const boardTasks = prev[boardId] || [];
      const next = boardTasks.filter((_, i) => i !== index);
      return {
        ...prev,
        [boardId]: next
      };
    });
  }, []);
  const handleGenerateTasks = async () => {
    const prompt = prompts[currentBoard.id];
    if (!prompt.trim()) {
      toast({
        title: "Please enter a description",
        description: "Describe the work you want to accomplish",
        variant: "destructive"
      });
      return;
    }
    if (!organization?.id) {
      toast({
        title: "Organization not found",
        description: "Please refresh and try again",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          organization_id: organization.id
        })
      });
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
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
          stream: true
        });
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
      const tasks = parseTasksFromContent(content);
      if (tasks.length === 0) {
        toast({
          title: "No tasks generated",
          description: "Try a more detailed description",
          variant: "destructive"
        });
      } else {
        setGeneratedTasks(prev => ({
          ...prev,
          [currentBoard.id]: tasks
        }));

        // Manager flow only has one board and doesn't show a separate "Confirm" step.
        // Auto-mark the board as configured so the user can complete setup.
        if (isSingleBoardFlow) {
          setCompletedBoards(new Set([currentBoard.id]));
        }
        toast({
          title: `Generated ${tasks.length} tasks`,
          description: "Review and continue to the next board"
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate tasks",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const handleConfirmBoard = () => {
    if (generatedTasks[currentBoard.id].length === 0) {
      toast({
        title: "No tasks to confirm",
        description: "Generate tasks first before confirming",
        variant: "destructive"
      });
      return;
    }
    setCompletedBoards(prev => new Set([...prev, currentBoard.id]));
    if (currentStep < availableBoards.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handleSkipBoard = () => {
    if (currentStep < availableBoards.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handlePreviousBoard = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  const handleCompleteOnboarding = async () => {
    if (!user) return;

    // Ensure required context has loaded.
    // addTask will silently no-op when org/profile is missing, which makes onboarding feel "stuck".
    if (!profile || !organization?.id) {
      toast({
        title: "Still loading",
        description: "Please wait a moment and try again.",
        variant: "destructive"
      });
      return;
    }
    setIsCreating(true);
    try {
      // Create all tasks for completed boards.
      // Also include the current board if it has generated tasks that weren't explicitly confirmed,
      // ensuring tasks generated on the final step aren't accidentally lost.
      const boardsToCreate = new Set(completedBoards);

      // Always include current board if it has tasks (covers both single-board and multi-board flows)
      if (generatedTasks[currentBoard.id]?.length > 0) {
        boardsToCreate.add(currentBoard.id);
      }
      for (const boardId of boardsToCreate) {
        const board = availableBoards.find(b => b.id === boardId);
        if (!board) continue;
        const tasks = generatedTasks[boardId];
        for (const task of tasks) {
          try {
            const cleanedTitle = task.title.trim();
            const cleanedDescription = task.description?.trim() || "";
            if (!cleanedTitle) continue;
            if (isSingleBoardFlow && managerDestination === "personal") {
              await addChecklistItem({
                title: cleanedTitle,
                description: cleanedDescription || undefined,
                dueDate: null,
                priority: "medium",
                projectId: null,
                icon: "ListTodo"
              });
            } else {
              await addTask(cleanedTitle, "ListTodo", board.category, "medium" as TaskPriority, cleanedDescription, "weekly", null, null, null, [], false);
            }
          } catch (error) {
            console.error("Failed to create task:", error);
          }
        }
      }

      // Mark onboarding as completed
      const {
        error
      } = await supabase.from("profiles").update({
        onboarding_completed: true
      }).eq("id", user.id);
      if (error) {
        console.error("Failed to update onboarding status:", error);
      }
      await refetch();
      toast({
        title: "Welcome to Bosplan!",
        description: "Your tasks have been created. Let's get started!"
      });
      navigate("/", {
        replace: true
      });
    } catch (error) {
      console.error("Onboarding completion error:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };
  const handleSkipOnboarding = async () => {
    if (!user) return;

    // Mark onboarding as completed without creating tasks
    const {
      error
    } = await supabase.from("profiles").update({
      onboarding_completed: true
    }).eq("id", user.id);
    if (error) {
      console.error("Failed to update onboarding status:", error);
    }
    await refetch();
    navigate("/", {
      replace: true
    });
  };
  const totalTasksCount = Object.values(generatedTasks).reduce((acc, tasks) => acc + tasks.length, 0);
  const isLastStep = currentStep === availableBoards.length - 1;
  const canComplete = completedBoards.size > 0 || isLastStep && generatedTasks[currentBoard.id].length > 0;

  // Show loading while role is being determined or boards haven't loaded
  if (roleLoading || !currentBoard) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img alt="Bosplan" className="h-8 sm:h-10" src="/lovable-uploads/b1a72a76-ccc1-4c5a-a140-d0c3bde9d973.png" />
          <Button variant="ghost" size="sm" onClick={handleSkipOnboarding} className="text-muted-foreground hover:text-foreground">
            Skip for now
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">
                Board {currentStep + 1} of {availableBoards.length}
              </span>
              <span className="text-muted-foreground">
                {completedBoards.size} board{completedBoards.size !== 1 ? "s" : ""} configured
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Hero Section */}
          <div className="bg-gradient-to-r from-brand-orange/10 via-brand-coral/5 to-transparent rounded-2xl p-6 border border-brand-orange/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-brand-orange/20 shrink-0">
                <Sparkles className="w-6 h-6 text-brand-orange" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                  Let's populate your boards with AI
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
                  Tell us about the work you want to accomplish, and we'll generate actionable tasks for each of your management boards.
                </p>
              </div>
            </div>
          </div>

          {/* Board Configuration Card */}
          <Card className="shadow-md border-border/60 overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border/40">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-orange text-white text-sm font-semibold">
                  {currentStep + 1}
                </span>
                <div>
                  <CardTitle className="text-lg">{currentBoard.name}</CardTitle>
                  <CardDescription>{currentBoard.description}</CardDescription>
                </div>
                {completedBoards.has(currentBoard.id) && <CheckCircle2 className="w-5 h-5 text-brand-green ml-auto" />}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Prompt Input */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Describe your {currentBoard.name.toLowerCase()} goals
                </label>
                <Textarea placeholder={currentBoard.placeholder} value={prompts[currentBoard.id]} onChange={e => setPrompts(prev => ({
                ...prev,
                [currentBoard.id]: e.target.value
              }))} className="min-h-[100px] resize-none rounded-xl bg-background/80 border-brand-green focus:border-brand-orange transition-colors" disabled={isGenerating} />
              </div>

              {/* Example Prompts */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Example prompts:</p>
                <div className="flex flex-wrap gap-2">
                  {currentBoard.examples.map((example, idx) => <Button key={idx} variant="outline" size="sm" className="text-xs rounded-full border-dashed hover:border-brand-orange hover:text-brand-orange transition-colors" onClick={() => setPrompts(prev => ({
                  ...prev,
                  [currentBoard.id]: example
                }))} disabled={isGenerating}>
                      {example}
                    </Button>)}
                </div>
              </div>

              {/* Destination selector (Manager / single-board onboarding only) */}
              {isSingleBoardFlow && <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Save tasks to</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={managerDestination === "product" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setManagerDestination("product")} disabled={isGenerating || isCreating}>
                      Product Management board
                    </Button>
                    <Button type="button" variant={managerDestination === "personal" ? "default" : "outline"} size="sm" className="rounded-full" onClick={() => setManagerDestination("personal")} disabled={isGenerating || isCreating}>
                      Personal checklist
                    </Button>
                  </div>
                </div>}

              {/* Generate Button */}
              <Button onClick={handleGenerateTasks} disabled={isGenerating || !prompts[currentBoard.id].trim()} className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl h-11">
                {isGenerating ? <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating tasks...
                  </> : <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Tasks
                  </>}
              </Button>

              {/* Generated Tasks Preview */}
              {generatedTasks[currentBoard.id].length > 0 && <div className="space-y-3 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">
                      Generated Tasks ({generatedTasks[currentBoard.id].length})
                    </h4>
                    <CheckCircle2 className="w-4 h-4 text-brand-green" />
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {generatedTasks[currentBoard.id].map((task, idx) => <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground p-3 bg-secondary/50 rounded-lg">
                        <span className="text-brand-orange font-medium shrink-0 mt-2">
                          {idx + 1}.
                        </span>
                        <div className="flex-1 space-y-2">
                          <Input value={task.title} onChange={e => handleUpdateGeneratedTask(currentBoard.id, idx, "title", e.target.value)} placeholder="Task title" className="h-9 font-medium" disabled={isCreating} />
                          <Textarea value={task.description} onChange={e => handleUpdateGeneratedTask(currentBoard.id, idx, "description", e.target.value)} placeholder="Task description (optional)" className="min-h-[60px] text-sm resize-none" disabled={isCreating} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => handleRemoveGeneratedTask(currentBoard.id, idx)} disabled={isCreating} aria-label="Remove task">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>)}
                  </div>
                </div>}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button variant="outline" onClick={handlePreviousBoard} disabled={currentStep === 0} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-3">
              {!isLastStep && <Button variant="ghost" onClick={handleSkipBoard} className="text-muted-foreground">
                  Skip this board
                </Button>}

              {isLastStep ? <Button onClick={handleCompleteOnboarding} disabled={isCreating || !canComplete} className="bg-brand-green hover:bg-brand-green/90 text-white rounded-xl px-6">
                  {isCreating ? <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating tasks...
                    </> : <>
                      Complete Setup
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>}
                </Button> : <Button onClick={handleConfirmBoard} disabled={generatedTasks[currentBoard.id].length === 0} className="bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl">
                  Confirm & Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>}
            </div>
          </div>

          {/* Summary Footer */}
          {totalTasksCount > 0 && <div className="text-center text-sm text-muted-foreground py-4">
              {totalTasksCount} task{totalTasksCount !== 1 ? "s" : ""} ready to be created
            </div>}
        </div>
      </main>
    </div>;
};
export default Onboarding;