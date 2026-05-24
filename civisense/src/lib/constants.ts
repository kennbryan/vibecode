import type { ReportSeverity, ReportType, WaterDepth } from "@/types/report";

export const BOJONGSOANG_BOUNDS = {
  south: -7.015,
  north: -6.961,
  west: 107.608,
  east: 107.711,
} as const;

export const MAP_MAX_BOUNDS = {
  south: -7.055,
  north: -6.925,
  west: 107.555,
  east: 107.785,
} as const;

export const MAP_CENTER = {
  lat: -6.9733,
  lng: 107.6309,
} as const;

export const REPORT_EXPIRY_HOURS = 10;
export const REPORT_REFRESH_MS = 30_000;

export const SEVERITY_CONFIG: Record<
  ReportSeverity,
  { label: string; english: string; color: string; marker: string; rank: number }
> = {
  light: {
    label: "Ringan",
    english: "Light",
    color: "#EAB308",
    marker: "/icons/marker-light.svg",
    rank: 1,
  },
  moderate: {
    label: "Sedang",
    english: "Moderate",
    color: "#F97316",
    marker: "/icons/marker-moderate.svg",
    rank: 2,
  },
  severe: {
    label: "Parah",
    english: "Severe",
    color: "#DC2626",
    marker: "/icons/marker-severe.svg",
    rank: 3,
  },
};

export const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; description: string; color: string; marker: string }> = {
  flood: {
    label: "Banjir",
    description: "Air menggenangi jalan atau permukiman",
    color: "#F97316",
    marker: "/icons/marker-moderate.svg",
  },
  river: {
    label: "Sungai",
    description: "Sungai meluap atau level air naik",
    color: "#0EA5E9",
    marker: "/icons/marker-river.svg",
  },
};

export const WATER_DEPTH_CONFIG: Record<WaterDepth, { label: string; approx: string }> = {
  ankle: { label: "Semata kaki", approx: "~10 cm" },
  calf: { label: "Sebetis", approx: "~30 cm" },
  knee: { label: "Selutut", approx: "~50 cm" },
  thigh: { label: "Sepaha", approx: "~70 cm" },
  waist: { label: "Sepinggang", approx: "~100 cm" },
  above_waist: { label: "Di atas pinggang", approx: ">100 cm" },
};

export const TIME_WINDOWS = {
  "1h": 1 * 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "5h": 5 * 60 * 60 * 1000,
  "7h": 7 * 60 * 60 * 1000,
} as const;
