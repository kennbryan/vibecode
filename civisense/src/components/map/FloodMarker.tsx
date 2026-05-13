"use client";

import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { ReportPopup } from "@/components/reports/ReportPopup";
import { SEVERITY_CONFIG } from "@/lib/constants";
import type { ConfirmReportAction, ConfirmReportOptions, FloodReport, ReportSeverity } from "@/types/report";

type FloodMarkerProps = {
  report: FloodReport;
  onConfirm: (id: string, action: ConfirmReportAction, options?: ConfirmReportOptions) => Promise<FloodReport>;
  hasVoted: boolean;
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

export function FloodMarker({ report, onConfirm, hasVoted }: FloodMarkerProps) {
  return (
    <Marker position={[report.latitude, report.longitude]} icon={markerIcons[report.severity]}>
      <Popup
        minWidth={190}
        maxWidth={190}
        autoPan={false}
        className="civisense-report-popup"
      >
        <ReportPopup report={report} onConfirm={onConfirm} hasVoted={hasVoted} />
      </Popup>
    </Marker>
  );
}

