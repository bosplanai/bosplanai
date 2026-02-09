import { useState, useRef } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { Plus, CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import ProductBoardColumn from "./ProductBoardColumn";
import SortableProjectCard from "./SortableProjectCard";
import ProjectCard from "./ProjectCard";
import ProjectTasksModal from "./ProjectTasksModal";
import CreateProjectDialog from "./CreateProjectDialog";
import ArchiveFolder from "./ArchiveFolder";
import ProjectDraftsFolder from "./ProjectDraftsFolder";
import RecyclingBin from "./RecyclingBin";
import ArchiveChoiceDialog from "./ArchiveChoiceDialog";
import { useProjects, Project } from "@/hooks/useProjects";
import { useTasks, TaskPriority } from "@/hooks/useTasks";
import { useSparkle } from "@/contexts/SparkleContext";
import { useOrganization } from "@/hooks/useOrganization";
import { useArchive } from "@/hooks/useArchive";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { ProjectDraft, saveProjectDraft } from "@/lib/projectDrafts";

interface TaskInput {
  title: string;
  description: string;
  dueDate: Date | undefined;
  priority: TaskPriority;
  assignedUserId: string | null;
}

const ProductManagementBoard = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingDueDate, setEditingDueDate] = useState<Date | undefined>();
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; title: string; status: string } | null>(null);
  const {
    projects,
    loading,
    addProject,
    updateProject,
    deleteProject,
    reorderProjects
  } = useProjects();
  const { addTask, refetch: refetchTasks } = useTasks();
  const { triggerSparkle } = useSparkle();
  const { organization } = useOrganization();
  const { archiveProject } = useArchive();
  const { toast } = useToast();
  const { isAdmin, isMember } = useUserRole();
  const refetchProjects = () => {
    // Trigger re-fetch by updating state
    window.location.reload();
  };
  const doneColumnRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8
      }
    })
  );
  const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()));
  const todoProjects = filteredProjects.filter(p => p.status === "todo").sort((a, b) => a.position - b.position);
  const inProgressProjects = filteredProjects.filter(p => p.status === "in_progress").sort((a, b) => a.position - b.position);
  const doneProjects = filteredProjects.filter(p => p.status === "done").sort((a, b) => a.position - b.position);

  const handleCreateProject = async (
    title: string,
    description: string,
    dueDate: Date | undefined,
    tasks: TaskInput[]
  ) => {
    const project = await addProject(title, description, dueDate);
    
    if (project && tasks.length > 0) {
      // Create all tasks linked to the new project
      for (const task of tasks) {
        await addTask(
          task.title,
          "ListTodo", // default icon
          "product", // category for product management
          task.priority,
          task.description,
          "weekly", // default subcategory
          project.id,
          task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
          task.assignedUserId,
          task.assignedUserId ? [task.assignedUserId] : [],
          false // not recurring
        );
      }
    }
  };

  const handleSaveProjectDraft = (
    title: string,
    description: string,
    dueDate: Date | undefined,
    tasks: TaskInput[]
  ) => {
    if (!organization?.id) return;

    const draft: ProjectDraft = {
      id: crypto.randomUUID(),
      title,
      description,
      dueDateISO: dueDate ? dueDate.toISOString() : null,
      createdAtISO: new Date().toISOString(),
      tasks: tasks.map((t) => ({
        title: t.title,
        description: t.description,
        dueDateISO: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority,
        assignedUserId: t.assignedUserId,
      })),
    };

    saveProjectDraft(organization.id, draft);
    toast({
      title: "Draft saved",
      description: "Your project has been saved as a draft.",
    });
  };

  const handlePublishProjectDraft = async (draft: ProjectDraft) => {
    const dueDate = draft.dueDateISO ? new Date(draft.dueDateISO) : undefined;
    const tasks: TaskInput[] = draft.tasks.map((t) => ({
      title: t.title,
      description: t.description,
      dueDate: t.dueDateISO ? new Date(t.dueDateISO) : undefined,
      priority: t.priority,
      assignedUserId: t.assignedUserId,
    }));

    await handleCreateProject(draft.title, draft.description, dueDate, tasks);
  };

  const handleEditProject = async () => {
    if (!editingProject || !editingProject.title.trim()) return;
    await updateProject(editingProject.id, {
      title: editingProject.title,
      description: editingProject.description,
      status: editingProject.status,
      due_date: editingDueDate ? editingDueDate.toISOString().split('T')[0] : null
    });
    setEditingProject(null);
    setEditingDueDate(undefined);
    setIsEditDialogOpen(false);
  };
  const openEditDialog = (project: Project) => {
    setEditingProject({
      ...project
    });
    setEditingDueDate(project.due_date ? new Date(project.due_date) : undefined);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProject = (project: { id: string; title: string; status: string }) => {
    if (project.status === "done") {
      // Show choice dialog for completed projects
      setProjectToDelete(project);
      setArchiveDialogOpen(true);
    } else {
      // Direct delete for non-complete projects
      deleteProject(project.id);
    }
  };

  const handleArchiveProject = async () => {
    if (projectToDelete) {
      await archiveProject(projectToDelete.id);
      refetchProjects();
      setProjectToDelete(null);
    }
  };

  const handleRecycleBinProject = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
    }
  };
  const handleDragStart = (event: DragStartEvent) => {
    const project = projects.find(p => p.id === event.active.id);
    if (project) {
      setActiveProject(project);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveProject(null);
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    const activeProjectData = projects.find(p => p.id === activeId);
    if (!activeProjectData) return;
    let targetStatus: "todo" | "in_progress" | "done";
    let targetPosition: number;
    if (overId === "todo" || overId === "in_progress" || overId === "done") {
      // Dropped on column area
      targetStatus = overId;
      const columnProjects = projects.filter(p => p.status === targetStatus);
      targetPosition = columnProjects.length;
    } else {
      // Dropped on another project - find it in filtered or unfiltered list
      const overProject = filteredProjects.find(p => p.id === overId) || projects.find(p => p.id === overId);
      if (!overProject) return;
      targetStatus = overProject.status;
      // Use all projects for position calculation to maintain correct ordering
      const columnProjects = projects.filter(p => p.status === targetStatus).sort((a, b) => a.position - b.position);
      const overIndex = columnProjects.findIndex(p => p.id === overId);
      targetPosition = overIndex >= 0 ? overIndex : columnProjects.length;
    }
    if (activeProjectData.status !== targetStatus || activeProjectData.position !== targetPosition) {
      reorderProjects(activeId, targetStatus, targetPosition);
      // Trigger sparkle animation when project is moved to done
      if (targetStatus === "done" && activeProjectData.status !== "done") {
        triggerSparkle(doneColumnRef);
      }
    }
  };
  return <div className="p-4 sm:p-8 bg-card min-h-screen overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-foreground">
          {organization?.name ? `${organization.name} Projects` : "Projects"}
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search projects..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-full sm:w-64 bg-white rounded-full border-brand-green" />
          </div>
          {(isAdmin || isMember) && (
            <Button 
              className="gap-2 shadow-md text-white dark:text-black hover:opacity-90 rounded-full bg-brand-orange hover:bg-brand-orange/90 h-10 sm:h-9"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="sm:inline">Add Project</span>
            </Button>
          )}
          <ArchiveFolder onRestore={refetchProjects} variant="projects" />
          {(isAdmin || isMember) && <ProjectDraftsFolder onPublishDraft={handlePublishProjectDraft} />}
          <RecyclingBin onRestore={refetchProjects} variant="projects" />
        </div>
      </div>

      <CreateProjectDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onCreateProject={handleCreateProject}
        onSaveDraft={handleSaveProjectDraft}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Project Title</Label>
              <Input id="edit-title" placeholder="Enter project title..." value={editingProject?.title || ""} onChange={e => setEditingProject(prev => prev ? {
              ...prev,
              title: e.target.value
            } : null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea id="edit-description" placeholder="Enter project description..." value={editingProject?.description || ""} onChange={e => setEditingProject(prev => prev ? {
              ...prev,
              description: e.target.value
            } : null)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-2">
                {(["todo", "in_progress", "done"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    variant={editingProject?.status === status ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditingProject(prev => prev ? { ...prev, status } : null)}
                    className="flex-1"
                  >
                    {status === "todo" ? "To Do" : status === "in_progress" ? "In Progress" : "Complete"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editingDueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingDueDate ? format(editingDueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editingDueDate} onSelect={setEditingDueDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleEditProject} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading projects...</div>
        </div> : <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full">
            <ProductBoardColumn id="todo" title="TO DO" items={todoProjects.map(p => p.id)}>
              {todoProjects.map(project => <SortableProjectCard key={project.id} id={project.id} title={project.title} description={project.description} dueDate={project.due_date} status="todo" onEdit={() => openEditDialog(project)} onDelete={() => handleDeleteProject({ id: project.id, title: project.title, status: "todo" })} onViewTasks={() => setSelectedProject(project)} onClick={() => setSelectedProject(project)} onStatusChange={(newStatus) => updateProject(project.id, { status: newStatus })} />)}
              {todoProjects.length === 0 && <p className="text-sm text-white text-center py-6 sm:py-8">
                  No projects yet
                </p>}
            </ProductBoardColumn>

            <ProductBoardColumn id="in_progress" title="IN PROGRESS" items={inProgressProjects.map(p => p.id)}>
              {inProgressProjects.map(project => <SortableProjectCard key={project.id} id={project.id} title={project.title} description={project.description} dueDate={project.due_date} status="in_progress" onEdit={() => openEditDialog(project)} onDelete={() => handleDeleteProject({ id: project.id, title: project.title, status: "in_progress" })} onViewTasks={() => setSelectedProject(project)} onClick={() => setSelectedProject(project)} onStatusChange={(newStatus) => updateProject(project.id, { status: newStatus })} />)}
              {inProgressProjects.length === 0 && <p className="text-sm text-white text-center py-6 sm:py-8">
                  No projects in progress
                </p>}
            </ProductBoardColumn>

            <ProductBoardColumn ref={doneColumnRef} id="done" title="COMPLETE" items={doneProjects.map(p => p.id)}>
              {doneProjects.map(project => <SortableProjectCard key={project.id} id={project.id} title={project.title} description={project.description} dueDate={project.due_date} status="done" onEdit={() => openEditDialog(project)} onDelete={() => handleDeleteProject({ id: project.id, title: project.title, status: "done" })} onViewTasks={() => setSelectedProject(project)} onClick={() => setSelectedProject(project)} onStatusChange={(newStatus) => updateProject(project.id, { status: newStatus })} />)}
              {doneProjects.length === 0 && <p className="text-sm text-white text-center py-6 sm:py-8">
                  No completed projects
                </p>}
            </ProductBoardColumn>
          </div>

          <DragOverlay>
            {activeProject ? <ProjectCard title={activeProject.title} description={activeProject.description} dueDate={activeProject.due_date} status={activeProject.status as "todo" | "in_progress" | "done"} className="shadow-lg ring-2 ring-primary/20 rotate-2" /> : null}
          </DragOverlay>
        </DndContext>}

      <ProjectTasksModal isOpen={!!selectedProject} onClose={() => setSelectedProject(null)} projectId={selectedProject?.id || null} projectTitle={selectedProject?.title || ""} onTasksChanged={refetchTasks} />

      <ArchiveChoiceDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        itemType="project"
        itemTitle={projectToDelete?.title || ""}
        onArchive={handleArchiveProject}
        onRecycleBin={handleRecycleBinProject}
      />
    </div>;
};
export default ProductManagementBoard;