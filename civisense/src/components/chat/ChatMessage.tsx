"use client";

import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Flag, MapPin, MoreVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types/chat";

type ChatMessageProps = {
  message: ChatMessageType;
  onFlag: (id: string) => Promise<void>;
  onViewLocation: (position: { lat: number; lng: number }) => void;
};

function systemBadge(message: ChatMessageType) {
  if (!message.is_system) return null;
  return <span className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">CiviSense</span>;
}

export function ChatMessage({ message, onFlag, onViewLocation }: ChatMessageProps) {
  const [isFlagMenuOpen, setIsFlagMenuOpen] = useState(false);
  const [isFlagging, setIsFlagging] = useState(false);
  const hasLocation = message.attached_lat !== null && message.attached_lng !== null;

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
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {systemBadge(message)}
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
