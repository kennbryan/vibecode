"use client";

import { Loader2, MessageCircle, RefreshCw, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatRulesCard } from "@/components/chat/ChatRulesCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, ChatMessagesResponse, ChatUnreadState } from "@/types/chat";

const POLL_INTERVAL_MS = 15_000;
const ONBOARDING_KEY = "civisense:chat-onboarded";

type ChatPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onUnreadChange: (state: ChatUnreadState) => void;
  onViewLocation: (position: { lat: number; lng: number }) => void;
};

function sortMessages(messages: ChatMessageType[]) {
  return [...messages]
    .sort((first, second) => Date.parse(first.created_at) - Date.parse(second.created_at))
    .slice(-50);
}

function upsertMessage(messages: ChatMessageType[], message: ChatMessageType) {
  const withoutCurrent = messages.filter((item) => item.id !== message.id);
  return sortMessages([message, ...withoutCurrent]);
}

function isSevereSystemMessage(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const record = value as { is_system?: unknown; body?: unknown };
  return record.is_system === true && typeof record.body === "string" && record.body.includes("🚨 Laporan baru");
}

export function ChatPanel({ isOpen, onClose, onUnreadChange, onViewLocation }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [rulesExpandSignal, setRulesExpandSignal] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [unreadState, setUnreadState] = useState<ChatUnreadState>({ count: 0, hasSevereSystemMessage: false });
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isOpenRef = useRef(isOpen);
  const realtimeConnectedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);

  const loadMessages = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/chat/messages", { cache: "no-store" });
      const payload = (await response.json()) as ChatMessagesResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Chat gagal dimuat.");
      }

      const nextMessages = sortMessages(payload.messages || []);
      setMessages(nextMessages);
      knownMessageIdsRef.current = new Set(nextMessages.map((message) => message.id));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Chat gagal dimuat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markUnread = useCallback((record: unknown) => {
    if (!record || typeof record !== "object") return;
    const id = (record as { id?: unknown }).id;
    if (typeof id !== "string" || knownMessageIdsRef.current.has(id) || isOpenRef.current) return;

    setUnreadState((current) => ({
      count: current.count + 1,
      hasSevereSystemMessage: current.hasSevereSystemMessage || isSevereSystemMessage(record),
    }));
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;

    if (isOpen) {
      initialScrollDoneRef.current = false;
      setUnreadState({ count: 0, hasSevereSystemMessage: false });
      void loadMessages();

      try {
        if (window.localStorage.getItem(ONBOARDING_KEY) !== "true") {
          setShowOnboarding(true);
        }
      } catch {
        setShowOnboarding(false);
      }
    }
  }, [isOpen, loadMessages]);

  useEffect(() => {
    onUnreadChange(unreadState);
  }, [onUnreadChange, unreadState]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!realtimeConnectedRef.current) {
        void loadMessages();
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    function refetchFromBrowserEvent() {
      void loadMessages();
      setCooldownUntil((current) => (current && current <= Date.now() ? null : current));
    }

    window.addEventListener("focus", refetchFromBrowserEvent);
    window.addEventListener("online", refetchFromBrowserEvent);
    return () => {
      window.removeEventListener("focus", refetchFromBrowserEvent);
      window.removeEventListener("online", refetchFromBrowserEvent);
    };
  }, [loadMessages]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel("chat:global")
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState() as Record<string, unknown[]>;
        const count = Object.values(presenceState).reduce((total, presences) => total + presences.length, 0);
        setOnlineCount(count);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        markUnread(payload.new);
        void loadMessages();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, () => {
        void loadMessages();
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
        const oldId = (payload.old as { id?: unknown } | null)?.id;
        if (typeof oldId === "string") {
          knownMessageIdsRef.current.delete(oldId);
          setMessages((current) => current.filter((message) => message.id !== oldId));
        } else {
          void loadMessages();
        }
      })
      .subscribe((status) => {
        const connected = status === "SUBSCRIBED";
        realtimeConnectedRef.current = connected;
        setIsRealtimeConnected(connected);

        if (connected) {
          void channel.track({ online_at: new Date().toISOString() });
          void loadMessages();
        }
      });

    return () => {
      realtimeConnectedRef.current = false;
      setIsRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [loadMessages, markUnread]);

  async function sendMessage(payload: { body: string; attached_lat?: number; attached_lng?: number }) {
    const response = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const responsePayload = (await response.json()) as { message?: ChatMessageType; error?: string };

    if (response.status === 429) {
      const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "60", 10);
      setCooldownUntil(Date.now() + Math.max(1, retryAfter) * 1000);
      throw new Error(responsePayload.error || "Tunggu sebentar sebelum mengirim pesan lagi.");
    }

    if (!response.ok || !responsePayload.message) {
      throw new Error(responsePayload.error || "Pesan gagal dikirim.");
    }

    setCooldownUntil(null);
    knownMessageIdsRef.current.add(responsePayload.message.id);
    setMessages((current) => upsertMessage(current, responsePayload.message!));
  }

  async function verifyMessage(messageId: string) {
    const response = await fetch(`/api/chat/messages/${messageId}/verify`, { method: "POST" });
    const payload = (await response.json()) as { message?: ChatMessageType; error?: string };

    if (!response.ok || !payload.message) {
      throw new Error(payload.error || "Verifikasi gagal dikirim.");
    }

    setMessages((current) => upsertMessage(current, payload.message!));
  }

  async function flagMessage(messageId: string) {
    const response = await fetch(`/api/chat/messages/${messageId}/flag`, { method: "POST" });
    const payload = (await response.json()) as { hidden?: boolean; message?: ChatMessageType; error?: string };

    if (!response.ok || !payload.message) {
      throw new Error(payload.error || "Laporan pesan gagal dikirim.");
    }

    if (payload.hidden || payload.message.is_hidden) {
      knownMessageIdsRef.current.delete(messageId);
      setMessages((current) => current.filter((message) => message.id !== messageId));
      return;
    }

    setMessages((current) => upsertMessage(current, payload.message!));
  }

  function dismissOnboarding() {
    try {
      window.localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      // ignore storage errors
    }
    setShowOnboarding(false);
  }

  return (
    <>
      <aside
        className={cn(
          "fixed inset-x-0 bottom-0 z-[1400] flex h-[75dvh] flex-col rounded-t-lg border-t bg-background shadow-2xl transition-transform duration-200 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[5.25rem] lg:h-auto lg:w-[420px] lg:rounded-lg lg:border",
          isOpen ? "translate-y-0 pointer-events-auto lg:translate-x-0" : "translate-y-full pointer-events-none lg:translate-x-[calc(100%+2rem)] lg:translate-y-0",
        )}
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="size-4" />
              💬 Chat global anonim
            </h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              {Math.max(onlineCount, isRealtimeConnected ? 1 : 0)} orang online
              {!isRealtimeConnected && <span>· polling 15 detik</span>}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-9" onClick={onClose} aria-label="Tutup chat">
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b bg-muted/30 p-3">
            <ChatRulesCard expandSignal={rulesExpandSignal} />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {error && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <span>{error}</span>
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => void loadMessages()}>
                  <RefreshCw className="size-4" />
                </Button>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center gap-2 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Memuat chat...
              </div>
            )}

            {!isLoading && messages.length === 0 && !error && (
              <p className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                Belum ada pesan. Jadilah yang pertama berbagi info.
              </p>
            )}

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onFlag={flagMessage}
                onVerify={verifyMessage}
                onViewLocation={onViewLocation}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          <ChatComposer
            cooldownUntil={cooldownUntil}
            onOpenRules={() => setRulesExpandSignal((current) => current + 1)}
            onSend={sendMessage}
          />
        </div>
      </aside>

      <Dialog open={showOnboarding} onOpenChange={(open) => !open && dismissOnboarding()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat global anonim</DialogTitle>
            <DialogDescription>
              Pesan di sini anonim dan tidak permanen. Hanya 50 pesan terakhir yang terlihat. Baca aturan di bawah sebelum mulai.
            </DialogDescription>
          </DialogHeader>
          <Button type="button" onClick={dismissOnboarding}>
            Mengerti
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
