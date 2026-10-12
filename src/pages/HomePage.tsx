import { ArrowRight, ArrowUpRight, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthPicker, currentMonth } from "@/components/MonthPicker";
import { TransactionListItem } from "@/components/transactions/TransactionListItem";
import { RECENT_TRANSACTIONS_LIMIT, ROUTES } from "@/lib/constants";
import { formatMonthLabel, formatRupiah } from "@/lib/format";
import { useTransactions } from "@/hooks/useTransactions";
import { useProfile } from "@/hooks/useProfile";
import { useMemo, useState } from "react";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import type { TransactionWithMeta } from "@/types";

export function HomePage() {
  const { profile } = useProfile();
  const [month, setMonth] = useState(currentMonth());
  const [editing, setEditing] = useState<TransactionWithMeta | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: recent, isLoading } = useTransactions({
    month,
    limit: RECENT_TRANSACTIONS_LIMIT,
  });

  const { data: allMonth } = useTransactions({ month });

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of allMonth ?? []) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [allMonth]);

  const [year, monthIndex] = month.split("-").map(Number);

  function openEdit(tx: TransactionWithMeta) {
    setEditing(tx);
    setSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <section>
        <p className="text-sm text-muted-foreground">
          Halo,{" "}
          <span className="font-medium text-foreground">
            {profile?.full_name?.split(" ")[0] ?? "Keluarga"}
          </span>
          👋
        </p>
        <MonthPicker value={month} onChange={setMonth} className="mt-3" />
      </section>

      {/* Saldo bulan ini */}
      <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-md">
        <div className="flex items-center gap-2 text-sm opacity-90">
          <Wallet className="h-4 w-4" />
          Saldo {formatMonthLabel(year ?? 2000, (monthIndex ?? 1) - 1)}
        </div>
        {isLoading ? (
          <Skeleton className="mt-3 h-9 w-40 bg-white/20" />
        ) : (
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {formatRupiah(totals.balance)}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs opacity-90">Pemasukan</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-emerald-200">
              {isLoading ? "—" : formatRupiah(totals.income)}
            </p>
          </div>
          <div className="rounded-xl bg-white/15 p-3">
            <p className="text-xs opacity-90">Pengeluaran</p>
            <p className="mt-1 text-base font-semibold tabular-nums text-red-200">
              {isLoading ? "—" : formatRupiah(totals.expense)}
            </p>
          </div>
        </div>
      </section>

      {/* Pintasan laporan */}
      <Link
        to={ROUTES.laporan}
        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
      >
        <div>
          <p className="text-sm font-semibold">Lihat Laporan</p>
          <p className="text-xs text-muted-foreground">
            Ringkasan, donut kategori, dan grafik 6 bulan
          </p>
        </div>
        <ArrowRight className="h-5 w-5 text-primary" />
      </Link>

      {/* Transaksi terbaru */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold">Transaksi Terbaru</h2>
          <Link
            to={ROUTES.riwayat}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            Semua <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
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
        ) : (recent ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
            <ArrowUpRight className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Belum ada transaksi</p>
            <p className="text-xs text-muted-foreground">
              Tekan tombol + di bawah untuk mencatat pemasukan atau
              pengeluaran.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(recent ?? []).map((tx) => (
              <TransactionListItem
                key={tx.id}
                transaction={tx}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}
      </section>

      <TransactionSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
