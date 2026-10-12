import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useIsAdmin } from "./useProfile";

/**
 * Jumlah permintaan akses berstatus pending.
 * Hanya admin yang boleh melihatnya (dipakai untuk badge di bottom nav).
 */
export function usePendingAccessCount() {
  const { isAdmin } = useIsAdmin();

  const { data } = useQuery({
    queryKey: ["pending-access-count"],
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
