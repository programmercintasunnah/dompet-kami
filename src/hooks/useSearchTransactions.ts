import { useQuery } from "@tanstack/react-query";
import type { TransactionSearchRow } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useIsAdmin } from "./useProfile";

export const SEARCH_KEY = "search-transactions";

/**
 * Pencarian transaksi lintas bulan berdasarkan kata kunci.
 * Mencocokkan kata kunci pada catatan transaksi dan nama kategori,
 * diurutkan dari yang terbaru (via RPC `search_transactions`).
 */
export function useSearchTransactions(query: string) {
  const { isAdmin } = useIsAdmin();
  const trimmed = query.trim();

  return useQuery({
    queryKey: [SEARCH_KEY, trimmed],
    queryFn: async (): Promise<TransactionSearchRow[]> => {
      const { data, error } = await supabase.rpc("search_transactions", {
        p_query: trimmed,
      });
      if (error) throw error;
      return (data ?? []) as TransactionSearchRow[];
    },
    enabled: isAdmin && trimmed.length >= 2,
    staleTime: 15 * 1000,
  });
}
