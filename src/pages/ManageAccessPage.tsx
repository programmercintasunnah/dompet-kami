import { Check, ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  useAccessRequests,
  useAdmins,
  useApproveAccess,
  useRejectAccess,
  useRevokeAdmin,
} from "@/hooks/useMutations";
import { useProfile } from "@/hooks/useProfile";
import { formatDate, formatDateTime } from "@/lib/format";

export function ManageAccessPage() {
  const [tab, setTab] = useState("pending");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Kelola Akses</h1>
        <p className="text-sm text-muted-foreground">
          Setujui permintaan akses dan lihat daftar admin.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Permintaan</TabsTrigger>
          <TabsTrigger value="admins">Admin</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingRequests />
        </TabsContent>
        <TabsContent value="admins">
          <AdminList />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PendingRequests() {
  const { data, isLoading } = useAccessRequests("pending");
  const approve = useApproveAccess();
  const reject = useRejectAccess();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  if ((data ?? []).length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium">Tidak ada permintaan</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Belum ada akun yang mengajukan akses.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(data ?? []).map((req) => {
        const name = req.profile?.full_name ?? req.profile?.email ?? "Pengguna";
        const fallback = name
          .split(" ")
          .map((p) => p.slice(0, 1))
          .join("")
          .slice(0, 2);

        return (
          <Card key={req.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar src={req.profile?.avatar_url} fallback={fallback} alt={name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <Badge>Menunggu</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {req.profile?.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Diajukan {formatDateTime(req.created_at)}
                  </p>
                  {req.message && (
                    <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
                      “{req.message}”
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  loading={approve.isPending && approve.variables === req.id}
                  onClick={() => approve.mutate(req.id)}
                >
                  <Check className="h-4 w-4" />
                  Setujui
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive"
                  size="sm"
                  loading={reject.isPending && reject.variables === req.id}
                  onClick={() => reject.mutate(req.id)}
                >
                  <X className="h-4 w-4" />
                  Tolak
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AdminList() {
  const { data, isLoading } = useAdmins();
  const { profile } = useProfile();
  const revoke = useRevokeAdmin();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Admin Aktif
        </CardTitle>
        <CardDescription>
          Admin dapat melihat, menambah, mengubah, dan menghapus data.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        {(data ?? []).map((admin) => {
          const name = admin.full_name ?? admin.email;
          const fallback = name
            .split(" ")
            .map((p) => p.slice(0, 1))
            .join("")
            .slice(0, 2);
          const isSelf = admin.id === profile?.id;

          return (
            <div key={admin.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar src={admin.avatar_url} fallback={fallback} alt={name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {name} {isSelf && <span className="text-muted-foreground">(Anda)</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {admin.email} · sejak {formatDate(admin.created_at)}
                </p>
              </div>
              {!isSelf && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  loading={revoke.isPending && revoke.variables === admin.id}
                  onClick={() => revoke.mutate(admin.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Cabut
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
