"use client";

import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPendingReportCount, PENDING_REPORTS_CHANGED_EVENT, replayPendingReports } from "@/lib/offline-reports";

export function PwaStatus() {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const updateOnlineState = () => setIsOffline(!navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    const updatePendingCount = () => {
      void getPendingReportCount().then(setPendingCount).catch(() => setPendingCount(0));
    };

    updatePendingCount();
    window.addEventListener(PENDING_REPORTS_CHANGED_EVENT, updatePendingCount);

    return () => window.removeEventListener(PENDING_REPORTS_CHANGED_EVENT, updatePendingCount);
  }, []);

  useEffect(() => {
    const replay = async () => {
      if (!navigator.onLine) return;
      const sent = await replayPendingReports();
      if (sent > 0) {
        toast.success(`${sent} laporan tertunda berhasil dikirim.`);
      }
      setPendingCount(await getPendingReportCount());
    };

    window.addEventListener("online", replay);
    void replay();

    return () => window.removeEventListener("online", replay);
  }, []);

  if (pathname === "/embed") return null;

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[900] flex pointer-events-none flex-col items-center gap-2">
      {isOffline && (
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-lg">
          <WifiOff className="size-4 text-destructive" />
          Tidak ada koneksi. Data terakhir tetap ditampilkan.
        </div>
      )}
      {pendingCount > 0 && (
        <div className="pointer-events-auto rounded-md border bg-background px-3 py-2 text-sm font-medium shadow-lg">
          {pendingCount} laporan menunggu kirim.
        </div>
      )}
    </div>
  );
}
