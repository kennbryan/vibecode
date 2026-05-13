"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatBubbleProps = {
  hasSevereSystemMessage: boolean;
  isOpen: boolean;
  unreadCount: number;
  onOpen: () => void;
};

export function ChatBubble({ hasSevereSystemMessage, isOpen, unreadCount, onOpen }: ChatBubbleProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={isOpen}
      className={cn(
        "relative inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isOpen
          ? "bg-primary/20 text-primary cursor-default"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        hasSevereSystemMessage && "ring-2 ring-orange-400 ring-offset-2",
      )}
      aria-label="Buka chat global anonim"
    >
      <MessageCircle className="size-4 shrink-0" />
      <span>Chat</span>
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
      {hasSevereSystemMessage && !isOpen && (
        <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-orange-500" />
      )}
    </button>
  );
}
