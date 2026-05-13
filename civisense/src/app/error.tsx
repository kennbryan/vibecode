"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex h-[calc(100dvh-65px)] max-w-7xl items-center justify-center px-4">
      <div className="max-w-md rounded-lg border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">CiviSense tidak dapat dimuat</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "Silakan coba lagi."}</p>
        <Button className="mt-4" onClick={reset}>
          <RotateCcw className="size-4" />
          Coba lagi
        </Button>
      </div>
    </main>
  );
}
