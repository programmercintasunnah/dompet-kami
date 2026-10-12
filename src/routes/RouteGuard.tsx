import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ROUTES } from "@/lib/constants";

/**
 * Guard rute:
 * - Belum login -> /login
 * - Login dan role pending -> /menunggu
 * - Login dan role admin -> lanjut
 */
export function RouteGuard() {
  const { session, loading } = useAuth();
  const { data: profile, isLoading: profileLoading, isError } = useProfile();
  const location = useLocation();

  if (loading || (session && profileLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  // Profil belum terbaca (mis. trigger belum jalan) -> paksa muat ulang sekali.
  if (isError || !profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Profil Anda belum ditemukan. Pastikan migrasi database sudah
          dijalankan.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Muat ulang
        </button>
      </div>
    );
  }

  if (profile.role === "pending") {
    return <Navigate to={ROUTES.menunggu} replace />;
  }

  return <Outlet />;
}
