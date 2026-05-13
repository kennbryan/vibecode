import dynamic from "next/dynamic";
import type { FloodReport } from "@/types/report";

const FloodMapClient = dynamic(() => import("@/components/map/FloodMapClient"), {
  ssr: false,
  loading: () => (
    <main className="mx-auto flex h-[calc(100dvh-65px)] max-w-7xl items-center justify-center px-4">
      <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground shadow-sm">Memuat peta banjir...</div>
    </main>
  ),
});

type FloodMapProps = {
  initialReports: FloodReport[];
};

export function FloodMap(props: FloodMapProps) {
  return <FloodMapClient {...props} />;
}
