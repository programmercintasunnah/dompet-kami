import { useQuery } from "@tanstack/react-query";
import type { Profile } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";

export const PROFILE_KEY = "profile";

export function useProfile() {
  const { userId } = useAuth();

  const query = useQuery({
    queryKey: [PROFILE_KEY, userId],
    queryFn: async (): Promise<Profile | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  });

  // Realtime untuk tabel profiles ditangani oleh <RealtimeSync /> di root.
  return { ...query, profile: query.data ?? null };
}

export function useIsAdmin() {
  const { data, isLoading } = useProfile();
  return {
    isAdmin: data?.role === "admin",
    isPending: data?.role === "pending",
    profile: data ?? null,
    isLoading,
  };
}
