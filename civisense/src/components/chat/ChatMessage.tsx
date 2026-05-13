"use client";

import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Check, Flag, MapPin, MoreVertical, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

type ChatMessageProps = {
  message: ChatMessageType;
  onFlag: (id: string) => Promise<void>;
  onVerify: (id: string) => Promise<void>;
  onViewLocation: (position: { lat: number; lng: number }) => void;
};

function verificationBadge(message: ChatMessageType) {
  if (message.is_system) {
    return <span className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">CiviSense</span>;
  }

  if (message.verification_count >= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
        <ShieldCheck className="size-3.5" />
        ✓✓ Terverifikasi komunitas
      </span>
    );
  }

  if (message.verification_count > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        <Check className="size-3.5" />
        Diverifikasi {message.verification_count} orang
      </span>
    );
  }

  return null;
}

export function ChatMessage({ message, onFlag, onVerify, onViewLocation }: ChatMessageProps) {
  const [isFlagMenuOpen, setIsFlagMenuOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const hasLocation = message.attached_lat !== null && message.attached_lng !== null;

  async function verify() {
    setIsVerifying(true);
    try {
      await onVerify(message.id);
      toast.success("Verifikasi tercatat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verifikasi gagal.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function flag() {
    setIsFlagging(true);
    try {
      await onFlag(message.id);
      toast.success("Laporan pesan tercatat.");
      setIsFlagMenuOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Laporan pesan gagal.");
    } finally {
      setIsFlagging(false);
    }
  }

  return (
    <article
      className={cn(
        "rounded-lg border bg-card p-3 shadow-sm transition-colors",
        message.is_system && "border-orange-200 bg-orange-50",
        !message.is_system && message.verification_count >= 3 && "border-emerald-200 bg-emerald-50/80",
        !message.is_system && message.verification_count >= 5 && "border-emerald-300 bg-emerald-100/75 shadow-md",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {verificationBadge(message)}
            <time className="text-xs text-muted-foreground" dateTime={message.created_at}>
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: idLocale })}
            </time>
          </div>
        </div>

        {!message.is_system && !message.viewer_is_author && (
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setIsFlagMenuOpen((current) => !current)}
              aria-label="Menu pesan"
            >
              <MoreVertical className="size-4" />
            </Button>
            {isFlagMenuOpen && (
              <div className="absolute right-0 top-9 z-10 w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs hover:bg-muted"
                  onClick={() => void flag()}
                  disabled={isFlagging}
                >
                  <Flag className="size-3.5" />
                  Laporkan pesan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className={cn("whitespace-pre-wrap break-words text-sm leading-relaxed", message.is_system && "font-medium text-orange-950")}>
        {message.body}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!message.is_system && !message.viewer_is_author && (
          <Button
            type="button"
            size="sm"
            variant={message.viewer_verified ? "secondary" : "outline"}
            className="h-8 text-xs"
            onClick={() => void verify()}
            disabled={message.viewer_verified || isVerifying}
          >
            <Check className="size-3.5" />
            {message.viewer_verified
              ? `Diverifikasi (${message.verification_count})`
              : `Verifikasi (${message.verification_count})`}
          </Button>
        )}

        {hasLocation && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => onViewLocation({ lat: message.attached_lat!, lng: message.attached_lng! })}
          >
            <MapPin className="size-3.5" />
            Lihat di peta
          </Button>
        )}
      </div>
    </article>
  );
}
