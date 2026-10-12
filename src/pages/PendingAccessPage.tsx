import { Clock, LogOut, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_NAME, MAX_REQUEST_MESSAGE_LENGTH } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useMyAccessRequest, useRequestAccess } from "@/hooks/useMutations";
import { useProfile } from "@/hooks/useProfile";

export function PendingAccessPage() {
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { data: lastRequest, isLoading } = useMyAccessRequest();
  const requestAccess = useRequestAccess();
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  const hasPending = lastRequest?.status === "pending";
  const wasRejected = lastRequest?.status === "rejected";

  async function handleRequest() {
    try {
      await requestAccess.mutateAsync(message.trim() || null);
      setMessage("");
    } catch {
      // pesan sudah ditampilkan oleh toast di mutation
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal keluar.");
      setSigningOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 pt-safe">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span className="text-2xl font-bold">DK</span>
          </div>
          <h1 className="text-xl font-semibold">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masuk sebagai{" "}
            <span className="font-medium text-foreground">
              {profile?.full_name ?? profile?.email ?? "Anda"}
            </span>
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Menunggu Persetujuan</CardTitle>
              {hasPending && <Badge>Menunggu</Badge>}
              {wasRejected && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3" /> Ditolak
                </Badge>
              )}
            </div>
            <CardDescription>
              {hasPending
                ? "Permintaan akses Anda sudah dikirim dan sedang ditinjau oleh admin."
                : wasRejected
                  ? "Permintaan sebelumnya ditolak. Anda bisa mengajukan permintaan baru."
                  : "Akun Anda belum memiliki akses ke data keuangan keluarga. Ajukan permintaan agar admin dapat menyetujui Anda."}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {lastRequest && (
              <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Permintaan terakhir:{" "}
                  {formatDate(lastRequest.created_at)} ·{" "}
                  {lastRequest.status === "pending"
                    ? "menunggu"
                    : lastRequest.status}
                </p>
                {lastRequest.message && (
                  <p className="mt-1">Pesan: “{lastRequest.message}”</p>
                )}
              </div>
            )}

            {!hasPending && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="message">Pesan singkat (opsional)</Label>
                <Textarea
                  id="message"
                  placeholder="mis. Saya ayah, minta akses ya"
                  value={message}
                  maxLength={MAX_REQUEST_MESSAGE_LENGTH}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            )}

            {!hasPending && (
              <Button
                size="lg"
                loading={requestAccess.isPending}
                onClick={() => void handleRequest()}
              >
                <Send className="h-4 w-4" />
                Minta Akses
              </Button>
            )}

            <Button
              variant="outline"
              loading={signingOut}
              onClick={() => void handleSignOut()}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>

            {isLoading && (
              <p className="text-center text-xs text-muted-foreground">
                Memuat status permintaan…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
