import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CATEGORIES_KEY } from "./useCategories";
import { SEARCH_KEY } from "./useSearchTransactions";
import { PROFILE_KEY } from "./useProfile";
import { useAuth } from "./useAuth";
import { ACCESS_REQUESTS_KEY, ADMINS_KEY } from "./useMutations";
import { PENDING_COUNT_KEY } from "./usePendingAccessCount";
import { TRANSACTIONS_KEY } from "./useTransactions";

/** Topik unik tiap mount agar tidak pernah berbagi channel dengan mount lain. */
function uniqueTopic(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `app-changes-${rand}`;
}

function invalidateAll(qc: QueryClient, ...keys: string[]) {
  for (const key of keys) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

/**
 * Bridge realtime tunggal untuk seluruh aplikasi.
 *
 * Penting: hanya boleh ada SATU tempat yang memanggil
 * `supabase.channel(...)` untuk topik tertentu. `supabase.channel()`
 * mengembalikan channel lama bila topiknya sama, dan `.on('postgres_changes')`
 * akan melempar error "cannot add postgres_changes callbacks ... after
 * subscribe()" bila channel tersebut sudah mulai bergabung.
 *
 * Dipasang sekali di root; setiap perubahan data dari anggota lain
 * meng-invalidate query TanStack Query sehingga tampilan ikut terbaru.
 */
export function RealtimeSync() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(uniqueTopic())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => {
          invalidateAll(queryClient, TRANSACTIONS_KEY, SEARCH_KEY);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          invalidateAll(queryClient, CATEGORIES_KEY);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "access_requests" },
        () => {
          invalidateAll(
            queryClient,
            ACCESS_REQUESTS_KEY,
            PENDING_COUNT_KEY,
            ADMINS_KEY,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => {
          // Perubahan role (mis. disetujui admin lain) langsung terbaca
          // tanpa perlu login ulang.
          invalidateAll(queryClient, PROFILE_KEY, ADMINS_KEY);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return null;
}
