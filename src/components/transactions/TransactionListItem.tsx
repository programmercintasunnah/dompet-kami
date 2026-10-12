import { ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
import { formatRupiah, parseIsoDate } from "@/lib/format";
import { TYPE_COLOR } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { TransactionWithMeta } from "@/types";

export function TransactionListItem({
  transaction,
  onEdit,
  showCreator = true,
}: {
  transaction: TransactionWithMeta;
  onEdit?: (tx: TransactionWithMeta) => void;
  showCreator?: boolean;
}) {
  const isIncome = transaction.type === "income";
  const color = isIncome ? TYPE_COLOR.income : TYPE_COLOR.expense;

  return (
    <div className="flex items-center gap-3 py-3">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: `${color}20`,
          color,
        }}
      >
        {isIncome ? (
          <ArrowDownLeft className="h-5 w-5" />
        ) : (
          <ArrowUpRight className="h-5 w-5" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {transaction.category.name}
          </p>
        </div>
        {transaction.note && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {transaction.note}
          </p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          {showCreator && transaction.creator_name
            ? `${transaction.creator_name} · `
            : ""}
          {formatRupiah(transaction.amount)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color }}
        >
          {isIncome ? "+" : "−"}
          {formatRupiah(transaction.amount).replace("Rp ", "Rp ")}
        </span>
        {onEdit && (
          <button
            type="button"
            aria-label="Ubah transaksi"
            onClick={() => onEdit(transaction)}
            className={cn(
              "rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            )}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function TransactionGroupHeader({
  date,
  netLabel,
}: {
  date: string;
  netLabel?: string;
}) {
  return (
    <div className="sticky top-14 z-10 flex items-center justify-between bg-background/95 px-1 py-2 backdrop-blur">
      <h3 className="text-sm font-semibold text-muted-foreground">
        {formatPrettyDate(date)}
      </h3>
      {netLabel && (
        <span className="text-xs tabular-nums text-muted-foreground">
          {netLabel}
        </span>
      )}
    </div>
  );
}

function formatPrettyDate(iso: string): string {
  const d = parseIsoDate(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (same(d, today)) return "Hari ini";
  if (same(d, yesterday)) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
