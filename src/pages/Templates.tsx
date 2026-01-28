import { useState } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useTemplates, TemplateCategory, TemplateType, Template } from "@/hooks/useTemplates";
import OrganizationSwitcher from "@/components/OrganizationSwitcher";
import { useTemplateFolders, TemplateFolder } from "@/hooks/useTemplateFolders";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, FileText, CheckSquare, History, MoreVertical, Trash2, Edit, Clock, User, FolderOpen, ArrowLeft, LayoutTemplate, FolderPlus, FolderIcon, MoveRight, BookOpen, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import SideNavigation from "@/components/SideNavigation";
import BetaFooter from "@/components/BetaFooter";
import ActionBar from "@/components/ActionBar";
import CreateTemplateDialog from "@/components/templates/CreateTemplateDialog";
import EditTemplateDialog from "@/components/templates/EditTemplateDialog";
import TemplatePreviewDialog from "@/components/templates/TemplatePreviewDialog";
import TemplateVersionHistoryDialog from "@/components/templates/TemplateVersionHistoryDialog";
import BosplanTemplatesFolder from "@/components/templates/BosplanTemplatesFolder";
import CreateFolderDialog from "@/components/templates/CreateFolderDialog";
import EditFolderDialog from "@/components/templates/EditFolderDialog";
import TemplateFolderCard from "@/components/templates/TemplateFolderCard";
import MoveToFolderDialog from "@/components/templates/MoveToFolderDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const categoryColors: Record<TemplateCategory, string> = {
  operations: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  strategic: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  product: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const Templates = () => {
  const { navigate } = useOrgNavigation();
  const { templates, loading, deleteTemplate, fetchTemplates } = useTemplates();
  const { folders, loading: foldersLoading, deleteFolder, fetchFolders } = useTemplateFolders();
  const { isAdmin, role } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TemplateType | "all">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  
  // Folder state
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [editFolderDialogOpen, setEditFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<TemplateFolder | null>(null);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<TemplateFolder | null>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [moveToFolderDialogOpen, setMoveToFolderDialogOpen] = useState(false);
  const [templateToMove, setTemplateToMove] = useState<Template | null>(null);

  // Check if user has access (all roles including Team accounts can access)
  const hasAccess = role !== null;

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    const matchesType = typeFilter === "all" || template.template_type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const taskTemplates = filteredTemplates.filter((t) => t.template_type === "task");
  const documentTemplates = filteredTemplates.filter((t) => t.template_type === "document");

  const handleDeleteConfirm = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleDeleteFolderConfirm = async () => {
    if (folderToDelete) {
      await deleteFolder(folderToDelete.id);
      setDeleteFolderDialogOpen(false);
      setFolderToDelete(null);
    }
  };

  const handleOpenFolder = (folder: TemplateFolder) => {
    setOpenFolderId(folder.id);
  };

  const handleCloseFolder = () => {
    setOpenFolderId(null);
  };

  const handleMoveToFolder = (template: Template) => {
    setTemplateToMove(template);
    setMoveToFolderDialogOpen(true);
  };

  // Filter templates based on current folder view
  const currentFolderTemplates = openFolderId 
    ? filteredTemplates.filter(t => t.folder_id === openFolderId)
    : filteredTemplates.filter(t => !t.folder_id);

  const currentFolder = openFolderId 
    ? folders.find(f => f.id === openFolderId) 
    : null;

  const TemplateCard = ({ template }: { template: Template }) => {
    const taskCount = template.latest_version?.tasks?.length || 0;
    const docCount = template.latest_version?.documents?.length || 0;

    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1" onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }}>
              <div className="flex items-center gap-2 mb-1">
                {template.template_type === "task" ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <FileText className="h-4 w-4 text-primary" />
                )}
                <CardTitle className="text-base">{template.name}</CardTitle>
              </div>
              <CardDescription className="line-clamp-2">
                {template.description || "No description"}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTemplate(template); setEditDialogOpen(true); }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoveToFolder(template)}>
                  <MoveRight className="h-4 w-4 mr-2" />
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTemplate(template); setVersionHistoryOpen(true); }}>
                  <History className="h-4 w-4 mr-2" />
                  Version History
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => { setTemplateToDelete(template.id); setDeleteDialogOpen(true); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent onClick={() => { setSelectedTemplate(template); setPreviewOpen(true); }}>
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className={categoryColors[template.category]}>
              {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
            </Badge>
            {template.template_type === "task" && taskCount > 0 && (
              <Badge variant="secondary">{taskCount} tasks</Badge>
            )}
            {template.template_type === "document" && docCount > 0 && (
              <Badge variant="secondary">{docCount} documents</Badge>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {template.created_by_profile?.full_name || "Unknown"}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(template.updated_at), "MMM d, yyyy")}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access the Template Library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex flex-1">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/drive")}
                className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-secondary/80 transition-all duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                  <LayoutTemplate className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-foreground">Business Resources & Templates</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Create and manage reusable task and document templates</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <OrganizationSwitcher />
              <ActionBar />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {/* Filters and Actions */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 sm:h-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as TemplateCategory | "all")}>
                <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TemplateType | "all")}>
                <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setCreateDialogOpen(true)} className="h-9 text-xs sm:text-sm px-3 sm:px-4">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Template</span>
              </Button>
            </div>
          </div>

          {/* Policy Database Section */}
          {isAdmin && (
            <Card
              className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 bg-indigo-500/5 hover:bg-indigo-500/10 border-indigo-500/20 mb-6"
              onClick={() => navigate("/policies")}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">Policy Database</span>
                  <p className="text-xs text-muted-foreground">Manage company policies and compliance documents</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Card>
          )}

          {/* Bosplan Business Templates Folder */}
          <BosplanTemplatesFolder />

          {/* Organization Templates Grid */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {openFolderId && (
                <Button variant="ghost" size="sm" onClick={handleCloseFolder}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {currentFolder ? currentFolder.name : "Your Templates"}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCreateFolderDialogOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </Button>
          </div>

          {/* Folders Section - Only show when not inside a folder */}
          {!openFolderId && folders.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {folders.map((folder) => (
                  <TemplateFolderCard
                    key={folder.id}
                    folder={folder}
                    templates={templates}
                    onOpen={handleOpenFolder}
                    onEdit={(f) => { setSelectedFolder(f); setEditFolderDialogOpen(true); }}
                    onDelete={(f) => { setFolderToDelete(f); setDeleteFolderDialogOpen(true); }}
                  />
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({currentFolderTemplates.length})</TabsTrigger>
              <TabsTrigger value="tasks">Task Templates ({currentFolderTemplates.filter(t => t.template_type === "task").length})</TabsTrigger>
              <TabsTrigger value="documents">Document Templates ({currentFolderTemplates.filter(t => t.template_type === "document").length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader className="pb-2">
                        <div className="h-5 bg-muted rounded w-2/3 mb-2" />
                        <div className="h-4 bg-muted rounded w-full" />
                      </CardHeader>
                      <CardContent>
                        <div className="h-6 bg-muted rounded w-1/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : currentFolderTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {openFolderId ? "This folder is empty" : "No templates found"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || categoryFilter !== "all" || typeFilter !== "all"
                      ? "Try adjusting your filters"
                      : openFolderId 
                        ? "Move templates here to organize them"
                        : "Create your first template to get started"}
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentFolderTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              {currentFolderTemplates.filter(t => t.template_type === "task").length === 0 ? (
                <div className="text-center py-12">
                  <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No task templates</h3>
                  <p className="text-muted-foreground">Create task templates to reuse across projects</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentFolderTemplates.filter(t => t.template_type === "task").map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              {currentFolderTemplates.filter(t => t.template_type === "document").length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No document templates</h3>
                  <p className="text-muted-foreground">Create document templates for reusable formats</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentFolderTemplates.filter(t => t.template_type === "document").map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
        </div>
      
        {/* Side Navigation */}
        <SideNavigation />
      </div>
      <BetaFooter />
      {/* Dialogs */}
      <CreateTemplateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      
      <EditTemplateDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        template={selectedTemplate}
      />
      
      {selectedTemplate && (
        <>
          <TemplatePreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            template={selectedTemplate}
          />
          <TemplateVersionHistoryDialog
            open={versionHistoryOpen}
            onOpenChange={setVersionHistoryOpen}
            template={selectedTemplate}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Folder Dialogs */}
      <CreateFolderDialog 
        open={createFolderDialogOpen} 
        onOpenChange={setCreateFolderDialogOpen}
        onSuccess={fetchFolders}
      />

      <EditFolderDialog
        open={editFolderDialogOpen}
        onOpenChange={setEditFolderDialogOpen}
        folder={selectedFolder}
        onSuccess={fetchFolders}
      />

      <MoveToFolderDialog
        open={moveToFolderDialogOpen}
        onOpenChange={setMoveToFolderDialogOpen}
        template={templateToMove}
        folders={folders}
        onSuccess={() => {
          fetchTemplates();
          setMoveToFolderDialogOpen(false);
        }}
      />

      <AlertDialog open={deleteFolderDialogOpen} onOpenChange={setDeleteFolderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this folder? Templates inside will be moved out of the folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFolderConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Templates;
