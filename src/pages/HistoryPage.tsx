import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { MonthPicker, currentMonth } from "@/components/MonthPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import {
  TransactionGroupHeader,
  TransactionListItem,
} from "@/components/transactions/TransactionListItem";
import { useCategories } from "@/hooks/useCategories";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearchTransactions } from "@/hooks/useSearchTransactions";
import { useTransactions } from "@/hooks/useTransactions";
import { formatRupiah } from "@/lib/format";
import type { TransactionType, TransactionWithMeta } from "@/types";
import { SearchResults } from "./SearchResults";

type FilterType = "all" | TransactionType;

export function HistoryPage() {
  const [month, setMonth] = useState(currentMonth());
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim());
  const isSearching = debouncedQuery.length >= 2;

  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [editing, setEditing] = useState<TransactionWithMeta | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: categories } = useCategories();

  const {
    data: transactions,
    isLoading,
    isError,
  } = useTransactions({
    month,
    type: typeFilter === "all" ? undefined : typeFilter,
    categoryId: categoryFilter || undefined,
  });

  const search = useSearchTransactions(debouncedQuery);

  const grouped = useMemo(() => groupByDate(transactions ?? []), [transactions]);

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) + (categoryFilter ? 1 : 0);

  function openEdit(tx: TransactionWithMeta) {
    setEditing(tx);
    setSheetOpen(true);
  }

  function clearSearch() {
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Pencarian */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari, mis. ganti oli"
          aria-label="Cari transaksi"
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {query && (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={clearSearch}
              className="rounded-full p-1.5 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Filter"
            onClick={() => setFilterOpen(true)}
            className="relative rounded-full p-1.5 text-muted-foreground hover:bg-accent"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {isSearching ? (
        <SearchResults
          query={debouncedQuery}
          loading={search.isLoading}
          error={search.isError ? search.error : null}
          rows={search.data ?? []}
          onOpenEdit={openEdit}
        />
      ) : (
        <>
          <MonthPicker value={month} onChange={setMonth} />

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {typeFilter !== "all" && (
                <Badge>
                  {typeFilter === "income" ? "Pemasukan" : "Pengeluaran"}
                  <button
                    type="button"
                    aria-label="Hapus filter jenis"
                    onClick={() => setTypeFilter("all")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {categoryFilter && (
                <Badge>
                  {categories?.find((c) => c.id === categoryFilter)?.name ??
                    "Kategori"}
                  <button
                    type="button"
                    aria-label="Hapus filter kategori"
                    onClick={() => setCategoryFilter("")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col gap-3 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
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
          ) : isError ? (
            <EmptyState
              title="Gagal memuat transaksi"
              description="Coba muat ulang halaman."
            />
          ) : (transactions ?? []).length === 0 ? (
            <EmptyState
              title="Tidak ada transaksi"
              description="Belum ada transaksi pada bulan ini dengan filter yang dipilih."
            />
          ) : (
            <div className="divide-y divide-border">
              {grouped.map(({ date, items, net }) => (
                <div key={date}>
                  <TransactionGroupHeader
                    date={date}
                    netLabel={`${net >= 0 ? "+" : "−"}${formatRupiah(net)}`}
                  />
                  {items.map((tx) => (
                    <TransactionListItem
                      key={tx.id}
                      transaction={tx}
                      onEdit={openEdit}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Drawer filter */}
      <Drawer open={filterOpen} onOpenChange={setFilterOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter</DrawerTitle>
            <DrawerDescription>
              Saring transaksi berdasarkan jenis dan kategori.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <p className="mb-2 text-sm font-medium">Jenis</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["all", "Semua"],
                  ["income", "Pemasukan"],
                  ["expense", "Pengeluaran"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTypeFilter(value)}
                  className={
                    "h-10 rounded-lg border text-sm font-medium transition-colors " +
                    (typeFilter === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mb-2 mt-4 text-sm font-medium">Kategori</p>
            <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto">
              {(categories ?? []).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setCategoryFilter((prev) => (prev === cat.id ? "" : cat.id))
                  }
                  className={
                    "flex h-10 items-center gap-2 rounded-lg border px-3 text-left text-sm transition-colors " +
                    (categoryFilter === cat.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground")
                  }
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color ?? "#64748b" }}
                  />
                  <span className="truncate">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTypeFilter("all");
                setCategoryFilter("");
              }}
            >
              Reset filter
            </Button>
            <DrawerClose asChild>
              <Button type="button">Terapkan</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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

function groupByDate(items: TransactionWithMeta[]) {
  const map = new Map<
    string,
    { items: TransactionWithMeta[]; net: number }
  >();

  for (const tx of items) {
    const entry = map.get(tx.transaction_date) ?? { items: [], net: 0 };
    entry.items.push(tx);
    entry.net += tx.type === "income" ? tx.amount : -tx.amount;
    map.set(tx.transaction_date, entry);
  }

  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, { items, net }]) => ({ date, items, net }));
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
