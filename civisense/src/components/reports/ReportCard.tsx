"use client";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { CheckCircle2, Droplets, History, MapPin, ZoomIn } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SeverityBadge } from "@/components/reports/SeverityBadge";
import { WATER_DEPTH_CONFIG } from "@/lib/constants";
import type { ConfirmReportAction, ConfirmReportOptions, FloodReport, ReportTimeline } from "@/types/report";

type ReportCardProps = {
  report: FloodReport;
  onConfirm: (id: string, action: ConfirmReportAction, options?: ConfirmReportOptions) => Promise<FloodReport>;
  hasVoted: boolean;
};

type TimelineEntryProps = {
  title: string;
  timestamp: string;
  photoUrl: string | null;
  comment: string | null;
};

export function ReportCard({ report }: ReportCardProps) {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [timeline, setTimeline] = useState<ReportTimeline | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);

  async function openTimeline() {
    setIsTimelineOpen(true);
    if (isTimelineLoading) return;
    setIsTimelineLoading(true);
    try {
      const response = await fetch(`/api/reports/${report.id}/timeline`, { cache: "no-store" });
      const payload = (await response.json()) as ReportTimeline & { error?: string };
      if (response.status === 404) {
        setTimeline({ report: report, confirmations: [] });
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Timeline gagal dimuat.");
      setTimeline({ report: payload.report, confirmations: payload.confirmations || [] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Timeline gagal dimuat.");
    } finally {
      setIsTimelineLoading(false);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div
          className="group relative aspect-[5/3] cursor-zoom-in overflow-hidden bg-muted"
          onClick={() => setIsLightboxOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.photo_url} alt={report.comment} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <ZoomIn className="size-7 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <SeverityBadge severity={report.severity} />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: id })}
            </span>
          </div>
          {report.water_depth && (
            <p className="text-xs font-medium text-primary">
              Kedalaman {WATER_DEPTH_CONFIG[report.water_depth].label.toLowerCase()} ({WATER_DEPTH_CONFIG[report.water_depth].approx})
            </p>
          )}
          <p className="text-sm leading-relaxed">{report.comment}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            <span>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Oleh {report.reporter_name || "Anonymous"}</p>
          <div className="flex gap-3 rounded-md border bg-muted/40 px-3 py-2 text-xs">
            <span className="flex items-center gap-1 text-blue-600">
              <Droplets className="size-3.5" />
              <b>{report.confirmation_count}</b> masih banjir
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              <b>{report.cleared_count}</b> sudah surut
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-3 pt-0">
          <Button size="sm" variant="ghost" className="w-full" onClick={openTimeline}>
            <History />
            Lihat timeline
          </Button>
        </CardFooter>
      </Card>

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto laporan</DialogTitle>
            <DialogDescription>Tampilan penuh foto banjir</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.photo_url} alt="Foto laporan" className="max-h-[80dvh] w-full rounded-md object-contain" />
        </DialogContent>
      </Dialog>

      {/* Timeline */}
      <Dialog open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Timeline laporan</DialogTitle>
            <DialogDescription>Riwayat foto dan konfirmasi warga untuk titik ini.</DialogDescription>
          </DialogHeader>
          {isTimelineLoading && (
            <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">Memuat timeline...</p>
          )}
          {timeline && (
            <div className="space-y-4">
              <TimelineEntry
                title="Laporan awal"
                timestamp={timeline.report.created_at}
                photoUrl={timeline.report.photo_url}
                comment={timeline.report.comment}
              />
              {timeline.confirmations.map((c) => (
                <TimelineEntry
                  key={c.id}
                  title={c.action === "still_flooded" ? "Masih banjir" : "Sudah surut"}
                  timestamp={c.created_at}
                  photoUrl={c.photo_url}
                  comment={c.comment}
                />
              ))}
              {timeline.confirmations.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada konfirmasi lanjutan.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TimelineEntry({ title, timestamp, photoUrl, comment }: TimelineEntryProps) {
  return (
    <div className="border-l-2 border-primary/30 pl-3">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{title}</span>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: id })}
        </span>
      </div>
      {photoUrl && (
        <div className="mt-2 aspect-[4/3] overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={comment || title} className="h-full w-full object-cover" />
        </div>
      )}
      {comment && <p className="mt-2 text-sm leading-relaxed">{comment}</p>}
    </div>
  );
}
