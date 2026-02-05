import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DocumentEditor } from "@/components/drive/DocumentEditor";
import { supabase } from "@/integrations/supabase/client";
import { X, FileText, Cloud, CloudOff, Loader2, Check, Save } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface GuestDataRoomDocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    id: string;
    name: string;
    file_path?: string;
    mime_type?: string | null;
  } | null;
  token: string;
  email: string;
  guestName: string;
  dataRoomId: string;
  organizationId: string;
}

interface DocumentContent {
  id: string;
  file_id: string;
  data_room_id: string;
  organization_id: string;
  content: string;
  content_type: string;
  last_edited_by: string | null;
  updated_at: string;
}

export function GuestDataRoomDocumentEditorDialog({
  open,
  onOpenChange,
  file,
  token,
  email,
  guestName,
  dataRoomId,
  organizationId,
}: GuestDataRoomDocumentEditorDialogProps) {
  const [content, setContent] = useState<string>("");
  const [contentType, setContentType] = useState<"rich_text" | "plain_text">("rich_text");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionContentRef = useRef<string>("");
  const versionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcastTimeRef = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedContentRef = useRef<string>("");
  const guestIdentifier = useRef<string>(`guest-${email}-${Date.now()}`);

  // Load document content when dialog opens
  useEffect(() => {
    const loadDocument = async () => {
      if (!open || !file?.id) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "guest-get-document-content",
          {
            body: { token, email: email.toLowerCase(), fileId: file.id },
          }
        );

        if (error) {
          console.error("Error loading document:", error);
          toast.error("Failed to load document");
          onOpenChange(false);
          return;
        }

        if (data?.error) {
          toast.error(data.error);
          onOpenChange(false);
          return;
        }

        const doc = data.document as DocumentContent;
        setDocumentId(doc.id);
        setContent(doc.content);
        setContentType(doc.content_type as "rich_text" | "plain_text");
        lastVersionContentRef.current = doc.content;
      } catch (err) {
        console.error("Failed to load document:", err);
        toast.error("Failed to load document");
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [open, file?.id, token, email, onOpenChange]);

  // Set up broadcast channel for cross-user sync
  useEffect(() => {
    if (!open || !file?.id) return;

    const channelName = `document-sync:${file.id}`;
    const channel = supabase.channel(channelName);

    channel
      .on("broadcast", { event: "content_update" }, (payload) => {
        const { content: newContent, userId, timestamp } = payload.payload || {};
        
        // Only update if from another user (not this guest)
        if (userId && userId !== guestIdentifier.current && newContent) {
          console.log("[GuestDocEditor] Received broadcast update from:", userId);
          setContent(newContent);
          lastFetchedContentRef.current = newContent;
        }
      })
      .subscribe();

    broadcastChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      broadcastChannelRef.current = null;
    };
  }, [open, file?.id]);

  // Polling fallback for sync (every 5 seconds)
  useEffect(() => {
    if (!open || !file?.id || !documentId) return;

    const pollForUpdates = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "guest-get-document-content",
          {
            body: { token, email: email.toLowerCase(), fileId: file.id },
          }
        );

        if (!error && data?.document) {
          const serverContent = data.document.content;
          // Only update if server has newer content that we didn't just write
          if (serverContent !== lastFetchedContentRef.current && serverContent !== content) {
            console.log("[GuestDocEditor] Polling detected updated content");
            setContent(serverContent);
            lastFetchedContentRef.current = serverContent;
          }
        }
      } catch (err) {
        console.error("[GuestDocEditor] Polling error:", err);
      }
    };

    pollingIntervalRef.current = setInterval(pollForUpdates, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [open, file?.id, documentId, token, email, content]);

  // Broadcast content change to other users
  const broadcastContentChange = useCallback(
    (newContent: string) => {
      if (!broadcastChannelRef.current) return;
      
      // Throttle broadcasts to max once per second
      const now = Date.now();
      if (now - lastBroadcastTimeRef.current < 1000) return;
      lastBroadcastTimeRef.current = now;
      
      broadcastChannelRef.current.send({
        type: "broadcast",
        event: "content_update",
        payload: {
          content: newContent,
          userId: guestIdentifier.current,
          timestamp: now,
        },
      });
    },
    []
  );

  // Save content
  const saveContent = useCallback(
    async (contentToSave: string, createVersion = false, versionNote?: string) => {
      if (!documentId || !file?.id) return;

      setIsSaving(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "guest-save-document-content",
          {
            body: {
              token,
              email: email.toLowerCase(),
              fileId: file.id,
              documentId,
              content: contentToSave,
              createVersion,
              versionNote,
            },
          }
        );

        if (error) {
          console.error("Error saving:", error);
          return;
        }

        if (data?.error) {
          console.error("Save error:", data.error);
          return;
        }

        setLastSaved(new Date());
        if (createVersion) {
          lastVersionContentRef.current = contentToSave;
        }
        lastFetchedContentRef.current = contentToSave;
      } catch (err) {
        console.error("Error saving:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [documentId, file?.id, token, email]
  );

  // Update content with debounced save
  const updateContent = useCallback(
    (newContent: string) => {
      setContent(newContent);
      lastFetchedContentRef.current = newContent;
      
      // Broadcast change to other users
      broadcastContentChange(newContent);

      // Debounce save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveContent(newContent);
      }, 1000);

      // Create version every 2 minutes
      if (!versionIntervalRef.current) {
        versionIntervalRef.current = setTimeout(() => {
          saveContent(newContent, true, "Auto-saved version");
          versionIntervalRef.current = null;
        }, 2 * 60 * 1000);
      }
    },
    [saveContent, broadcastContentChange]
  );

  // Manual save
  const handleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveContent(content);
  }, [content, saveContent]);

  // Manual version save
  const handleSaveVersion = useCallback(() => {
    saveContent(content, true, `Saved by ${guestName}`);
    toast.success("Version saved");
  }, [content, saveContent, guestName]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (versionIntervalRef.current) {
        clearTimeout(versionIntervalRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setContent("");
      setDocumentId(null);
      setLastSaved(null);
      setIsLoading(true);
      lastFetchedContentRef.current = "";
    }
  }, [open]);

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">{file.name}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isSaving ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                ) : lastSaved ? (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" />
                    Saved {format(lastSaved, "h:mm a")}
                  </span>
                ) : (
                  <span>Not saved</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Version Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveVersion}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save Version</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a named version snapshot</TooltipContent>
            </Tooltip>

            {/* Editing as indicator */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
              <span>Editing as {guestName}</span>
            </div>

            {/* Sync Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
                    isSaving
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}
                >
                  {isSaving ? (
                    <>
                      <CloudOff className="w-3 h-3" />
                      Syncing
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3 h-3" />
                      Synced
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isSaving ? "Changes are being saved..." : "All changes saved to cloud"}
              </TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          ) : (
            <DocumentEditor
              content={content}
              onContentChange={updateContent}
              contentType={contentType}
              className="h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GuestDataRoomDocumentEditorDialog;
