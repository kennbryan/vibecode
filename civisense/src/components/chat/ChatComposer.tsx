"use client";

import { Loader2, MapPin, Send } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { isWithinBojongsoangBounds } from "@/lib/geo";
import { sanitizeProfanity } from "@/lib/profanity";

type ChatComposerPayload = {
  body: string;
  attached_lat?: number;
  attached_lng?: number;
};

type ChatComposerProps = {
  cooldownUntil: number | null;
  onOpenRules: () => void;
  onSend: (payload: ChatComposerPayload) => Promise<void>;
};

export function ChatComposer({ cooldownUntil, onOpenRules, onSend }: ChatComposerProps) {
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [attachedLocation, setAttachedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [now, setNow] = useState(Date.now());

  const remainingSeconds = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const sanitizedPreview = useMemo(() => sanitizeProfanity(body), [body]);
  const hasFilteredPreview = body.trim().length > 0 && sanitizedPreview !== body;
  const canSend = body.trim().length > 0 && body.length <= 280 && !isSending && remainingSeconds === 0;

  useEffect(() => {
    if (!cooldownUntil) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  function toggleLocation(checked: boolean) {
    if (!checked) {
      setAttachedLocation(null);
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung lokasi.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (!isWithinBojongsoangBounds(nextLocation.lat, nextLocation.lng)) {
          toast.error("Lokasi Anda berada di luar area Bojongsoang.");
          setAttachedLocation(null);
          return;
        }

        setAttachedLocation(nextLocation);
        toast.success("Lokasi dilampirkan.");
      },
      () => {
        setIsLocating(false);
        setAttachedLocation(null);
        toast.error("Tidak dapat mengambil lokasi.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;

    setIsSending(true);
    try {
      await onSend({
        body: body.trim(),
        attached_lat: attachedLocation?.lat,
        attached_lng: attachedLocation?.lng,
      });
      setBody("");
      setAttachedLocation(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Pesan gagal dikirim.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={submitMessage} className="shrink-0 border-t bg-background px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 lg:p-3">
      <div className="space-y-2">
        <Textarea
          value={body}
          maxLength={280}
          rows={3}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Bagikan info banjir terkini..."
          className="min-h-[76px] resize-none"
        />
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <button type="button" className="font-medium text-primary hover:underline" onClick={onOpenRules}>
            Aturan
          </button>
          <span>{body.length}/280</span>
        </div>

        {hasFilteredPreview && (
          <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Preview terkirim: {sanitizedPreview}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex min-h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={Boolean(attachedLocation)}
              disabled={isLocating}
              onChange={(event) => toggleLocation(event.target.checked)}
            />
            {isLocating ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
            Lampirkan lokasi saya
          </label>

          <Button type="submit" size="sm" disabled={!canSend} className="min-w-[104px]">
            {isSending ? <Loader2 className="animate-spin" /> : <Send />}
            {remainingSeconds > 0 ? `Tunggu ${remainingSeconds}d` : "Kirim"}
          </Button>
        </div>
      </div>
    </form>
  );
}
