import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface DataroomStorageData {
  used: number;
  total: number;
  additionalGb: number;
  additionalMb: number;
}

export const DATAROOM_STORAGE_QUERY_KEY = "dataroom-storage";

export function useDataroomStorage(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [DATAROOM_STORAGE_QUERY_KEY, organizationId],
    queryFn: async (): Promise<DataroomStorageData> => {
      if (!organizationId) {
        return { used: 0, total: 100 * 1024 * 1024, additionalGb: 0, additionalMb: 0 };
      }

      // Get all non-deleted files from all data rooms in this organization
      const { data: filesData } = await supabase
        .from("data_room_files")
        .select("file_size")
        .eq("organization_id", organizationId)
        .is("deleted_at", null);
      
      const used = filesData?.reduce((acc, f) => acc + (f.file_size || 0), 0) || 0;

      // Get additional purchased storage
      const { data: storageData } = await supabase
        .from("organization_dataroom_storage")
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
        additionalMb: additionalGb * 1024,
      };
    },
    enabled: !!organizationId,
    staleTime: 30000, // 30 seconds
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [DATAROOM_STORAGE_QUERY_KEY] });
  }, [queryClient]);

  const refetch = useCallback(() => {
    queryClient.refetchQueries({ queryKey: [DATAROOM_STORAGE_QUERY_KEY, organizationId] });
  }, [queryClient, organizationId]);

  return {
    ...query,
    invalidate,
    refetch,
  };
}

// Utility function to invalidate dataroom storage from anywhere
export function invalidateDataroomStorage(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [DATAROOM_STORAGE_QUERY_KEY] });
}
