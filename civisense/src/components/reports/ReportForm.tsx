"use client";

import { Camera, ImagePlus, Loader2, MapPinned, X } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SEVERITY_CONFIG, WATER_DEPTH_CONFIG } from "@/lib/constants";
import { isWithinBojongsoangBounds } from "@/lib/geo";
import { compressReportPhoto } from "@/lib/image";
import { queuePendingReport } from "@/lib/offline-reports";
import { cn } from "@/lib/utils";
import type { FloodReport, ReportSeverity, WaterDepth } from "@/types/report";

type ReportFormProps = {
  position: { lat: number; lng: number } | null;
  onCreated: (report: FloodReport) => void;
};

export function ReportForm({ position, onCreated }: ReportFormProps) {
  const [severity, setSeverity] = useState<ReportSeverity>("moderate");
  const [waterDepth, setWaterDepth] = useState<WaterDepth | null>(null);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const positionText = useMemo(() => {
    if (!position) return "Ketuk peta untuk memilih lokasi.";
    return `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
  }, [position]);

  function handlePhotoChange(file: File | null) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    handlePhotoChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!position || !isWithinBojongsoangBounds(position.lat, position.lng)) {
      toast.error("Pilih titik di dalam area Bojongsoang.");
      return;
    }

    if (!photo) {
      toast.error("Foto banjir wajib diunggah.");
      return;
    }

    setIsSubmitting(true);

    try {
      const compressedPhoto = await compressReportPhoto(photo);

      if (!navigator.onLine) {
        await queuePendingReport({
          id: window.crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          latitude: position.lat,
          longitude: position.lng,
          severity,
          water_depth: waterDepth,
          comment,
          reporter_name: name || "Anonymous",
          photo: compressedPhoto,
          photoName: compressedPhoto.name || "flood-report.jpg",
        });
        toast.warning("Tidak ada koneksi. Laporan akan disimpan saat online.");
        resetForm();
        return;
      }

      const formData = new FormData();
      formData.set("latitude", String(position.lat));
      formData.set("longitude", String(position.lng));
      formData.set("severity", severity);
      if (waterDepth) formData.set("water_depth", waterDepth);
      formData.set("comment", comment);
      formData.set("reporter_name", name || "Anonymous");
      formData.set("photo", compressedPhoto, compressedPhoto.name || "flood-report.jpg");

      const response = await fetch("/api/reports", { method: "POST", body: formData });
      const payload = (await response.json()) as { report?: FloodReport; error?: string };

      if (!response.ok || !payload.report) {
        throw new Error(payload.error || "Laporan gagal dikirim.");
      }

      toast.success("Laporan banjir terkirim.");
      resetForm();
      onCreated(payload.report);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Laporan gagal dikirim.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setWaterDepth(null);
    setComment("");
    setName("");
    handlePhotoChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form onSubmit={submitReport} className="space-y-4">
      <div className="rounded-md border bg-muted/40 p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MapPinned className="size-4" />
          Lokasi laporan
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{positionText}</p>
      </div>

      {/* Photo picker with preview */}
      <div className="space-y-2">
        <Label>Foto banjir</Label>
        {photoPreview ? (
          <div className="relative overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Preview foto banjir" className="aspect-[4/3] w-full object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1 shadow backdrop-blur hover:bg-background"
              aria-label="Hapus foto"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-md border-2 border-dashed bg-muted/40 px-4 py-6 text-sm text-muted-foreground transition hover:bg-muted"
          >
            <ImagePlus className="size-7" />
            <span>Ketuk untuk pilih atau ambil foto</span>
            <span className="text-xs">Akan dikompresi otomatis ke ~300KB</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          id="photo"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
        />
      </div>

      <div className="space-y-2">
        <Label>Tingkat banjir</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SEVERITY_CONFIG) as ReportSeverity[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setSeverity(level)}
              className={cn(
                "rounded-md border px-2 py-2 text-sm font-medium transition",
                severity === level ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted",
              )}
            >
              <span className="mx-auto mb-1 block size-3 rounded-full" style={{ backgroundColor: SEVERITY_CONFIG[level].color }} />
              {SEVERITY_CONFIG[level].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Perkiraan kedalaman (opsional)</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(WATER_DEPTH_CONFIG) as WaterDepth[]).map((depth) => {
            const config = WATER_DEPTH_CONFIG[depth];
            const isActive = waterDepth === depth;
            return (
              <button
                key={depth}
                type="button"
                aria-pressed={isActive}
                onClick={() => setWaterDepth((current) => (current === depth ? null : depth))}
                className={cn(
                  "rounded-md border px-3 py-2 text-left transition",
                  isActive ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium">{config.label}</span>
                <span className={cn("block text-xs", isActive ? "text-background/75" : "text-muted-foreground")}>{config.approx}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">Komentar</Label>
        <Textarea
          id="comment"
          required
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Contoh: Jalan ini sudah banjir setinggi lutut"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reporter">Nama (opsional)</Label>
        <Input id="reporter" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Anonymous" />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || !position}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : <Camera />}
        Kirim laporan
      </Button>
    </form>
  );
}
