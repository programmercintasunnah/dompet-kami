import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Profile } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./useAuth";

export const PROFILE_KEY = "profile";

export function useProfile() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

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

  // Realtime: agar perubahan role (mis. disetujui admin lain) langsung terbaca
  // tanpa perlu login ulang.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: [PROFILE_KEY, userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

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
