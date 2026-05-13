"use client";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Camera, CheckCircle2, Droplets, History, Loader2, X, ZoomIn } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SeverityBadge } from "@/components/reports/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WATER_DEPTH_CONFIG } from "@/lib/constants";
import type { ConfirmReportAction, ConfirmReportOptions, FloodReport, ReportTimeline } from "@/types/report";

type ReportPopupProps = {
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

export function ReportPopup({ report, onConfirm, hasVoted }: ReportPopupProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ConfirmReportAction>("still_flooded");
  const [pendingAction, setPendingAction] = useState<ConfirmReportAction | null>(null);
  const [confirmPhoto, setConfirmPhoto] = useState<File | null>(null);
  const [confirmComment, setConfirmComment] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string>("");
  const [timeline, setTimeline] = useState<ReportTimeline | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = pendingAction !== null;

  function openLightbox(src: string) {
    setLightboxSrc(src);
    setIsLightboxOpen(true);
  }

  function handlePhotoChange(file: File | null) {
    setConfirmPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function resetConfirm() {
    setConfirmPhoto(null);
    setConfirmComment("");
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setSelectedAction("still_flooded");
  }

  async function handleSubmit() {
    if (isSubmitting) return;
    setPendingAction(selectedAction);
    try {
      const options: ConfirmReportOptions = {};
      if (confirmPhoto) options.photo = confirmPhoto;
      if (confirmComment.trim()) options.comment = confirmComment.trim();
      await onConfirm(report.id, selectedAction, Object.keys(options).length ? options : undefined);
      toast.success(selectedAction === "still_flooded" ? "Suara masih banjir tercatat." : "Suara sudah surut tercatat.");
      resetConfirm();
      setIsConfirmOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verifikasi gagal dikirim.");
    } finally {
      setPendingAction(null);
    }
  }

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
      <div className="w-[174px] space-y-1.5">
        {/* Photo */}
        <div
          className="group relative h-28 cursor-zoom-in overflow-hidden rounded-md bg-muted"
          onClick={() => openLightbox(report.photo_url)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={report.photo_url} alt={report.comment} className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <ZoomIn className="size-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <SeverityBadge severity={report.severity} />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: id })}
            </span>
          </div>
          {report.water_depth && (
            <p className="text-[11px] font-medium leading-snug text-primary">
              Kedalaman {WATER_DEPTH_CONFIG[report.water_depth].label.toLowerCase()} ({WATER_DEPTH_CONFIG[report.water_depth].approx})
            </p>
          )}
          <p className="line-clamp-2 text-xs leading-snug">{report.comment}</p>
          <p className="truncate text-[11px] text-muted-foreground">Oleh {report.reporter_name || "Anonymous"}</p>
        </div>

        {/* Vote counts */}
        <div className="grid gap-0.5 rounded-md border bg-muted/40 px-2 py-1.5 text-[11px]">
          <span className="flex items-center gap-1 text-blue-600">
            <Droplets className="size-3" />
            <b>{report.confirmation_count}</b> masih banjir
          </span>
          <span className="flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="size-3" />
            <b>{report.cleared_count}</b> sudah surut
          </span>
        </div>

        {/* Confirm */}
        {hasVoted ? (
          <p className="rounded-md bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            Anda sudah memberikan suara.
          </p>
        ) : (
          <Button size="sm" variant="outline" className="h-8 w-full text-xs" onClick={() => setIsConfirmOpen(true)}>
            <Camera className="size-3" />
            Konfirmasi laporan
          </Button>
        )}

        <Button size="sm" variant="ghost" className="h-8 w-full text-xs" onClick={openTimeline}>
          <History className="size-3" />
          Lihat timeline
        </Button>
      </div>

      {/* Confirm dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={(open) => { if (!open) resetConfirm(); setIsConfirmOpen(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi laporan</DialogTitle>
            <DialogDescription>Bagikan foto dan kondisi terkini di lokasi ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Photo upload area */}
            <input
              ref={photoInputRef}
              id={`confirm-photo-${report.id}`}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
            />
            {photoPreview ? (
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handlePhotoChange(null)}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <label
                htmlFor={`confirm-photo-${report.id}`}
                className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-muted/30 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <Camera className="size-8 opacity-50" />
                <span>Tap untuk tambah foto</span>
                <span className="text-xs opacity-60">Opsional</span>
              </label>
            )}

            {/* Action toggle */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Kondisi saat ini:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAction("still_flooded")}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedAction === "still_flooded"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <Droplets className="size-4" />
                  Masih banjir
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAction("cleared")}
                  className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedAction === "cleared"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  <CheckCircle2 className="size-4" />
                  Sudah surut
                </button>
              </div>
            </div>

            {/* Description */}
            <textarea
              value={confirmComment}
              onChange={(e) => setConfirmComment(e.target.value)}
              placeholder="Keterangan tambahan... (opsional)"
              maxLength={500}
              rows={2}
              disabled={isSubmitting}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { resetConfirm(); setIsConfirmOpen(false); }} disabled={isSubmitting}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Kirim"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto laporan</DialogTitle>
            <DialogDescription>Tampilan penuh foto banjir</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxSrc} alt="Foto laporan" className="max-h-[80dvh] w-full rounded-md object-contain" />
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
