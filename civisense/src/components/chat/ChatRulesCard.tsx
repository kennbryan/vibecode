"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHAT_RULES } from "@/lib/chat-rules";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "civisense:chat-rules-collapsed";

type ChatRulesCardProps = {
  expandSignal: number;
};

export const ChatRulesCard = forwardRef<HTMLDivElement, ChatRulesCardProps>(({ expandSignal }, forwardedRef) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        window.localStorage.setItem(STORAGE_KEY, "true");
        return false;
      }
      return stored === "true";
    } catch {
      return false;
    }
  });

  function setRefs(node: HTMLDivElement | null) {
    localRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }

  useEffect(() => {
    if (expandSignal === 0) return;

    setIsCollapsed(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "false");
    } catch {
      // ignore storage errors
    }

    window.requestAnimationFrame(() => {
      localRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [expandSignal]);

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }

  return (
    <Card ref={setRefs} className="overflow-hidden rounded-lg shadow-none">
      <CardHeader className="flex-row items-center justify-between gap-3 p-3">
        <CardTitle className="text-sm">📋 Aturan Chat</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={toggleCollapsed}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? "Buka" : "Tutup"}
          <ChevronDown className={cn("size-4 transition-transform", !isCollapsed && "rotate-180")} />
        </Button>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="px-3 pb-3 pt-0">
          <ul className="grid gap-2 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
            {CHAT_RULES.map((rule) => (
              <li key={rule.text} className="flex gap-2">
                <span aria-hidden="true">{rule.icon}</span>
                <span>{rule.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
});

ChatRulesCard.displayName = "ChatRulesCard";
