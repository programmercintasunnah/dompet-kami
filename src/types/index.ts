export type TransactionType = "income" | "expense";
export type ProfileRole = "admin" | "pending";
export type AccessRequestStatus = "pending" | "approved" | "rejected";

/** Kolom audit yang dimiliki semua tabel. */
export interface AuditColumns {
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface Profile extends AuditColumns {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
}

export interface AccessRequest extends AuditColumns {
  id: string;
  user_id: string;
  message: string | null;
  status: AccessRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface Category extends AuditColumns {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
}

export interface Transaction extends AuditColumns {
  id: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  transaction_date: string;
  note: string | null;
}

/** Baris hasil RPC search_transactions (sudah join kategori & profil). */
export interface TransactionSearchRow {
  id: string;
  type: TransactionType;
  amount: number;
  category_id: string;
  transaction_date: string;
  note: string | null;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
}

/** Transaksi yang sudah digabung dengan kategori & nama pencatat untuk tampilan. */
export interface TransactionWithMeta extends Transaction {
  category: Pick<Category, "id" | "name" | "type" | "icon" | "color">;
  creator_name: string | null;
  creator_avatar: string | null;
  updated_by_name: string | null;
}

/** Tipe env Vite. */
declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
