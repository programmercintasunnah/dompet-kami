import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonthPicker, currentMonth } from "@/components/MonthPicker";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactions } from "@/hooks/useTransactions";
import {
  EXPENSE_COLOR,
  INCOME_COLOR,
  REPORT_MONTHS_COUNT,
} from "@/lib/constants";
import { formatMonthLabel, formatRupiah } from "@/lib/format";
import type { TransactionWithMeta } from "@/types";

export function ReportsPage() {
  const [month, setMonth] = useState(currentMonth());

  const { data: transactions, isLoading } = useTransactions({ month });

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions ?? []) {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const donutData = useMemo(() => buildDonut(transactions ?? []), [transactions]);
  const barData = useMonthlyBarData(month);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 text-base font-semibold">Ringkasan Bulan</h2>
        <MonthPicker value={month} onChange={setMonth} />

        <div className="mt-3 grid grid-cols-1 gap-3">
          <SummaryCard
            label="Pemasukan"
            value={totals.income}
            color={INCOME_COLOR}
            loading={isLoading}
          />
          <SummaryCard
            label="Pengeluaran"
            value={totals.expense}
            color={EXPENSE_COLOR}
            loading={isLoading}
          />
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">Selisih</p>
            {isLoading ? (
              <Skeleton className="mt-2 h-8 w-32" />
            ) : (
              <p
                className="mt-1 text-2xl font-bold tabular-nums"
                style={{
                  color: totals.balance >= 0 ? INCOME_COLOR : EXPENSE_COLOR,
                }}
              >
                {totals.balance >= 0 ? "+" : "−"}
                {formatRupiah(totals.balance)}
              </p>
            )}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">Pengeluaran per Kategori</h2>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : donutData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Belum ada pengeluaran pada bulan ini.
            </p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    isAnimationActive={false}
                  />
                  <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">
          Pemasukan vs Pengeluaran ({REPORT_MONTHS_COUNT} Bulan)
        </h2>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          {barData.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData.data} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => compactId(Number(v))}
                    width={60}
                  />
                  <Tooltip formatter={(v) => formatRupiah(Number(v))} />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Pemasukan"
                    fill={INCOME_COLOR}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="expense"
                    name="Pengeluaran"
                    fill={EXPENSE_COLOR}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: number;
  color: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-32" />
      ) : (
        <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color }}>
          {formatRupiah(value)}
        </p>
      )}
    </div>
  );
}

function buildDonut(transactions: TransactionWithMeta[]) {
  const map = new Map<string, { value: number; color: string }>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const key = t.category.name;
    const existing = map.get(key) ?? {
      value: 0,
      color: t.category.color ?? "#64748b",
    };
    existing.value += t.amount;
    map.set(key, existing);
  }

  return [...map.entries()]
    .map(([name, { value, color }]) => ({ name, value, fill: color }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Data grafik batang 6 bulan terakhir (berdasarkan bulan terpilih).
 * Mengambil sekali rentang tanggal, lalu diagregasi per bulan di client.
 */
function useMonthlyBarData(endMonth: string) {
  const [endYear, endMonthIndex] = endMonth.split("-").map(Number);

  const months = useMemo(() => {
    const list: string[] = [];
    for (let i = REPORT_MONTHS_COUNT - 1; i >= 0; i--) {
      const d = new Date((endYear ?? 2000), (endMonthIndex ?? 1) - 1 - i, 1);
      list.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    return list;
  }, [endYear, endMonthIndex]);

  const { startDate, endDate } = useMemo(() => {
    const [sy, sm] = (months[0] ?? endMonth).split("-").map(Number);
    const start = `${sy}-${String(sm).padStart(2, "0")}-01`;
    const endObj = new Date(endYear ?? 2000, endMonthIndex ?? 1, 0);
    const end = `${endObj.getFullYear()}-${String(endObj.getMonth() + 1).padStart(2, "0")}-${String(endObj.getDate()).padStart(2, "0")}`;
    return { startDate: start, endDate: end };
  }, [months, endMonth, endYear, endMonthIndex]);

  const { data, isLoading } = useTransactions({ dateFrom: startDate, dateTo: endDate });

  const dataByMonth = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const m of months) map.set(m, { income: 0, expense: 0 });

    for (const t of data ?? []) {
      const key = t.transaction_date.slice(0, 7);
      const entry = map.get(key);
      if (!entry) continue;
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
    }

    return months.map((m) => {
      const [y, mi] = m.split("-").map(Number);
      return {
        label: formatMonthLabel(y ?? 2000, (mi ?? 1) - 1),
        income: map.get(m)?.income ?? 0,
        expense: map.get(m)?.expense ?? 0,
      };
    });
  }, [data, months]);

  return { data: dataByMonth, isLoading };
}

function compactId(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${Math.round(v / 1_000_000)} jt`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} rb`;
  return String(v);
}
