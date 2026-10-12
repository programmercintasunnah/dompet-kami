import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { AccessRequest, Profile, TransactionType } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";
import { useIsAdmin } from "./useProfile";
import { CATEGORIES_KEY } from "./useCategories";
import { TRANSACTIONS_KEY } from "./useTransactions";

// ---------------------------------------------------------------------------
// Transaksi
// ---------------------------------------------------------------------------

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  category_id: string;
  transaction_date: string;
  note?: string | null;
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { error } = await supabase.from("transactions").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      toast.success("Transaksi tersimpan.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyimpan transaksi.");
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: TransactionInput & { id: string }) => {
      const { error } = await supabase
        .from("transactions")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      toast.success("Transaksi diperbarui.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal memperbarui transaksi.");
    },
  });
}

export function useSoftDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("soft_delete_transaction", {
        p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      toast.success("Transaksi dihapus.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menghapus transaksi.");
    },
  });
}

// ---------------------------------------------------------------------------
// Kategori
// ---------------------------------------------------------------------------

export interface CategoryInput {
  name: string;
  type: TransactionType;
  icon?: string | null;
  color?: string | null;
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const { error } = await supabase.from("categories").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      toast.success("Kategori ditambahkan.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menambah kategori.");
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id: string }) => {
      const { error } = await supabase
        .from("categories")
        .update(input)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      toast.success("Kategori diperbarui.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal memperbarui kategori.");
    },
  });
}

export function useSoftDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("soft_delete_category", {
        p_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      void qc.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      toast.success("Kategori dihapus.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menghapus kategori.");
    },
  });
}

// ---------------------------------------------------------------------------
// Akses
// ---------------------------------------------------------------------------

export const ACCESS_REQUESTS_KEY = "access-requests";
export const ADMINS_KEY = "admins";

interface AccessRequestRow extends AccessRequest {
  profile: { full_name: string | null; email: string; avatar_url: string | null } | null;
}

export function useAccessRequests(status?: "pending" | "approved" | "rejected") {
  const { isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [ACCESS_REQUESTS_KEY, status ?? "all"],
    queryFn: async (): Promise<AccessRequestRow[]> => {
      let q = supabase
        .from("access_requests")
        // FK harus disebut eksplisit: access_requests punya dua relasi ke
        // profiles (user_id dan reviewed_by) sehingga embed bisa ambigu.
        .select("*, profile:profiles!access_requests_user_id_fkey(full_name, email, avatar_url)")
        .order("created_at", { ascending: false });
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as AccessRequestRow[];
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isAdmin) return;
    const channel = supabase
      .channel("access-requests-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "access_requests" },
        () => {
          void qc.invalidateQueries({ queryKey: [ACCESS_REQUESTS_KEY] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, qc]);

  return query;
}

export function useAdmins() {
  return useQuery({
    queryKey: [ADMINS_KEY],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useRequestAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message: string | null) => {
      const { error } = await supabase.rpc("request_access", {
        p_message: message,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-access-request"] });
      toast.success("Permintaan akses terkirim.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal mengirim permintaan.");
    },
  });
}

export function useApproveAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("approve_access", {
        p_request_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ACCESS_REQUESTS_KEY] });
      void qc.invalidateQueries({ queryKey: [ADMINS_KEY] });
      toast.success("Akses disetujui.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menyetujui akses.");
    },
  });
}

export function useRejectAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("reject_access", {
        p_request_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ACCESS_REQUESTS_KEY] });
      toast.success("Permintaan ditolak.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal menolak permintaan.");
    },
  });
}

export function useRevokeAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("revoke_admin", {
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [ADMINS_KEY] });
      toast.success("Akses admin dicabut.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Gagal mencabut akses.");
    },
  });
}

/** Permintaan akses milik user sendiri (untuk layar menunggu). */
export function useMyAccessRequest() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["my-access-request", userId],
    queryFn: async (): Promise<AccessRequest | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("access_requests")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as AccessRequest | null) ?? null;
    },
    enabled: Boolean(userId),
  });
}

/** Hook untuk memicu invalidate semua query data (dipakai saat logout). */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return useCallback(() => {
    void qc.invalidateQueries();
  }, [qc]);
}
