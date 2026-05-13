"use client";

import { List, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "map" | "list";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="grid grid-cols-2 rounded-md border bg-background p-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn("h-8", value === "map" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
        onClick={() => onChange("map")}
        aria-pressed={value === "map"}
      >
        <Map className="size-4" />
        Peta
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn("h-8", value === "list" && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground")}
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
      >
        <List className="size-4" />
        Daftar
      </Button>
    </div>
  );
}
