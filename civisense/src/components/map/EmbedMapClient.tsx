"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import { EmbedFloodMarker } from "@/components/map/EmbedFloodMarker";
import { MapBounds } from "@/components/map/MapBounds";
import { MAP_CENTER } from "@/lib/constants";
import type { FloodReport } from "@/types/report";

type EmbedMapClientProps = {
  reports: FloodReport[];
  height: number;
  zoom: number;
};

export default function EmbedMapClient({ reports, height, zoom }: EmbedMapClientProps) {
  return (
    <main className="relative w-full overflow-hidden" style={{ height }}>
      <MapContainer
        center={[MAP_CENTER.lat, MAP_CENTER.lng]}
        zoom={zoom}
        minZoom={14}
        maxZoom={19}
        zoomControl
        attributionControl
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds />
        {reports.map((report) => (
          <EmbedFloodMarker key={report.id} report={report} />
        ))}
      </MapContainer>
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 z-[500] rounded bg-background/95 px-2 py-1 text-xs font-medium text-primary shadow"
      >
        Powered by CiviSense
      </a>
    </main>
  );
}
