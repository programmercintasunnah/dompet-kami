import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMonthLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Pemilih bulan. Nilai berformat "YYYY-MM".
 * Batas atas: bulan berjalan (tidak bisa melihat masa depan).
 */
export function MonthPicker({
  value,
  onChange,
  maxMonth,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** "YYYY-MM" bulan paling baru yang boleh dipilih. Default: bulan ini. */
  maxMonth?: string;
  className?: string;
}) {
  const [year, month] = value.split("-").map(Number);
  const max = maxMonth ?? currentMonth();

  const shift = (delta: number) => {
    const d = new Date((year ?? 2000), (month ?? 1) - 1 + delta, 1);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (next > max) return;
    onChange(next);
  };

  const isMax = value >= max;

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-border bg-card px-1 py-1",
        className,
      )}
    >
      <StepButton label="Bulan sebelumnya" onClick={() => shift(-1)}>
        <ChevronLeft className="h-5 w-5" />
      </StepButton>

      <span className="text-sm font-semibold tabular-nums">
        {formatMonthLabel(year ?? 2000, (month ?? 1) - 1)}
      </span>

      <StepButton
        label="Bulan berikutnya"
        onClick={() => shift(1)}
        disabled={isMax}
      >
        <ChevronRight className="h-5 w-5" />
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30"
    >
      {children}
    </button>
  );
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
