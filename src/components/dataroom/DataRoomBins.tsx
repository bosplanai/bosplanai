import { useState, useEffect } from "react";
import { Trash2, Archive, RotateCcw, Loader2, FolderLock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface DeletedRoom {
  id: string;
  name: string;
  description: string | null;
  deleted_at: string;
  nda_required: boolean;
}

interface ArchivedRoom {
  id: string;
  name: string;
  description: string | null;
  archived_at: string;
  nda_required: boolean;
}

interface DataRoomBinsProps {
  organizationId: string;
  userId: string;
  onRestore?: () => void;
}

export const DataRoomBins = ({ organizationId, userId, onRestore }: DataRoomBinsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [deletedRooms, setDeletedRooms] = useState<DeletedRoom[]>([]);
  const [archivedRooms, setArchivedRooms] = useState<ArchivedRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [permanentlyDeletingId, setPermanentlyDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDeletedRooms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("data_rooms")
        .select("id, name, description, deleted_at, nda_required")
        .eq("organization_id", organizationId)
        .eq("created_by", userId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setDeletedRooms((data as unknown as DeletedRoom[]) || []);
    } catch (error) {
      console.error("Error fetching deleted rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("data_rooms")
        .select("id, name, description, archived_at, nda_required")
        .eq("organization_id", organizationId)
        .eq("created_by", userId)
        .eq("status", "archived")
        .is("deleted_at", null)
        .order("archived_at", { ascending: false });

      if (error) throw error;
      setArchivedRooms((data as unknown as ArchivedRoom[]) || []);
    } catch (error) {
      console.error("Error fetching archived rooms:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeletedRooms();
      fetchArchivedRooms();
    }
  }, [isOpen, organizationId, userId]);

  const restoreDeletedRoom = async (roomId: string) => {
    setRestoringId(roomId);
    try {
      const { error } = await supabase
        .from("data_rooms")
        .update({ deleted_at: null } as any)
        .eq("id", roomId);

      if (error) throw error;

      setDeletedRooms(prev => prev.filter(r => r.id !== roomId));
      toast({
        title: "Data Room restored",
        description: "The data room has been restored from the recycling bin."
      });
      onRestore?.();
    } catch (error: any) {
      toast({
        title: "Restore failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRestoringId(null);
    }
  };

  const restoreArchivedRoom = async (roomId: string) => {
    setRestoringId(roomId);
    try {
      const { error } = await supabase
        .from("data_rooms")
        .update({ status: "active", archived_at: null } as any)
        .eq("id", roomId);

      if (error) throw error;

      setArchivedRooms(prev => prev.filter(r => r.id !== roomId));
      toast({
        title: "Data Room restored",
        description: "The data room has been restored from the archive."
      });
      onRestore?.();
    } catch (error: any) {
      toast({
        title: "Restore failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRestoringId(null);
    }
  };

  const permanentlyDeleteRoom = async (roomId: string) => {
    setPermanentlyDeletingId(roomId);
    try {
      // First delete all related data - use type assertions for tables without generated types
      await supabase.from("data_room_files").delete().eq("data_room_id", roomId);
      await supabase.from("data_room_folders").delete().eq("data_room_id", roomId);
      await supabase.from("data_room_invites").delete().eq("data_room_id", roomId);
      await supabase.from("data_room_messages").delete().eq("data_room_id", roomId);
      await supabase.from("data_room_activity").delete().eq("data_room_id", roomId);
      await supabase.from("data_room_members").delete().eq("data_room_id", roomId);

      // Then delete the room itself
      const { error } = await supabase
        .from("data_rooms")
        .delete()
        .eq("id", roomId);

      if (error) throw error;

      setDeletedRooms(prev => prev.filter(r => r.id !== roomId));
      toast({
        title: "Data Room permanently deleted",
        description: "The data room and all its contents have been permanently removed."
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPermanentlyDeletingId(null);
    }
  };

  const getDaysRemaining = (deletedAt: string): number => {
    const deleteDate = new Date(deletedAt);
    const expiryDate = addMonths(deleteDate, 12);
    return Math.max(0, differenceInDays(expiryDate, new Date()));
  };

  const totalCount = deletedRooms.length + archivedRooms.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Bins
          {totalCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {totalCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Data Room Bins</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="recycled" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="recycled" className="gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              Recycled
              {deletedRooms.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {deletedRooms.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="w-3.5 h-3.5" />
              Archived
              {archivedRooms.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {archivedRooms.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recycled" className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : deletedRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Recycling bin is empty</p>
                <p className="text-sm mt-1">Deleted data rooms will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Items are permanently deleted after 12 months
                  </p>
                  {deletedRooms.map(room => {
                    const daysRemaining = getDaysRemaining(room.deleted_at);
                    return (
                      <Card key={room.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-muted/50">
                            <FolderLock className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{room.name}</p>
                            {room.description && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {room.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">
                                Deleted {format(new Date(room.deleted_at), "MMM d, yyyy")}
                              </span>
                              <Badge 
                                variant={daysRemaining <= 30 ? "destructive" : "secondary"} 
                                className="text-[10px] h-4"
                              >
                                {daysRemaining} days left
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => restoreDeletedRoom(room.id)}
                            disabled={restoringId === room.id}
                          >
                            {restoringId === room.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => permanentlyDeleteRoom(room.id)}
                            disabled={permanentlyDeletingId === room.id}
                          >
                            {permanentlyDeletingId === room.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Delete Forever
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="archived" className="mt-4">
            {archivedRooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No archived rooms</p>
                <p className="text-sm mt-1">Archived data rooms will appear here</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Archived rooms are hidden but can be restored anytime
                  </p>
                  {archivedRooms.map(room => (
                    <Card key={room.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <FolderLock className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{room.name}</p>
                          {room.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {room.description}
                            </p>
                          )}
                          <span className="text-xs text-muted-foreground mt-2 block">
                            Archived {room.archived_at ? format(new Date(room.archived_at), "MMM d, yyyy") : "Unknown"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => restoreArchivedRoom(room.id)}
                          disabled={restoringId === room.id}
                        >
                          {restoringId === room.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Restore
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default DataRoomBins;
