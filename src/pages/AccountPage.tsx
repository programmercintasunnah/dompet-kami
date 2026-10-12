import {
  ChevronRight,
  LogOut,
  Palette,
  ShieldCheck,
  Tags,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeProvider";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { usePendingAccessCount } from "@/hooks/usePendingAccessCount";
import { useProfile } from "@/hooks/useProfile";

export function AccountPage() {
  const { signOut } = useAuth();
  const { profile, isLoading } = useProfile();
  const { count } = usePendingAccessCount();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal keluar.");
      setSigningOut(false);
    }
  }

  const name = profile?.full_name ?? "Pengguna";
  const fallback = name
    .split(" ")
    .map((p) => p.slice(0, 1))
    .join("")
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar
            src={profile?.avatar_url}
            alt={name}
            fallback={fallback}
            className="h-14 w-14 text-lg"
          />
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            ) : (
              <>
                <p className="truncate text-base font-semibold">{name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {profile?.email}
                </p>
                <Badge className="mt-1">
                  <ShieldCheck className="h-3 w-3" />
                  {profile?.role === "admin" ? "Admin" : "Menunggu"}
                </Badge>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {profile?.role === "admin" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pengaturan Admin
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            <MenuLink
              to={ROUTES.kelolaAkses}
              icon={<ShieldCheck className="h-5 w-5" />}
              label="Kelola Akses"
              badge={count}
            />
            <MenuLink
              to={ROUTES.kelolaKategori}
              icon={<Tags className="h-5 w-5" />}
              label="Kelola Kategori"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-xs text-muted-foreground">
                Terang atau gelap sesuai selera
              </p>
            </div>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="lg"
        loading={signingOut}
        onClick={() => void handleSignOut()}
        className="w-full text-destructive"
      >
        <LogOut className="h-4 w-4" />
        Keluar
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {APP_NAME} · v1.0.0
      </p>
    </div>
  );
}

function MenuLink({
  to,
  icon,
  label,
  badge = 0,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-white">
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
