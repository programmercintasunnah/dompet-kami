import { useQuery } from "@tanstack/react-query";
import type {
  Transaction,
  TransactionType,
  TransactionWithMeta,
} from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useIsAdmin } from "./useProfile";

export const TRANSACTIONS_KEY = "transactions";

/** Row mentah hasil join Supabase. */
interface TransactionRow extends Omit<Transaction, "category_id"> {
  category_id: string;
  category: {
    id: string;
    name: string;
    type: TransactionType;
    icon: string | null;
    color: string | null;
  } | null;
  creator: { full_name: string | null; avatar_url: string | null } | null;
  updater: { full_name: string | null } | null;
}

const SELECT_CLAUSE = `
  *,
  category:categories(id, name, type, icon, color),
  creator:profiles!transactions_created_by_fkey(full_name, avatar_url),
  updater:profiles!transactions_updated_by_fkey(full_name)
`;

function mapRow(row: TransactionRow): TransactionWithMeta {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    category_id: row.category_id,
    transaction_date: row.transaction_date,
    note: row.note,
    created_at: row.created_at,
    created_by: row.created_by,
    updated_at: row.updated_at,
    updated_by: row.updated_by,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    category: row.category ?? {
      id: row.category_id,
      name: "Tanpa kategori",
      type: row.type,
      icon: null,
      color: null,
    },
    creator_name: row.creator?.full_name ?? null,
    creator_avatar: row.creator?.avatar_url ?? null,
    updated_by_name: row.updater?.full_name ?? null,
  };
}

export interface TransactionFilters {
  /** "YYYY-MM" — bulan yang sedang dilihat. */
  month?: string;
  /** "YYYY-MM-DD" — batas bawah rentang tanggal (dipakai laporan). */
  dateFrom?: string;
  /** "YYYY-MM-DD" — batas atas rentang tanggal. */
  dateTo?: string;
  type?: TransactionType;
  categoryId?: string;
  createdById?: string;
  limit?: number;
}

export function useTransactions(filters: TransactionFilters = {}) {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { month, dateFrom, dateTo, type, categoryId, createdById, limit } =
    filters;

  const query = useQuery({
    queryKey: [
      TRANSACTIONS_KEY,
      month ?? "all",
      dateFrom ?? "all",
      dateTo ?? "all",
      type ?? "all",
      categoryId ?? "all",
      createdById ?? "all",
      limit ?? "all",
    ],
    queryFn: async (): Promise<TransactionWithMeta[]> => {
      let q = supabase
        .from("transactions")
        .select(SELECT_CLAUSE)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (month) {
        // Batas awal & akhir bulan (transaction_date bertipe date).
        const [y, m] = month.split("-").map(Number);
        const start = `${y}-${String(m).padStart(2, "0")}-01`;
        const endDate = new Date(y ?? 1970, (m ?? 1), 0);
        const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
        q = q.gte("transaction_date", start).lte("transaction_date", end);
      }
      if (dateFrom) q = q.gte("transaction_date", dateFrom);
      if (dateTo) q = q.lte("transaction_date", dateTo);
      if (type) q = q.eq("type", type);
      if (categoryId) q = q.eq("category_id", categoryId);
      if (createdById) q = q.eq("created_by", createdById);
      if (limit) q = q.limit(limit);

      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? []) as TransactionRow[]).map(mapRow);
    },
    enabled: isAdmin,
  });

  // Realtime untuk tabel transactions ditangani oleh <RealtimeSync /> di root.
  return { ...query, isAdmin, isAdminLoading };
}
