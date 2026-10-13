import { useQuery } from "@tanstack/react-query";
import type { Category, TransactionType } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useIsAdmin } from "./useProfile";

export const CATEGORIES_KEY = "categories";

export function useCategories(type?: TransactionType) {
  const { isAdmin } = useIsAdmin();

  const query = useQuery({
    queryKey: [CATEGORIES_KEY, type ?? "all"],
    queryFn: async (): Promise<Category[]> => {
      let q = supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      if (type) q = q.eq("type", type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Category[];
    },
    enabled: isAdmin,
    staleTime: 60 * 1000,
  });

  // Realtime untuk tabel categories ditangani oleh <RealtimeSync /> di root.
  return query;
}
