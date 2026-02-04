import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface DocumentContent {
  id: string;
  file_id: string;
  content: string;
  content_type: "rich_text" | "plain_text";
  last_edited_by: string | null;
  updated_at: string;
}

interface Collaborator {
  user_id: string;
  cursor_position: number;
  last_seen_at: string;
  full_name?: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  file_id: string;
  content: string;
  version_number: number;
  created_by: string | null;
  created_at: string;
  version_note: string | null;
  creator_name?: string;
}

interface UseDocumentEditorOptions {
  fileId: string;
  filePath?: string;
  mimeType?: string;
  onContentChange?: (content: string) => void;
}

export function useDocumentEditor({ fileId, filePath, mimeType, onContentChange }: UseDocumentEditorOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState<string>("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"rich_text" | "plain_text">("rich_text");
  const [isLoading, setIsLoading] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionRefreshTrigger, setVersionRefreshTrigger] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const versionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVersionContentRef = useRef<string>("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Parse uploaded document content
  const parseUploadedDocument = async (): Promise<string | null> => {
    if (!filePath || !fileId) return null;

    // Check if this is a parseable file type
    const lowerMimeType = (mimeType || '').toLowerCase();
    const lowerPath = filePath.toLowerCase();
    
    const isParseable = 
      lowerMimeType.includes('word') ||
      lowerMimeType.includes('officedocument.wordprocessingml') ||
      lowerMimeType.includes('excel') ||
      lowerMimeType.includes('spreadsheet') ||
      lowerMimeType.includes('officedocument.spreadsheetml') ||
      lowerMimeType.includes('pdf') ||
      lowerPath.endsWith('.docx') ||
      lowerPath.endsWith('.doc') ||
      lowerPath.endsWith('.xlsx') ||
      lowerPath.endsWith('.xls') ||
      lowerPath.endsWith('.pdf');

    if (!isParseable) return null;

    setIsParsing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        console.error('No auth token available');
        return null;
      }

      const response = await fetch(
        `https://qiikjhvzlwzysbtzhdcd.supabase.co/functions/v1/parse-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId,
            filePath,
            mimeType,
          }),
        }
      );

      if (!response.ok) {
        console.error('Failed to parse document:', response.statusText);
        return null;
      }

      const result = await response.json();
      
      if (result.error) {
        console.warn('Document parsing warning:', result.error);
      }
      
      return result.content || null;
    } catch (error) {
      console.error('Error parsing document:', error);
      return null;
    } finally {
      setIsParsing(false);
    }
  };

  // Load or create document content
  useEffect(() => {
    async function loadOrCreateDocument() {
      if (!fileId || !user) return;
      
      setIsLoading(true);
      try {
        // First, try to get existing document content
        const { data: existingDoc, error: fetchError } = await supabase
          .from("drive_document_content")
          .select("*")
          .eq("file_id", fileId)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching document:", fetchError);
          toast.error("Failed to load document");
          return;
        }

        if (existingDoc) {
          setDocumentId(existingDoc.id);
          
          // Check if existing content is empty, placeholder, or an error message - if so, try parsing again
          const isEmptyOrPlaceholder = !existingDoc.content || 
            existingDoc.content === "" || 
            existingDoc.content === "<p></p>" ||
            existingDoc.content === "<p>Start editing this document...</p>" ||
            existingDoc.content.includes("Could not extract document content");
          
          if (isEmptyOrPlaceholder && filePath && mimeType) {
            // Try to re-parse the document since we only have placeholder content
            const parsedContent = await parseUploadedDocument();
            // Only use parsed content if it's valid - either meaningful content or a legacy format message
            const isValidParsedContent = parsedContent && 
              parsedContent.length > 50 &&
              !parsedContent.includes("Could not extract document content") &&
              !parsedContent.includes("<p></p>");
            
            if (isValidParsedContent) {
              // Update the document with parsed content
              await supabase
                .from("drive_document_content")
                .update({
                  content: parsedContent,
                  last_edited_by: user.id,
                })
                .eq("id", existingDoc.id);
              
              setContent(parsedContent);
              lastVersionContentRef.current = parsedContent;
              onContentChange?.(parsedContent);
              toast.success("Document content loaded from uploaded file");
              
              // Create initial version with parsed content
              const { data: latestVersion } = await supabase
                .from("drive_document_versions")
                .select("version_number")
                .eq("document_id", existingDoc.id)
                .order("version_number", { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (!latestVersion) {
                await supabase
                  .from("drive_document_versions")
                  .insert({
                    document_id: existingDoc.id,
                    file_id: fileId,
                    content: parsedContent,
                    version_number: 1,
                    created_by: user.id,
                    version_note: "Original uploaded content",
                  });
              }
            } else {
              // Fall back to existing content if parsing fails or returns error
              setContent(existingDoc.content);
              lastVersionContentRef.current = existingDoc.content;
              onContentChange?.(existingDoc.content);
            }
          } else {
            setContent(existingDoc.content);
            lastVersionContentRef.current = existingDoc.content;
            onContentChange?.(existingDoc.content);
          }
          
          setContentType(existingDoc.content_type as "rich_text" | "plain_text");
          setLastSaved(new Date(existingDoc.updated_at));
        } else {
          // No existing document content - try to parse the uploaded file
          let initialContent = "";
          
          if (filePath && mimeType) {
            const parsedContent = await parseUploadedDocument();
            // Only use parsed content if it's valid - either meaningful content or a legacy format message
            const isValidParsedContent = parsedContent && 
              parsedContent.length > 50 &&
              !parsedContent.includes("Could not extract document content") &&
              !parsedContent.includes("<p></p>");
            
            if (isValidParsedContent) {
              initialContent = parsedContent;
              toast.success("Document content loaded from uploaded file");
            }
          }

          // Create new document content entry with parsed content (or empty)
          const { data: newDoc, error: createError } = await supabase
            .from("drive_document_content")
            .insert({
              file_id: fileId,
              content: initialContent,
              content_type: "rich_text",
              last_edited_by: user.id,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating document:", createError);
            toast.error("Failed to create document");
            return;
          }

          setDocumentId(newDoc.id);
          setContent(newDoc.content);
          setContentType(newDoc.content_type as "rich_text" | "plain_text");
          setLastSaved(new Date(newDoc.updated_at));
          lastVersionContentRef.current = initialContent;
          
          // Create initial version if we parsed content
          if (initialContent) {
            // We'll create the version after documentId is set
            setTimeout(async () => {
              try {
                await supabase
                  .from("drive_document_versions")
                  .insert({
                    document_id: newDoc.id,
                    file_id: fileId,
                    content: initialContent,
                    version_number: 1,
                    created_by: user.id,
                    version_note: "Original uploaded content",
                  });
              } catch (e) {
                console.error("Error creating initial version:", e);
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error("Error in loadOrCreateDocument:", error);
        toast.error("Failed to load document");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrCreateDocument();
  }, [fileId, user, filePath, mimeType]);

  // Set up realtime subscription for collaborative editing
  useEffect(() => {
    if (!fileId || !user) return;

    // Subscribe to document content changes
    const channel = supabase
      .channel(`document:${fileId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drive_document_content",
          filter: `file_id=eq.${fileId}`,
        },
        (payload) => {
          const newData = payload.new as DocumentContent;
          // Only update if the change is from another user
          if (newData.last_edited_by !== user.id) {
            setContent(newData.content);
            onContentChange?.(newData.content);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Update presence
    const updatePresence = async () => {
      await supabase
        .from("drive_document_presence")
        .upsert({
          file_id: fileId,
          user_id: user.id,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: "file_id,user_id"
        });
    };

    // Initial presence update
    updatePresence();

    // Periodic presence updates
    const presenceInterval = setInterval(updatePresence, 30000);

    // Fetch active collaborators
    const fetchCollaborators = async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: presenceData } = await supabase
        .from("drive_document_presence")
        .select("user_id, cursor_position, last_seen_at")
        .eq("file_id", fileId)
        .gte("last_seen_at", fiveMinutesAgo)
        .neq("user_id", user.id);

      if (presenceData && presenceData.length > 0) {
        // Fetch user names
        const userIds = presenceData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        setCollaborators(presenceData.map(p => ({
          ...p,
          full_name: profileMap.get(p.user_id) || "Unknown",
        })));
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
        .from("drive_document_presence")
        .delete()
        .eq("file_id", fileId)
        .eq("user_id", user.id);
    };
  }, [fileId, user, onContentChange]);

  // Create a new version snapshot
  const createVersion = useCallback(async (contentToSave: string, note?: string) => {
    if (!documentId || !user || !fileId) return;

    // Don't create version if content hasn't changed significantly
    if (contentToSave === lastVersionContentRef.current) return;

    try {
      // Get the current file details first
      const { data: currentFile, error: fileError } = await supabase
        .from("drive_files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (fileError || !currentFile) {
        console.error("Error fetching current file:", fileError);
        return;
      }

      // Get the parent file ID (for version chain)
      const parentId = currentFile.parent_file_id || currentFile.id;

      // Get the latest version number from drive_files (for View Versions)
      const { data: latestFileVersions } = await supabase
        .from("drive_files")
        .select("version")
        .or(`id.eq.${parentId},parent_file_id.eq.${parentId}`)
        .is("deleted_at", null)
        .order("version", { ascending: false })
        .limit(1);

      const latestFileVersion = latestFileVersions?.[0]?.version || currentFile.version || 1;
      const nextVersionNumber = latestFileVersion + 1;

      // 1. Create document content version for edit history
      const { error: docVersionError } = await supabase
        .from("drive_document_versions")
        .insert({
          document_id: documentId,
          file_id: fileId,
          content: contentToSave,
          version_number: nextVersionNumber,
          created_by: user.id,
          version_note: note || null,
        });

      if (docVersionError) {
        console.error("Error creating document version:", docVersionError);
        return;
      }

      // 2. Create new drive_files entry for View Versions feature
      // This allows the version to appear in the file version history dialog
      const { data: newFileVersion, error: newFileError } = await supabase
        .from("drive_files")
        .insert({
          organization_id: currentFile.organization_id,
          folder_id: currentFile.folder_id,
          name: currentFile.name,
          file_path: currentFile.file_path, // Keep original file path
          file_size: currentFile.file_size,
          mime_type: currentFile.mime_type,
          uploaded_by: user.id,
          version: nextVersionNumber,
          parent_file_id: parentId,
          status: "not_opened",
          file_category: currentFile.file_category,
          is_restricted: currentFile.is_restricted,
          requires_signature: currentFile.requires_signature,
          assigned_to: currentFile.assigned_to,
          description: note || `Edit version ${nextVersionNumber}`,
        })
        .select("id")
        .single();

      if (newFileError) {
        console.error("Error creating file version entry:", newFileError);
      } else if (newFileVersion) {
        // 3. Create document content entry for the new file version
        // This links the edited content to the new file version
        await supabase
          .from("drive_document_content")
          .insert({
            file_id: newFileVersion.id,
            content: contentToSave,
            content_type: "rich_text",
            last_edited_by: user.id,
          });
        
        // Show success toast for manual saves
        if (note) {
          toast.success(`Version ${nextVersionNumber} saved`);
        }
      }

      lastVersionContentRef.current = contentToSave;
      // Trigger versions refresh and invalidate queries
      setVersionRefreshTrigger(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ["drive-files"] });
      queryClient.invalidateQueries({ queryKey: ["file-versions"] });
    } catch (error) {
      console.error("Error creating version:", error);
    }
  }, [documentId, user, fileId, queryClient]);

  // Fetch version history
  const fetchVersions = useCallback(async () => {
    if (!documentId || !fileId) return;

    setIsLoadingVersions(true);
    try {
      const { data: versionsData, error } = await supabase
        .from("drive_document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Error fetching versions:", error);
        return;
      }

      if (versionsData && versionsData.length > 0) {
        // Fetch creator names
        const creatorIds = versionsData
          .map(v => v.created_by)
          .filter((id): id is string => id !== null);
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        setVersions(versionsData.map(v => ({
          ...v,
          creator_name: v.created_by ? profileMap.get(v.created_by) || "Unknown" : "System",
        })));
      } else {
        setVersions([]);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setIsLoadingVersions(false);
    }
  }, [documentId, fileId]);

  // Load versions when documentId is available or when refresh is triggered
  useEffect(() => {
    if (documentId) {
      fetchVersions();
    }
  }, [documentId, fetchVersions, versionRefreshTrigger]);

  // Restore a specific version
  const restoreVersion = useCallback(async (version: DocumentVersion) => {
    if (!documentId || !user) return;

    try {
      // First, save current content as a version before restoring
      await createVersion(content, "Auto-saved before restore");

      // Update the document content
      const { error } = await supabase
        .from("drive_document_content")
        .update({
          content: version.content,
          last_edited_by: user.id,
        })
        .eq("id", documentId);

      if (error) {
        console.error("Error restoring version:", error);
        toast.error("Failed to restore version");
        return;
      }

      setContent(version.content);
      onContentChange?.(version.content);
      setLastSaved(new Date());
      
      // Create a new version for the restore action
      await createVersion(version.content, `Restored from version ${version.version_number}`);
      
      toast.success(`Restored to version ${version.version_number}`);
    } catch (error) {
      console.error("Error restoring version:", error);
      toast.error("Failed to restore version");
    }
  }, [documentId, user, content, createVersion, onContentChange]);

  // Auto-save with debounce
  const saveContent = useCallback(async (newContent: string) => {
    if (!documentId || !user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("drive_document_content")
        .update({
          content: newContent,
          last_edited_by: user.id,
        })
        .eq("id", documentId);

      if (error) {
        console.error("Error saving document:", error);
        toast.error("Failed to save changes");
        return;
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [documentId, user]);

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    onContentChange?.(newContent);

    // Debounce save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000);

    // Create version every 2 minutes of editing
    if (versionTimeoutRef.current) {
      clearTimeout(versionTimeoutRef.current);
    }

    versionTimeoutRef.current = setTimeout(() => {
      createVersion(newContent);
    }, 120000); // 2 minutes
  }, [saveContent, onContentChange, createVersion]);

  // Manual save with version
  const save = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveContent(content);
  }, [content, saveContent]);

  // Manual version creation
  const saveVersion = useCallback((note?: string) => {
    createVersion(content, note);
  }, [content, createVersion]);

  // Update cursor position for presence
  const updateCursorPosition = useCallback(async (position: number) => {
    if (!fileId || !user) return;

    await supabase
      .from("drive_document_presence")
      .upsert({
        file_id: fileId,
        user_id: user.id,
        cursor_position: position,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: "file_id,user_id"
      });
  }, [fileId, user]);

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
    updateCursorPosition,
    setContentType,
  };
}
