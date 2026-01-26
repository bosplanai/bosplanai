import { useState, useEffect } from "react";
import { Trash2, RotateCcw, X, Calendar, Folder, FileText, Image, Video, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import { formatDistanceToNow, differenceInDays, addDays } from "date-fns";

interface DeletedItem {
  id: string;
  name: string;
  type: "file" | "folder";
  deleted_at: string;
  mime_type?: string | null;
  file_size?: number;
  data_room_name?: string;
  uploaded_by?: string;
  created_by?: string;
}

interface DataRoomRecyclingBinProps {
  dataRoomId: string;
  organizationId: string;
  roomCreatorId?: string;
  onRestore?: () => void;
}

export const DataRoomRecyclingBin = ({ dataRoomId, organizationId, roomCreatorId, onRestore }: DataRoomRecyclingBinProps) => {
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { profile } = useOrganization();
  const { toast } = useToast();

  // Check if current user is the room creator (can see all items)
  const isRoomCreator = profile?.id === roomCreatorId;

  const fetchDeletedItems = async () => {
    if (!organizationId || !profile?.id) return;

    setLoading(true);
    try {
      // Fetch deleted files with uploaded_by info
      let filesQuery = supabase
        .from("data_room_files")
        .select("id, name, deleted_at, mime_type, file_size, data_room_id, uploaded_by, data_rooms(name)")
        .eq("data_room_id", dataRoomId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      // If not room creator, only show own files
      if (!isRoomCreator) {
        filesQuery = filesQuery.eq("uploaded_by", profile.id);
      }

      const { data: filesData, error: filesError } = await filesQuery;

      if (filesError) throw filesError;

      // Fetch deleted folders with created_by info
      let foldersQuery = supabase
        .from("data_room_folders")
        .select("id, name, deleted_at, data_room_id, created_by, data_rooms(name)")
        .eq("data_room_id", dataRoomId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      // If not room creator, only show own folders
      if (!isRoomCreator) {
        foldersQuery = foldersQuery.eq("created_by", profile.id);
      }

      const { data: foldersData, error: foldersError } = await foldersQuery;

      if (foldersError) throw foldersError;

      const files: DeletedItem[] = (filesData || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: "file" as const,
        deleted_at: f.deleted_at,
        mime_type: f.mime_type,
        file_size: f.file_size,
        data_room_name: f.data_rooms?.name,
        uploaded_by: f.uploaded_by,
      }));

      const folders: DeletedItem[] = (foldersData || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        type: "folder" as const,
        deleted_at: f.deleted_at,
        data_room_name: f.data_rooms?.name,
        created_by: f.created_by,
      }));

      // Combine and sort by deletion date
      const allItems = [...files, ...folders].sort(
        (a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime()
      );

      setDeletedItems(allItems);
    } catch (error) {
      console.error("Error fetching deleted items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && dataRoomId) {
      fetchDeletedItems();
      setSelectedIds(new Set());
    }
  }, [isOpen, dataRoomId, organizationId]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === deletedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletedItems.map((item) => item.id)));
    }
  };

  const restoreItem = async (item: DeletedItem) => {
    try {
      const table = item.type === "file" ? "data_room_files" : "data_room_folders";
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq("id", item.id);

      if (error) throw error;

      setDeletedItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      onRestore?.();

      toast({
        title: `${item.type === "file" ? "File" : "Folder"} restored`,
        description: `"${item.name}" has been restored successfully`,
      });
    } catch (error) {
      console.error("Error restoring item:", error);
      toast({
        title: "Error",
        description: "Failed to restore item",
        variant: "destructive",
      });
    }
  };

  const bulkRestore = async () => {
    if (selectedIds.size === 0) return;

    try {
      const selectedItems = deletedItems.filter((item) => selectedIds.has(item.id));
      const files = selectedItems.filter((item) => item.type === "file");
      const folders = selectedItems.filter((item) => item.type === "folder");

      if (files.length > 0) {
        const { error } = await supabase
          .from("data_room_files")
          .update({ deleted_at: null })
          .in("id", files.map((f) => f.id));
        if (error) throw error;
      }

      if (folders.length > 0) {
        const { error } = await supabase
          .from("data_room_folders")
          .update({ deleted_at: null })
          .in("id", folders.map((f) => f.id));
        if (error) throw error;
      }

      const count = selectedIds.size;
      setDeletedItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      onRestore?.();

      toast({
        title: "Items restored",
        description: `${count} item${count > 1 ? "s" : ""} restored successfully`,
      });
    } catch (error) {
      console.error("Error restoring items:", error);
      toast({
        title: "Error",
        description: "Failed to restore items",
        variant: "destructive",
      });
    }
  };

  const permanentlyDelete = async (item: DeletedItem) => {
    try {
      const table = item.type === "file" ? "data_room_files" : "data_room_folders";
      const { error } = await supabase.from(table).delete().eq("id", item.id);

      if (error) throw error;

      setDeletedItems((prev) => prev.filter((i) => i.id !== item.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });

      toast({
        title: `${item.type === "file" ? "File" : "Folder"} permanently deleted`,
        description: `"${item.name}" has been permanently removed`,
      });
    } catch (error) {
      console.error("Error permanently deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to permanently delete item",
        variant: "destructive",
      });
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const selectedItems = deletedItems.filter((item) => selectedIds.has(item.id));
      const files = selectedItems.filter((item) => item.type === "file");
      const folders = selectedItems.filter((item) => item.type === "folder");

      if (files.length > 0) {
        const { error } = await supabase
          .from("data_room_files")
          .delete()
          .in("id", files.map((f) => f.id));
        if (error) throw error;
      }

      if (folders.length > 0) {
        const { error } = await supabase
          .from("data_room_folders")
          .delete()
          .in("id", folders.map((f) => f.id));
        if (error) throw error;
      }

      const count = selectedIds.size;
      setDeletedItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());

      toast({
        title: "Items permanently deleted",
        description: `${count} item${count > 1 ? "s" : ""} permanently deleted`,
      });
    } catch (error) {
      console.error("Error deleting items:", error);
      toast({
        title: "Error",
        description: "Failed to delete items",
        variant: "destructive",
      });
    }
  };

  const emptyBin = async () => {
    try {
      // Delete all files in this data room's bin
      const { error: filesError } = await supabase
        .from("data_room_files")
        .delete()
        .eq("data_room_id", dataRoomId)
        .not("deleted_at", "is", null);

      if (filesError) throw filesError;

      // Delete all folders in this data room's bin
      const { error: foldersError } = await supabase
        .from("data_room_folders")
        .delete()
        .eq("data_room_id", dataRoomId)
        .not("deleted_at", "is", null);

      if (foldersError) throw foldersError;

      setDeletedItems([]);
      setSelectedIds(new Set());

      toast({
        title: "Recycling bin emptied",
        description: "All deleted items have been permanently removed",
      });
    } catch (error) {
      console.error("Error emptying recycling bin:", error);
      toast({
        title: "Error",
        description: "Failed to empty recycling bin",
        variant: "destructive",
      });
    }
  };

  const getDaysRemaining = (deletedAt: string) => {
    const deleteDate = new Date(deletedAt);
    const expiryDate = addDays(deleteDate, 365); // 12 months
    return differenceInDays(expiryDate, new Date());
  };

  const getFileIcon = (mimeType?: string | null) => {
    if (!mimeType) return <File className="w-4 h-4 text-muted-foreground" />;
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4 text-blue-500" />;
    if (mimeType.startsWith("video/")) return <Video className="w-4 h-4 text-purple-500" />;
    if (mimeType === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-emerald-500" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs justify-start gap-2"
        >
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          Recycling Bin
          {deletedItems.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
              {deletedItems.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Recycling Bin
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Deleted items are kept for 12 months before being permanently removed.
          </p>

          {deletedItems.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2 mr-auto">
                <Checkbox
                  id="select-all"
                  checked={selectedIds.size === deletedItems.length && deletedItems.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  Select all ({selectedIds.size}/{deletedItems.length})
                </label>
              </div>

              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkRestore}
                    className="gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkDelete}
                    className="gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete ({selectedIds.size})
                  </Button>
                </>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={emptyBin}
                className="text-destructive hover:text-destructive"
              >
                Empty Bin
              </Button>
            </div>
          )}

          <ScrollArea className="h-[calc(100vh-200px)]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : deletedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Trash2 className="w-12 h-12 mb-3 opacity-50" />
                <p>Recycling bin is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deletedItems.map((item) => {
                  const daysRemaining = getDaysRemaining(item.deleted_at);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 bg-card border rounded-lg space-y-2 transition-colors ${
                        selectedIds.has(item.id) ? "border-primary/50 bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.type === "folder" ? (
                                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                getFileIcon(item.mime_type)
                              )}
                              <h4 className="font-medium text-sm truncate">
                                {item.name}
                              </h4>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary hover:text-primary"
                                onClick={() => restoreItem(item)}
                                title="Restore item"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => permanentlyDelete(item)}
                                title="Delete permanently"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            <Badge variant="outline" className="text-xs">
                              {item.type === "folder" ? "Folder" : "File"}
                            </Badge>
                            {item.file_size && (
                              <Badge variant="secondary" className="text-xs">
                                {formatFileSize(item.file_size)}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Deleted{" "}
                              {formatDistanceToNow(new Date(item.deleted_at), {
                                addSuffix: true,
                              })}
                            </span>
                            <span className="mx-1">•</span>
                            <span
                              className={
                                daysRemaining <= 30 ? "text-destructive" : ""
                              }
                            >
                              {daysRemaining} days left
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DataRoomRecyclingBin;
