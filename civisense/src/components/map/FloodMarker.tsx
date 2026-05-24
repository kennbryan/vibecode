"use client";

import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { ReportPopup } from "@/components/reports/ReportPopup";
import { REPORT_TYPE_CONFIG, SEVERITY_CONFIG } from "@/lib/constants";
import type { ConfirmReportAction, ConfirmReportOptions, FloodReport, ReportSeverity, ReportType } from "@/types/report";

type FloodMarkerProps = {
  report: FloodReport;
  onConfirm: (id: string, action: ConfirmReportAction, options?: ConfirmReportOptions) => Promise<FloodReport>;
  hasVoted: boolean;
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

export function FloodMarker({ report, onConfirm, hasVoted }: FloodMarkerProps) {
  return (
    <Marker position={[report.latitude, report.longitude]} icon={getMarkerIcon(report)}>
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

