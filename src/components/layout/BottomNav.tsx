import { Home, Receipt, ChartPie, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { ThemeToggle } from "@/components/ThemeProvider";
import { usePendingAccessCount } from "@/hooks/usePendingAccessCount";

const ITEMS = [
  { to: ROUTES.beranda, label: "Beranda", icon: Home },
  { to: ROUTES.riwayat, label: "Riwayat", icon: Receipt },
  { to: ROUTES.laporan, label: "Laporan", icon: ChartPie },
  { to: ROUTES.akun, label: "Akun", icon: User },
] as const;

export function BottomNav() {
  const { count } = usePendingAccessCount();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-[480px] items-stretch justify-around px-2">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const badge = to === ROUTES.akun ? count : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === ROUTES.beranda}
              className={({ isActive }) =>
                cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <span className="relative">
                <Icon className="h-5 w-5" aria-hidden />
                {badge > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function AppHeader({ title }: { title?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur pt-safe">
      <div className="mx-auto flex h-14 w-full max-w-[480px] items-center justify-between px-4">
        <h1 className="text-lg font-semibold text-primary">
          {title ?? APP_NAME}
        </h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
