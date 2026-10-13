import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useIsAdmin } from "./useProfile";

export const PENDING_COUNT_KEY = "pending-access-count";

/**
 * Jumlah permintaan akses berstatus pending.
 * Hanya admin yang boleh melihatnya (dipakai untuk badge di bottom nav).
 */
export function usePendingAccessCount() {
  const { isAdmin } = useIsAdmin();

  const { data } = useQuery({
    queryKey: [PENDING_COUNT_KEY],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("access_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: isAdmin,
    refetchInterval: 30 * 1000,
  });

  return { count: isAdmin ? (data ?? 0) : 0, isAdmin };
}
