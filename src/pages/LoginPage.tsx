import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Browser akan dialihkan ke halaman Google.
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memulai login Google.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 pt-safe">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span className="text-2xl font-bold">DK</span>
          </div>
          <CardTitle className="text-xl">{APP_NAME}</CardTitle>
          <CardDescription>
            Catat pemasukan dan pengeluaran keluarga dalam satu tempat.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          <Button size="lg" loading={loading} onClick={() => void handleSignIn()}>
            <GoogleIcon />
            Masuk dengan Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Satu rumah, satu dompet. Akun pertama otomatis menjadi admin.
          </p>

          {!isSupabaseConfigured && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Konfigurasi Supabase belum diisi. Salin <code>.env.example</code>{" "}
              menjadi <code>.env</code> lalu isi nilai variabelnya.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
