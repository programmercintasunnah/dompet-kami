import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarDays, Delete, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/useCategories";
import {
  useCreateTransaction,
  useSoftDeleteTransaction,
  useUpdateTransaction,
} from "@/hooks/useMutations";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { MAX_NOTE_LENGTH, TYPE_COLOR } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { formatRupiah, parseIsoDate, toIsoDate } from "@/lib/format";
import type { TransactionWithMeta } from "@/types";

const formSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .number({ message: "Nominal harus lebih dari 0." })
    .int()
    .positive("Nominal harus lebih dari 0."),
  categoryId: z.string().min(1, "Pilih kategori."),
  transactionDate: z.string().min(1, "Pilih tanggal."),
  note: z.string().max(MAX_NOTE_LENGTH).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export interface TransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Jika diisi, sheet berada dalam mode edit. */
  editing?: TransactionWithMeta | null;
}

export function TransactionSheet({
  open,
  onOpenChange,
  editing = null,
}: TransactionSheetProps) {
  const online = useOnlineStatus();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const deleteTx = useSoftDeleteTransaction();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isEdit = Boolean(editing);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      categoryId: "",
      transactionDate: toIsoDate(new Date()),
      note: "",
    },
    mode: "onBlur",
  });

  const watchedType = form.watch("type");
  const watchedAmount = form.watch("amount");
  const watchedCategoryId = form.watch("categoryId");

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      form.reset({
        type: "expense",
        amount: 0,
        categoryId: "",
        transactionDate: toIsoDate(new Date()),
        note: "",
      });
      return;
    }

    if (editing) {
      form.reset({
        type: editing.type,
        amount: editing.amount,
        categoryId: editing.category_id,
        transactionDate: editing.transaction_date,
        note: editing.note ?? "",
      });
    }
  }, [open, editing, form]);

  const visibleCategories = useMemo(
    () => (categories ?? []).filter((c) => c.type === watchedType),
    [categories, watchedType],
  );

  async function onSubmit(values: FormValues) {
    const payload = {
      type: values.type,
      amount: Math.round(values.amount),
      category_id: values.categoryId,
      transaction_date: values.transactionDate,
      note: values.note?.trim() ? values.note.trim() : null,
    };

    if (isEdit && editing) {
      await updateTx.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createTx.mutateAsync(payload);
    }

    onOpenChange(false);
  }

  async function handleDelete() {
    if (!editing) return;
    await deleteTx.mutateAsync(editing.id);
    onOpenChange(false);
  }

  function pressKey(digit: string) {
    const current = String(form.getValues("amount") ?? 0);
    const next = current === "0" ? digit : current + digit;
    const parsed = Number.parseInt(next, 10);
    if (Number.isNaN(parsed) || parsed > 999_999_999_999) return;
    form.setValue("amount", parsed, { shouldValidate: true, shouldDirty: true });
  }

  function backspace() {
    const current = String(form.getValues("amount") ?? 0);
    const next = current.length <= 1 ? "0" : current.slice(0, -1);
    form.setValue("amount", Number.parseInt(next, 10) || 0, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  const isSaving = createTx.isPending || updateTx.isPending;
  const amountError = form.formState.errors.amount?.message;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[94dvh]">
        <DrawerHeader>
          <DrawerTitle>
            {isEdit ? "Ubah Transaksi" : "Catat Transaksi"}
          </DrawerTitle>
          <DrawerDescription>
            {isEdit
              ? "Perbarui detail transaksi di bawah ini."
              : "Isi detail pemasukan atau pengeluaran keluarga."}
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex max-h-[calc(94dvh-8rem)] flex-col overflow-y-auto px-4 pb-2"
        >
          {/* Toggle jenis */}
          <div
            role="tablist"
            aria-label="Jenis transaksi"
            className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1"
          >
            {(["expense", "income"] as const).map((t) => {
              const active = watchedType === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    form.setValue("type", t, { shouldDirty: true });
                    form.setValue("categoryId", "", { shouldDirty: true });
                  }}
                  className={cn(
                    "relative flex h-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground",
                  )}
                >
                  {t === "income" ? "Pemasukan" : "Pengeluaran"}
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full"
                      style={{ backgroundColor: TYPE_COLOR[t] }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tanggal */}
          <div className="mt-4">
            <Label htmlFor="transaction-date">Tanggal</Label>
            <div className="relative mt-2">
              <Input
                id="transaction-date"
                type="date"
                {...form.register("transactionDate")}
                className="pr-10"
              />
              <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {form.formState.errors.transactionDate && (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.transactionDate.message}
              </p>
            )}
          </div>

          {/* Nominal */}
          <div className="mt-4">
            <Label htmlFor="amount-display">Nominal</Label>
            <div
              id="amount-display"
              className={cn(
                "mt-2 flex h-14 items-center justify-end rounded-xl border bg-background px-4",
                amountError
                  ? "border-destructive"
                  : watchedAmount > 0
                    ? "border-primary"
                    : "border-input",
              )}
              style={{
                color: watchedAmount > 0 ? TYPE_COLOR[watchedType] : undefined,
              }}
            >
              <span className="truncate text-2xl font-bold tabular-nums">
                {formatRupiah(watchedAmount)}
              </span>
            </div>
            {amountError && (
              <p className="mt-1 text-sm text-destructive">{amountError}</p>
            )}

            {/* Keypad angka */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <KeyButton key={d} onPress={() => pressKey(d)}>
                  {d}
                </KeyButton>
              ))}
              <KeyButton onPress={() => pressKey("000")}>000</KeyButton>
              <KeyButton onPress={() => pressKey("0")}>0</KeyButton>
              <KeyButton onPress={backspace} aria-label="Hapus satu digit">
                <Delete className="h-5 w-5" />
              </KeyButton>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Kategori */}
          <div>
            <Label>Kategori</Label>
            {categoriesLoading ? (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : (
              <>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {visibleCategories.map((cat) => {
                    const active = watchedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          form.setValue("categoryId", cat.id, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className={cn(
                          "flex h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-1 text-center text-[11px] font-medium leading-tight transition-colors",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-input bg-background text-muted-foreground",
                        )}
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{
                            backgroundColor: cat.color ?? TYPE_COLOR[watchedType],
                          }}
                        >
                          {cat.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="line-clamp-2 break-words px-0.5">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.categoryId && (
                  <p className="mt-1 text-sm text-destructive">
                    {form.formState.errors.categoryId.message}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Catatan */}
          <div className="mt-4">
            <Label htmlFor="note">Catatan (opsional)</Label>
            <Textarea
              id="note"
              placeholder="mis. Ganti oli motor"
              maxLength={MAX_NOTE_LENGTH}
              {...form.register("note")}
              className="mt-2"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {(form.watch("note") ?? "").length}/{MAX_NOTE_LENGTH}
            </p>
          </div>

          {isEdit && editing && (
            <div className="mt-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <p>
                Dicatat oleh{" "}
                <span className="font-medium text-foreground">
                  {editing.creator_name ?? "—"}
                </span>{" "}
                pada {format(parseIsoDate(editing.transaction_date), "d MMM yyyy")}
              </p>
              <p className="mt-0.5">
                {editing.updated_by_name ? (
                  <>
                    Terakhir diubah oleh{" "}
                    <span className="font-medium text-foreground">
                      {editing.updated_by_name}
                    </span>
                  </>
                ) : (
                  "Belum pernah diubah."
                )}
              </p>
            </div>
          )}

          {!online && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              Anda sedang offline. Koneksi internet diperlukan untuk menyimpan
              data.
            </p>
          )}

          <DrawerFooter className="mt-4 border-t">
            {confirmDelete ? (
              <div className="flex flex-col gap-2">
                <p className="text-center text-sm text-muted-foreground">
                  Yakin ingin menghapus transaksi ini? Tindakan ini tidak bisa
                  dibatalkan.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  loading={deleteTx.isPending}
                  onClick={() => void handleDelete()}
                >
                  Ya, hapus
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                >
                  Batal
                </Button>
              </div>
            ) : (
              <>
                {/* Submit selalu tampil, termasuk mode edit, supaya perubahan bisa disimpan. */}
                <Button
                  type="submit"
                  size="lg"
                  loading={isSaving}
                  disabled={!online}
                  className="w-full"
                >
                  {isEdit ? "Simpan Perubahan" : "Simpan Transaksi"}
                </Button>
                <div className="flex gap-2">
                  <DrawerClose asChild>
                    <Button type="button" variant="ghost" className="w-full">
                      Batal
                    </Button>
                  </DrawerClose>

                  {isEdit && editing && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!online}
                      className="w-full text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                  )}
                </div>
              </>
            )}
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

function KeyButton({
  children,
  onPress,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { onPress: () => void }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex h-12 items-center justify-center rounded-xl border border-input bg-background text-lg font-semibold shadow-sm transition-colors active:bg-accent"
      {...props}
    >
      {children}
    </button>
  );
}
