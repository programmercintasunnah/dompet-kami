import { Clock3, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, parseIsoDate } from "@/lib/format";
import { TYPE_COLOR } from "@/lib/constants";
import type { TransactionSearchRow, TransactionWithMeta } from "@/types";

/**
 * Hasil pencarian lintas bulan.
 * Menampilkan ringkasan "Terakhir kali" plus daftar kecocokan terbaru.
 */
export function SearchResults({
  query,
  loading,
  error,
  rows,
  onOpenEdit,
}: {
  query: string;
  loading: boolean;
  error: Error | null;
  rows: TransactionSearchRow[];
  onOpenEdit: (tx: TransactionWithMeta) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-dashed border-destructive/40 p-6 text-center">
        <p className="text-sm font-medium text-destructive">
          Pencarian gagal
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
        <SearchX className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          Tidak ada transaksi untuk “{query}”
        </p>
        <p className="text-xs text-muted-foreground">
          Coba kata kunci lain, mis. “oli”, “listrik”, atau “sekolah”.
        </p>
      </div>
    );
  }

  const latest = rows[0];
  const totalAll = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Ringkasan: kapan terakhir kali */}
      {latest && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Clock3 className="h-4 w-4" />
            Terakhir kali “{query}”
          </div>
          <p className="mt-2 text-lg font-semibold">
            {formatRupiah(latest.amount)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPretty(latest.transaction_date)} · {latest.category_name}
            {latest.note ? ` · ${latest.note}` : ""}
          </p>
          <p className="mt-3 border-t border-primary/20 pt-2 text-xs text-muted-foreground">
            {rows.length} kecocokan · total {formatRupiah(totalAll)}
          </p>
        </section>
      )}

      <div className="flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const isIncome = row.type === "income";
          const color = isIncome ? TYPE_COLOR.income : TYPE_COLOR.expense;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() =>
                onOpenEdit({
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
                  deleted_at: null,
                  deleted_by: null,
                  category: {
                    id: row.category_id,
                    name: row.category_name,
                    type: row.type,
                    icon: row.category_icon,
                    color: row.category_color,
                  },
                  creator_name: row.created_by_name,
                  creator_avatar: null,
                  updated_by_name: row.updated_by_name,
                })
              }
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {isIncome ? "+" : "−"}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {row.category_name}
                </p>
                {row.note && (
                  <p className="truncate text-sm text-muted-foreground">
                    {row.note}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {row.created_by_name ? `${row.created_by_name} · ` : ""}
                  {formatPretty(row.transaction_date)}
                </p>
              </div>

              <span
                className="shrink-0 text-sm font-semibold tabular-nums"
                style={{ color }}
              >
                {formatRupiah(row.amount)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatPretty(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseIsoDate(iso));
}
