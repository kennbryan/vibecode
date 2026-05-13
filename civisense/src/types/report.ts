export type ReportSeverity = "light" | "moderate" | "severe";

export type WaterDepth = "ankle" | "calf" | "knee" | "thigh" | "waist" | "above_waist";

export type ReportStatus = "active" | "cleared" | "expired";

export type FloodReport = {
  id: string;
  latitude: number;
  longitude: number;
  severity: ReportSeverity;
  water_depth: WaterDepth | null;
  status: ReportStatus;
  comment: string;
  reporter_name: string;
  photo_url: string;
  confirmation_count: number;
  cleared_count: number;
  created_at: string;
  updated_at: string;
  last_confirmed_at: string;
  expires_at: string;
};

export type CreateReportPayload = {
  latitude: number;
  longitude: number;
  severity: ReportSeverity;
  water_depth?: WaterDepth;
  comment: string;
  reporter_name?: string;
};

export type ReportFilters = {
  severity: ReportSeverity | "all";
  timeWindow: "all" | "1h" | "3h" | "5h" | "7h";
  sort: "newest" | "confirmed";
};

export type ConfirmReportAction = "still_flooded" | "cleared";

export type ConfirmReportOptions = {
  photo?: File;
  comment?: string;
};

export type ReportConfirmation = {
  id: string;
  report_id: string;
  action: ConfirmReportAction;
  photo_url: string | null;
  comment: string | null;
  created_at: string;
};

export type ReportTimeline = {
  report: FloodReport;
  confirmations: ReportConfirmation[];
};

