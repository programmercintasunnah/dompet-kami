import { Plus } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav, AppHeader } from "./BottomNav";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";

export function AppLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[480px] bg-background shadow-sm">
      <AppHeader />

      <main className="px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom)+1rem)] pt-4">
        <Outlet />
      </main>

      {/* FAB di tengah bawah, di atas bottom nav */}
      <button
        type="button"
        aria-label="Catat transaksi"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-7 w-7" />
      </button>

      <BottomNav />

      <TransactionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
