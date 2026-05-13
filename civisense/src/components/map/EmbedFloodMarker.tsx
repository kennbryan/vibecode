"use client";

import L from "leaflet";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Marker, Popup } from "react-leaflet";
import { SeverityBadge } from "@/components/reports/SeverityBadge";
import { SEVERITY_CONFIG, WATER_DEPTH_CONFIG } from "@/lib/constants";
import type { FloodReport, ReportSeverity } from "@/types/report";

type EmbedFloodMarkerProps = {
  report: FloodReport;
};

const markerIcons = Object.fromEntries(
  (Object.keys(SEVERITY_CONFIG) as ReportSeverity[]).map((severity) => [
    severity,
    L.icon({
      iconUrl: SEVERITY_CONFIG[severity].marker,
      iconSize: [36, 44],
      iconAnchor: [18, 42],
      popupAnchor: [0, -40],
    }),
  ]),
) as Record<ReportSeverity, L.Icon>;

export function EmbedFloodMarker({ report }: EmbedFloodMarkerProps) {
  return (
    <Marker position={[report.latitude, report.longitude]} icon={markerIcons[report.severity]}>
      <Popup minWidth={220} autoPan={false}>
        <div className="w-56 space-y-2">
          <SeverityBadge severity={report.severity} />
          {report.water_depth && (
            <p className="text-xs font-medium text-primary">
              {WATER_DEPTH_CONFIG[report.water_depth].label} ({WATER_DEPTH_CONFIG[report.water_depth].approx})
            </p>
          )}
          <p className="text-sm">{report.comment}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: id })}
          </p>
        </div>
      </Popup>
    </Marker>
  );
}
