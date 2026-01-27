import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface DriveStorageData {
  used: number;
  total: number;
  additionalGb: number;
}

export const DRIVE_STORAGE_QUERY_KEY = "drive-storage";

export function useDriveStorage(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [DRIVE_STORAGE_QUERY_KEY, organizationId],
    queryFn: async (): Promise<DriveStorageData> => {
      if (!organizationId) {
        return { used: 0, total: 100 * 1024 * 1024, additionalGb: 0 };
      }

      // Get file usage
      const { data: filesData } = await supabase
        .from("drive_files")
        .select("file_size")
        .eq("organization_id", organizationId)
        .is("deleted_at", null);
      
      const used = filesData?.reduce((acc, f) => acc + (f.file_size || 0), 0) || 0;

      // Get additional purchased storage
      const { data: storageData } = await supabase
        .from("organization_storage")
        .select("additional_storage_gb")
        .eq("organization_id", organizationId)
        .maybeSingle();

      const additionalGb = storageData?.additional_storage_gb || 0;
      const baseStorage = 100 * 1024 * 1024; // 100MB base
      const additionalBytes = additionalGb * 1024 * 1024 * 1024; // Convert GB to bytes

      return {
        used,
        total: baseStorage + additionalBytes,
        additionalGb,
      };
    },
    enabled: !!organizationId,
    staleTime: 30000, // 30 seconds
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [DRIVE_STORAGE_QUERY_KEY] });
  }, [queryClient]);

  const refetch = useCallback(() => {
    queryClient.refetchQueries({ queryKey: [DRIVE_STORAGE_QUERY_KEY, organizationId] });
  }, [queryClient, organizationId]);

  return {
    ...query,
    invalidate,
    refetch,
  };
}

// Utility function to invalidate drive storage from anywhere
export function invalidateDriveStorage(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [DRIVE_STORAGE_QUERY_KEY] });
}
