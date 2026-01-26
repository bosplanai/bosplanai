import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export interface ProjectAttachment {
  id: string;
  project_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
  signed_url?: string;
}

export const useProjectAttachments = (projectId: string | null) => {
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from("project-attachments")
        .createSignedUrl(filePath, 3600);
      if (error) throw error;
      return data.signedUrl;
    } catch {
      return null;
    }
  };

  const fetchAttachments = useCallback(async () => {
    if (!projectId) {
      setAttachments([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_attachments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Generate signed URLs for all attachments
      const withUrls = await Promise.all(
        (data || []).map(async (att) => ({
          ...att,
          signed_url: await getSignedUrl(att.file_path),
        }))
      );

      setAttachments(withUrls);
    } catch (error) {
      console.error("Error fetching project attachments:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const uploadAttachment = async (
    file: File,
    organizationId: string
  ): Promise<ProjectAttachment | null> => {
    if (!projectId) return null;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const fileExt = file.name.split(".").pop();
    // Use organization_id as the folder path to match storage RLS policies
    const filePath = `${organizationId}/${projectId}_${Date.now()}.${fileExt}`;

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("project-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert into project_attachments table
      const { data, error } = await supabase
        .from("project_attachments")
        .insert({
          project_id: projectId,
          organization_id: organizationId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const signedUrl = await getSignedUrl(filePath);
      const newAttachment: ProjectAttachment = { ...data, signed_url: signedUrl ?? undefined };

      setAttachments((prev) => [...prev, newAttachment]);

      toast({ title: "Attachment uploaded" });
      return newAttachment;
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteAttachment = async (attachmentId: string, filePath: string) => {
    try {
      // Delete from storage
      await supabase.storage.from("project-attachments").remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from("project_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast({ title: "Attachment removed" });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    attachments,
    loading,
    uploadAttachment,
    deleteAttachment,
    refetch: fetchAttachments,
  };
};
