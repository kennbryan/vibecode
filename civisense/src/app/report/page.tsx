import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FloodMap } from "@/components/map/FloodMap";
import { Button } from "@/components/ui/button";

export default function ReportPage() {
  return (
    <>
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 pt-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Ketuk peta untuk memilih titik laporan.</p>
      </div>
      <FloodMap initialReports={[]} />
    </>
  );
}
