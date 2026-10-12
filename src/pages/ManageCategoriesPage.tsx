import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/useCategories";
import {
  useCreateCategory,
  useSoftDeleteCategory,
  useUpdateCategory,
} from "@/hooks/useMutations";
import { MAX_CATEGORY_NAME_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/cn";
import type { Category, TransactionType } from "@/types";

const PALETTE = [
  "#16a34a",
  "#dc2626",
  "#f97316",
  "#eab308",
  "#0ea5e9",
  "#6366f1",
  "#ec4899",
  "#a855f7",
  "#f59e0b",
  "#14b8a6",
  "#64748b",
  "#000000",
];

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi.")
    .max(MAX_CATEGORY_NAME_LENGTH, `Maksimal ${MAX_CATEGORY_NAME_LENGTH} karakter.`),
  type: z.enum(["income", "expense"]),
  color: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export function ManageCategoriesPage() {
  const [type, setType] = useState<TransactionType>("expense");
  const { data: categories, isLoading } = useCategories(type);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useSoftDeleteCategory();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", type: "expense", color: PALETTE[0] },
    mode: "onBlur",
  });

  function openCreate() {
    setEditing(null);
    setConfirmDelete(null);
    form.reset({ name: "", type, color: PALETTE[0] });
    setSheetOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setConfirmDelete(null);
    form.reset({ name: cat.name, type: cat.type, color: cat.color ?? PALETTE[0] });
    setSheetOpen(true);
  }

  async function onSubmit(values: FormValues) {
    if (editing) {
      await updateCat.mutateAsync({
        id: editing.id,
        name: values.name,
        type: values.type,
        color: values.color,
      });
    } else {
      await createCat.mutateAsync({
        name: values.name,
        type: values.type,
        color: values.color,
      });
    }
    setSheetOpen(false);
  }

  async function handleDelete(cat: Category) {
    await deleteCat.mutateAsync(cat.id);
    setConfirmDelete(null);
    setSheetOpen(false);
  }

  const watchedColor = form.watch("color");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Kelola Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Tambah, ubah, atau hapus kategori transaksi.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
        <TabsList>
          <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
          <TabsTrigger value="income">Pemasukan</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (categories ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Belum ada kategori</p>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {(categories ?? []).map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="h-8 w-8 shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color ?? "#64748b" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{cat.name}</p>
                  <Badge variant="secondary" className="mt-0.5">
                    {cat.type === "income" ? "Pemasukan" : "Pengeluaran"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Ubah ${cat.name}`}
                  onClick={() => openEdit(cat)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  aria-label={`Hapus ${cat.name}`}
                  onClick={() => {
                    setEditing(cat);
                    setConfirmDelete(cat);
                    setSheetOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {confirmDelete
                ? "Hapus Kategori"
                : editing
                  ? "Ubah Kategori"
                  : "Tambah Kategori"}
            </DrawerTitle>
            <DrawerDescription>
              {confirmDelete
                ? "Kategori hanya bisa dihapus jika belum dipakai transaksi."
                : "Berikan nama, jenis, dan warna untuk kategori."}
            </DrawerDescription>
          </DrawerHeader>

          {confirmDelete ? (
            <div className="px-4">
              <p className="text-sm text-muted-foreground">
                Yakin ingin menghapus kategori{" "}
                <span className="font-medium text-foreground">
                  {confirmDelete.name}
                </span>
                ?
              </p>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4 px-4 pb-2"
            >
              <div>
                <Label htmlFor="cat-name">Nama</Label>
                <Input
                  id="cat-name"
                  placeholder="mis. Ganti Oli"
                  maxLength={MAX_CATEGORY_NAME_LENGTH}
                  className="mt-2"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cat-type">Jenis</Label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      id="cat-type"
                      onClick={() =>
                        form.setValue("type", t, { shouldDirty: true })
                      }
                      className={cn(
                        "h-11 rounded-lg border text-sm font-medium transition-colors",
                        form.watch("type") === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground",
                      )}
                    >
                      {t === "income" ? "Pemasukan" : "Pengeluaran"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Warna</Label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Pilih warna ${c}`}
                      onClick={() =>
                        form.setValue("color", c, { shouldDirty: true })
                      }
                      className={cn(
                        "h-9 rounded-full border-2 transition-transform",
                        watchedColor === c
                          ? "scale-110 border-foreground"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </form>
          )}

          <DrawerFooter>
            {confirmDelete ? (
              <>
                <Button
                  variant="destructive"
                  loading={deleteCat.isPending}
                  onClick={() => void handleDelete(confirmDelete)}
                >
                  Ya, hapus
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost">Batal</Button>
                </DrawerClose>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  loading={createCat.isPending || updateCat.isPending}
                  onClick={() => void form.handleSubmit(onSubmit)()}
                >
                  Simpan
                </Button>
                <DrawerClose asChild>
                  <Button variant="ghost">Batal</Button>
                </DrawerClose>
              </>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Catatan</CardTitle>
          <CardDescription>
            Kategori yang sudah dipakai transaksi tidak bisa dihapus. Ubah
            nama atau warnanya saja.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
