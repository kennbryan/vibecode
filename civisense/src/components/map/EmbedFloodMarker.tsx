"use client";

import L from "leaflet";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Marker, Popup } from "react-leaflet";
import { ReportTypeBadge } from "@/components/reports/SeverityBadge";
import { REPORT_TYPE_CONFIG, SEVERITY_CONFIG, WATER_DEPTH_CONFIG } from "@/lib/constants";
import type { FloodReport, ReportSeverity, ReportType } from "@/types/report";

type EmbedFloodMarkerProps = {
  report: FloodReport;
};

const severityIcons = Object.fromEntries(
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

const typeIcons = Object.fromEntries(
  (Object.keys(REPORT_TYPE_CONFIG) as ReportType[]).map((type) => [
    type,
    L.icon({
      iconUrl: REPORT_TYPE_CONFIG[type].marker,
      iconSize: [36, 44],
      iconAnchor: [18, 42],
      popupAnchor: [0, -40],
    }),
  ]),
) as Record<ReportType, L.Icon>;

function getMarkerIcon(report: FloodReport): L.Icon {
  if (report.report_type === "river") return typeIcons.river;
  return severityIcons[report.severity];
}

export function EmbedFloodMarker({ report }: EmbedFloodMarkerProps) {
  return (
    <Marker position={[report.latitude, report.longitude]} icon={getMarkerIcon(report)}>
      <Popup minWidth={190} maxWidth={190} autoPan={false} className="civisense-report-popup">
        <div className="w-[174px] space-y-1.5">
          <ReportTypeBadge report={report} />
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
