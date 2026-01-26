import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit3,
  Archive,
  Trash2,
  Eye,
  History,
  FileText,
  AlertTriangle,
  Calendar,
  X,
  Download,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { usePolicies, Policy, PolicyTag } from "@/hooks/usePolicies";
import { PolicyDialog } from "./PolicyDialog";
import { PolicyVersionHistory } from "./PolicyVersionHistory";
import { PolicyFilePreviewDialog, type PolicyPreviewFile } from "./PolicyFilePreviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";

interface PolicyDatabaseProps {
  driveFiles?: { id: string; name: string; file_path: string; file_size?: number; mime_type?: string | null }[];
}

export const PolicyDatabase = ({ driveFiles = [] }: PolicyDatabaseProps) => {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const {
    policies,
    policiesLoading,
    tags,
    expiringPolicies,
    archivePolicy,
    restorePolicy,
    deletePolicy,
  } = usePolicies();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [versionHistoryPolicy, setVersionHistoryPolicy] = useState<Policy | null>(null);
  const [previewFile, setPreviewFile] = useState<PolicyPreviewFile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);

  // Filter policies
  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      policy.tags?.some((tag) => selectedTags.includes(tag.id));

    const matchesStatus =
      statusFilter === "all" || policy.status === statusFilter;

    return matchesSearch && matchesTags && matchesStatus;
  });

  const handleEdit = (policy: Policy) => {
    setSelectedPolicy(policy);
    setPolicyDialogOpen(true);
  };

  const handleArchive = async (policy: Policy) => {
    try {
      await archivePolicy(policy.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRestore = async (policy: Policy) => {
    try {
      await restorePolicy(policy.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteConfirm = async () => {
    if (!policyToDelete) return;
    try {
      await deletePolicy(policyToDelete.id);
      setDeleteConfirmOpen(false);
      setPolicyToDelete(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleViewFile = (policy: Policy) => {
    if (!policy.file_id || !policy.file) return;
    setPreviewFile({
      name: policy.file.name,
      file_path: policy.file.file_path,
      mime_type: policy.file.mime_type,
    });
  };

  const handleDownloadFile = async (policy: Policy) => {
    if (!policy.file_id || !policy.file) return;

    try {
      const { data, error } = await supabase.storage
        .from("drive-files")
        .download(policy.file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = policy.file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  const handleUploadFile = async (file: File): Promise<{ id: string; name: string; file_size?: number; mime_type?: string; url?: string } | null> => {
    if (!organization?.id || !user?.id) {
      toast.error("No organization or user found");
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${organization.id}/${crypto.randomUUID()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("drive-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create drive file record
      const { data: fileRecord, error: recordError } = await supabase
        .from("drive_files")
        .insert({
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          organization_id: organization.id,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (recordError) throw recordError;

      // Get signed URL for preview
      const { data: urlData } = await supabase.storage
        .from("drive-files")
        .createSignedUrl(filePath, 3600);

      return {
        id: fileRecord.id,
        name: file.name,
        file_size: file.size,
        mime_type: file.type,
        url: urlData?.signedUrl,
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
      return null;
    }
  };

  const getFileUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("drive-files")
        .createSignedUrl(filePath, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error("Failed to get file URL:", error);
      return null;
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const getExpiryBadge = (policy: Policy) => {
    if (!policy.expiry_date || policy.status !== "active") return null;

    const daysUntilExpiry = differenceInDays(new Date(policy.expiry_date), new Date());

    if (daysUntilExpiry < 0) {
      return (
        <Badge variant="destructive" className="text-xs">
          Expired
        </Badge>
      );
    }

    if (daysUntilExpiry <= 30) {
      return (
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expires in {daysUntilExpiry} days
        </Badge>
      );
    }

    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <CardTitle className="text-lg">Policy Database</CardTitle>
            <Badge variant="outline" className="ml-2">
              {filteredPolicies.length} policies
            </Badge>
          </div>
          <Button onClick={() => {
            setSelectedPolicy(null);
            setPolicyDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Policy
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Expiring Policies Alert */}
          {expiringPolicies.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {expiringPolicies.length} {expiringPolicies.length === 1 ? "policy" : "policies"} expiring soon
                </p>
                <p className="text-xs text-muted-foreground">
                  Review and update these policies before they expire
                </p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search policies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter("active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("draft")}>
                    Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("archived")}>
                    Archived
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("expired")}>
                    Expired
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(selectedTags.length > 0 || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTags([]);
                    setStatusFilter("all");
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                style={{
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                  borderColor: tag.color,
                  color: selectedTags.includes(tag.id) ? "white" : tag.color,
                }}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </Badge>
            ))}
          </div>

          {/* Policies Table */}
          {policiesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading policies...</div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No policies found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || selectedTags.length > 0 || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first policy to get started"}
              </p>
              {!searchQuery && selectedTags.length === 0 && statusFilter === "all" && (
                <Button onClick={() => {
                  setSelectedPolicy(null);
                  setPolicyDialogOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Policy
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="max-w-md">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="font-semibold text-foreground leading-tight">
                              {policy.title}
                            </p>
                            {policy.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                {policy.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {policy.tags?.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                          {policy.tags && policy.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{policy.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">v{policy.current_version}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(policy.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {policy.expiry_date && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(policy.expiry_date), "MMM d, yyyy")}
                            </div>
                          )}
                          {getExpiryBadge(policy)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {policy.file && (
                              <>
                                <DropdownMenuItem onClick={() => handleViewFile(policy)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Document
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadFile(policy)}>
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleEdit(policy)}>
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setVersionHistoryPolicy(policy)}>
                              <History className="w-4 h-4 mr-2" />
                              Version History
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {policy.status === "archived" ? (
                              <DropdownMenuItem onClick={() => handleRestore(policy)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleArchive(policy)}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setPolicyToDelete(policy);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Policy Dialog */}
      <PolicyDialog
        open={policyDialogOpen}
        onOpenChange={setPolicyDialogOpen}
        policy={selectedPolicy}
        driveFiles={driveFiles}
        onUploadFile={handleUploadFile}
        getFileUrl={getFileUrl}
      />

      {/* File Preview Dialog */}
      <PolicyFilePreviewDialog file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Version History Dialog */}
      <PolicyVersionHistory
        policy={versionHistoryPolicy}
        onClose={() => setVersionHistoryPolicy(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{policyToDelete?.title}"? This action cannot
              be undone. All version history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
