export const APP_NAME = "Dompet Kami";

export const ROUTES = {
  login: "/login",
  menunggu: "/menunggu",
  beranda: "/",
  riwayat: "/riwayat",
  laporan: "/laporan",
  akun: "/akun",
  kelolaAkses: "/akun/kelola-akses",
  kelolaKategori: "/akun/kelola-kategori",
} as const;

export const INCOME_COLOR = "#16a34a";
export const EXPENSE_COLOR = "#dc2626";

/** Warna default per jenis transaksi (dipakai bila kategori tak punya warna). */
export const TYPE_COLOR: Record<"income" | "expense", string> = {
  income: INCOME_COLOR,
  expense: EXPENSE_COLOR,
};

export const MAX_NOTE_LENGTH = 200;
export const MAX_CATEGORY_NAME_LENGTH = 40;
export const MAX_REQUEST_MESSAGE_LENGTH = 300;

/** Jumlah baris transaksi terbaru di beranda. */
export const RECENT_TRANSACTIONS_LIMIT = 5;

/** Jumlah bulan pada grafik batang laporan. */
export const REPORT_MONTHS_COUNT = 6;

export const OFFLINE_RETRY_MESSAGE =
  "Anda sedang offline. Koneksi internet diperlukan untuk menyimpan data.";

export const SEARCH_DEBOUNCE_MS = 250;
