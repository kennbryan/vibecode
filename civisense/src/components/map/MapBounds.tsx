"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { boundsAsLeafletTuple, maxBoundsAsLeafletTuple } from "@/lib/geo";

export function MapBounds() {
  const map = useMap();

  useEffect(() => {
    const bounds = boundsAsLeafletTuple();
    const maxBounds = maxBoundsAsLeafletTuple();
    map.setMaxBounds(maxBounds);
    map.fitBounds(bounds, { padding: [18, 18], animate: false });
    map.setMinZoom(14);
  }, [map]);

  return null;
}
