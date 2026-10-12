import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

/**
 * Pembaruan aplikasi: tawarkan muat ulang saat versi baru tersedia.
 */
export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      toast("Versi baru tersedia", {
        description: "Muat ulang untuk mendapatkan versi terbaru.",
        action: {
          label: "Muat ulang",
          onClick: () => {
            void updateServiceWorker(true);
          },
        },
        duration: Infinity,
      });
    },
    onOfflineReady() {
      toast.success("Aplikasi siap digunakan secara offline.");
    },
  });

  return { needRefresh, updateServiceWorker };
}
