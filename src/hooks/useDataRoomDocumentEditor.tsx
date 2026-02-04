import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface DocumentContent {
  id: string;
  file_id: string;
  data_room_id: string;
  organization_id: string;
  content: string;
  content_type: string;
  last_edited_by: string | null;
  updated_at: string;
}

export interface Collaborator {
  user_id: string;
  full_name: string;
  cursor_position: number | null;
  last_seen_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  file_id: string;
  content: string;
  version_number: number;
  version_note: string | null;
  created_by: string | null;
  created_at: string;
  creator_name?: string;
}

interface UseDataRoomDocumentEditorOptions {
  fileId: string;
  dataRoomId: string;
  organizationId: string;
  filePath?: string;
  mimeType?: string;
  onContentChange?: (content: string) => void;
}

export function useDataRoomDocumentEditor({
  fileId,
  dataRoomId,
  organizationId,
  filePath,
  mimeType,
  onContentChange,
}: UseDataRoomDocumentEditorOptions) {
  const { user } = useAuth();
  const [content, setContent] = useState<string>("");
  const [contentType, setContentType] = useState<"rich_text" | "plain_text">("rich_text");
  const [isLoading, setIsLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionContentRef = useRef<string>("");
  const versionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Parse uploaded document content
  const parseUploadedDocument = useCallback(async (): Promise<string | null> => {
    if (!filePath || !mimeType) return null;

    // Only parse supported document formats
    const parsableTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/pdf",
      "text/plain",
      "text/html",
      "text/markdown",
    ];

    if (!parsableTypes.some(type => mimeType?.includes(type) || mimeType?.startsWith("text/"))) {
      return null;
    }

    setIsParsing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        console.error("No auth token available");
        return null;
      }

      const response = await fetch(
        `https://qiikjhvzlwzysbtzhdcd.supabase.co/functions/v1/parse-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileId,
            filePath,
            mimeType,
            bucket: "data-room-files",
          }),
        }
      );

      const result = await response.json();

      if (result.error) {
        console.error("Parse error:", result.error);
        return null;
      }

      return result.content || null;
    } catch (error) {
      console.error("Error parsing document:", error);
      return null;
    } finally {
      setIsParsing(false);
    }
  }, [fileId, filePath, mimeType]);

  // Load existing document content or create new
  useEffect(() => {
    const loadOrCreateDocument = async () => {
      if (!fileId || !user || !dataRoomId || !organizationId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Check for existing document content
        const { data: existingDoc, error } = await supabase
          .from("data_room_document_content")
          .select("*")
          .eq("file_id", fileId)
          .maybeSingle();

        if (error) {
          console.error("Error loading document:", error);
          setIsLoading(false);
          return;
        }

        if (existingDoc) {
          setDocumentId(existingDoc.id);
          
          // Check if existing content is empty, placeholder, or an error message - if so, try parsing again
          const isPlaceholderContent = existingDoc.content === "<p>Start editing this document...</p>" ||
            existingDoc.content === "" ||
            existingDoc.content === "<p></p>" ||
            existingDoc.content.includes("Could not extract document content");
          
          if (isPlaceholderContent && filePath && mimeType) {
            // Try to re-parse the document since we only have placeholder content
            const parsedContent = await parseUploadedDocument();
            // Accept legacy format messages as valid content
            if (parsedContent && parsedContent.length > 50 && !parsedContent.includes("Could not extract")) {
              // Update the document with parsed content
              await supabase
                .from("data_room_document_content")
                .update({
                  content: parsedContent,
                  last_edited_by: user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existingDoc.id);
              
              setContent(parsedContent);
              lastVersionContentRef.current = parsedContent;
              onContentChange?.(parsedContent);
              setContentType(existingDoc.content_type as "rich_text" | "plain_text");
            } else {
              // Fall back to existing content if parsing fails again
              setContent(existingDoc.content);
              lastVersionContentRef.current = existingDoc.content;
              onContentChange?.(existingDoc.content);
              setContentType(existingDoc.content_type as "rich_text" | "plain_text");
            }
          } else {
            setContent(existingDoc.content);
            setContentType(existingDoc.content_type as "rich_text" | "plain_text");
            lastVersionContentRef.current = existingDoc.content;
            onContentChange?.(existingDoc.content);
          }
        } else {
          // Try to parse the uploaded file
          const parsedContent = await parseUploadedDocument();
          const initialContent = parsedContent || "<p>Start editing this document...</p>";

          // Create new document content
          const { data: newDoc, error: createError } = await supabase
            .from("data_room_document_content")
            .insert({
              file_id: fileId,
              data_room_id: dataRoomId,
              organization_id: organizationId,
              content: initialContent,
              content_type: "rich_text",
              last_edited_by: user.id,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating document:", createError);
          } else if (newDoc) {
            setDocumentId(newDoc.id);
            setContent(newDoc.content);
            lastVersionContentRef.current = newDoc.content;
            onContentChange?.(newDoc.content);

            // Create initial version if content was parsed
            if (parsedContent) {
              await supabase.from("data_room_document_versions").insert({
                document_id: newDoc.id,
                file_id: fileId,
                data_room_id: dataRoomId,
                organization_id: organizationId,
                content: parsedContent,
                version_number: 1,
                created_by: user.id,
                version_note: "Initial version from uploaded file",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error in loadOrCreateDocument:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOrCreateDocument();
  }, [fileId, user, dataRoomId, organizationId, parseUploadedDocument, onContentChange]);

  // Set up realtime subscription for collaborative editing
  useEffect(() => {
    if (!fileId || !user) return;

    const channel = supabase
      .channel(`dataroom-document:${fileId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "data_room_document_content",
          filter: `file_id=eq.${fileId}`,
        },
        (payload) => {
          const newData = payload.new as DocumentContent;
          if (newData.last_edited_by !== user.id) {
            setContent(newData.content);
            onContentChange?.(newData.content);
          }
        }
      )
      .subscribe();

    // Update presence
    const updatePresence = async () => {
      await supabase
        .from("data_room_document_presence")
        .upsert(
          {
            file_id: fileId,
            user_id: user.id,
            last_seen_at: new Date().toISOString(),
          },
          {
            onConflict: "file_id,user_id",
          }
        );
    };

    updatePresence();
    const presenceInterval = setInterval(updatePresence, 30000);

    // Fetch active collaborators
    const fetchCollaborators = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: presenceData } = await supabase
        .from("data_room_document_presence")
        .select("user_id, cursor_position, last_seen_at")
        .eq("file_id", fileId)
        .gte("last_seen_at", fiveMinutesAgo)
        .neq("user_id", user.id);

      if (presenceData && presenceData.length > 0) {
        const userIds = presenceData.map((p) => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) || []);

        setCollaborators(
          presenceData.map((p) => ({
            ...p,
            full_name: profileMap.get(p.user_id) || "Unknown",
          }))
        );
      } else {
        setCollaborators([]);
      }
    };

    fetchCollaborators();
    const collaboratorsInterval = setInterval(fetchCollaborators, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(presenceInterval);
      clearInterval(collaboratorsInterval);

      // Remove presence on unmount
      supabase
        .from("data_room_document_presence")
        .delete()
        .eq("file_id", fileId)
        .eq("user_id", user.id);
    };
  }, [fileId, user, onContentChange]);

  // Create version
  const createVersion = useCallback(
    async (contentToSave: string, note?: string) => {
      if (!documentId || !user || !fileId || !dataRoomId || !organizationId) return;

      if (contentToSave === lastVersionContentRef.current) return;

      try {
        const { data: latestVersion } = await supabase
          .from("data_room_document_versions")
          .select("version_number")
          .eq("document_id", documentId)
          .order("version_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextVersionNumber = (latestVersion?.version_number || 0) + 1;

        const { error } = await supabase.from("data_room_document_versions").insert({
          document_id: documentId,
          file_id: fileId,
          data_room_id: dataRoomId,
          organization_id: organizationId,
          content: contentToSave,
          version_number: nextVersionNumber,
          created_by: user.id,
          version_note: note || null,
        });

        if (error) {
          console.error("Error creating version:", error);
          return;
        }

        // Log version creation activity
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        await supabase.from("data_room_activity").insert({
          data_room_id: dataRoomId,
          organization_id: organizationId,
          user_id: user.id,
          user_name: profile?.full_name || "Unknown",
          user_email: user.email || "",
          action: "version_created",
          is_guest: false,
          details: { fileId, versionNumber: nextVersionNumber },
        });

        lastVersionContentRef.current = contentToSave;
        fetchVersions();
      } catch (error) {
        console.error("Error creating version:", error);
      }
    },
    [documentId, user, fileId, dataRoomId, organizationId]
  );

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    if (!documentId) return;

    setIsLoadingVersions(true);
    try {
      const { data, error } = await supabase
        .from("data_room_document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Error fetching versions:", error);
        return;
      }

      // Get creator names
      const creatorIds = [...new Set(data?.map((v) => v.created_by).filter(Boolean))];
      let creatorMap = new Map<string, string>();

      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds as string[]);

        creatorMap = new Map(profiles?.map((p) => [p.id, p.full_name || "Unknown"]) || []);
      }

      setVersions(
        (data || []).map((v) => ({
          ...v,
          creator_name: v.created_by ? creatorMap.get(v.created_by) || "Unknown" : "Unknown",
        }))
      );
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [documentId]);

  // Restore version
  const restoreVersion = useCallback(
    async (version: DocumentVersion) => {
      if (!documentId || !user) return;

      try {
        // Save current content as a version first
        await createVersion(content, "Auto-saved before restore");

        // Update document with restored content
        const { error } = await supabase
          .from("data_room_document_content")
          .update({
            content: version.content,
            last_edited_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", documentId);

        if (error) {
          toast.error("Failed to restore version");
          return;
        }

        setContent(version.content);
        onContentChange?.(version.content);
        toast.success(`Restored to version ${version.version_number}`);

        // Create a new version for the restoration
        await createVersion(version.content, `Restored from version ${version.version_number}`);
      } catch (error) {
        console.error("Error restoring version:", error);
        toast.error("Failed to restore version");
      }
    },
    [documentId, user, content, createVersion, onContentChange]
  );

  // Save content
  const saveContent = useCallback(
    async (contentToSave: string) => {
      if (!documentId || !user) return;

      setIsSaving(true);
      try {
        const { error } = await supabase
          .from("data_room_document_content")
          .update({
            content: contentToSave,
            last_edited_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", documentId);

        if (error) {
          console.error("Error saving:", error);
          return;
        }

        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving:", error);
      } finally {
        setIsSaving(false);
      }
    },
    [documentId, user]
  );

  // Update content with debounced save
  const updateContent = useCallback(
    (newContent: string) => {
      setContent(newContent);
      onContentChange?.(newContent);

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
          createVersion(newContent);
          versionIntervalRef.current = null;
        }, 2 * 60 * 1000);
      }
    },
    [saveContent, createVersion, onContentChange]
  );

  // Manual save
  const save = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveContent(content);
  }, [content, saveContent]);

  // Manual version save
  const saveVersion = useCallback(
    (note?: string) => {
      createVersion(content, note);
    },
    [content, createVersion]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (versionIntervalRef.current) {
        clearTimeout(versionIntervalRef.current);
      }
    };
  }, []);

  return {
    content,
    contentType,
    isLoading,
    isParsing,
    isSaving,
    lastSaved,
    collaborators,
    versions,
    isLoadingVersions,
    updateContent,
    save,
    saveVersion,
    restoreVersion,
    fetchVersions,
  };
}
