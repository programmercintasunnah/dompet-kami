import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { OfflineBanner } from "@/components/OfflineBanner";
import { RouteGuard } from "@/routes/RouteGuard";
import { AccountPage } from "@/pages/AccountPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { PendingAccessPage } from "@/pages/PendingAccessPage";
import { ROUTES } from "@/lib/constants";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { RealtimeSync } from "@/hooks/useRealtimeSync";

// Halaman berat (grafik) dan admin dimuat malas agar shell aplikasi ringan.
const ReportsPage = lazy(() =>
  import("@/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const ManageAccessPage = lazy(() =>
  import("@/pages/ManageAccessPage").then((m) => ({ default: m.ManageAccessPage })),
);
const ManageCategoriesPage = lazy(() =>
  import("@/pages/ManageCategoriesPage").then((m) => ({
    default: m.ManageCategoriesPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.menunggu} element={<PendingAccessPage />} />

        <Route element={<RouteGuard />}>
          <Route element={<AppLayout />}>
            <Route path={ROUTES.beranda} element={<HomePage />} />
            <Route path={ROUTES.riwayat} element={<HistoryPage />} />
            <Route path={ROUTES.laporan} element={<ReportsPage />} />
            <Route path={ROUTES.akun} element={<AccountPage />} />
            <Route
              path={ROUTES.kelolaAkses}
              element={<ManageAccessPage />}
            />
            <Route
              path={ROUTES.kelolaKategori}
              element={<ManageCategoriesPage />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={ROUTES.beranda} replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  useAppUpdate();

  return (
    <AuthProvider>
      <RealtimeSync />
      <OfflineBanner />
      <AppRoutes />
    </AuthProvider>
  );
}
