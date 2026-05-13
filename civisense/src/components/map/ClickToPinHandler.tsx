"use client";

import { toast } from "sonner";
import { useMapEvents } from "react-leaflet";
import { isWithinBojongsoangBounds } from "@/lib/geo";

type ClickToPinHandlerProps = {
  onPick: (position: { lat: number; lng: number }) => void;
  enabled?: boolean;
};

export function ClickToPinHandler({ onPick, enabled = true }: ClickToPinHandlerProps) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      const next = { lat: event.latlng.lat, lng: event.latlng.lng };

      if (!isWithinBojongsoangBounds(next.lat, next.lng)) {
        toast.error("Titik di luar Bojongsoang tidak dapat dilaporkan.", { id: "out-of-bounds" });
        return;
      }

      onPick(next);
    },
  });

  return null;
}
