const idNumber = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Rp 1.500.000 */
export function formatRupiah(amount: number): string {
  return `Rp ${idNumber.format(Math.abs(Math.round(amount)))}`;
}

/** 1.500.000 (tanpa prefix, untuk input) */
export function formatNumberId(value: number | string): string {
  const num = typeof value === "string" ? Number(value.replace(/\D/g, "")) : value;
  if (Number.isNaN(num)) return "0";
  return idNumber.format(num);
}

/**
 * Cari Date valid dari input, atau null bila tidak bisa dibaca.
 *
 * Mendukung dua bentuk dari Supabase:
 * - DateOnly: "2026-10-12" -> dibaca lokal agar tidak bergeser zona waktu
 * - Timestamp: "2026-10-13T08:54:00.123+00:00" -> `new Date()` biasa
 *
 * Sebelumnya timestamp ikut diproses parseIsoDate() sehingga menjadi Invalid
 * Date dan `Intl.format()` melempar RangeError: Invalid time value.
 */
function toDateOrNull(value: string | Date): Date | null {
  const date =
    typeof value === "string"
      ? value.includes("T")
        ? new Date(value)
        : parseIsoDate(value)
      : value;
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 12 Okt 2026 (bila tanggal tidak valid -> "-") */
export function formatDate(isoDate: string | Date): string {
  const date = toDateOrNull(isoDate);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Rabu, 12 Okt 2026 (bila tanggal tidak valid -> "-") */
export function formatDateLong(isoDate: string | Date): string {
  const date = toDateOrNull(isoDate);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** 12 Okt 2026, 14.30 (bila tanggal tidak valid -> "-") */
export function formatDateTime(value: string | Date): string {
  const date = toDateOrNull(value);
  if (!date) return "-";
  return `${formatDate(date)}, ${new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)}`;
}

/** Okt 2026 */
export function formatMonthLabel(year: number, monthIndex: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

/** 2026-10-12 -> Date (lokal, tanpa geser zona waktu) */
export function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Date -> 2026-10-12 (Asia/Jakarta aman karena memakai komponen lokal) */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIsoDate(): string {
  return toIsoDate(new Date());
}
