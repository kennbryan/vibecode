import dynamic from "next/dynamic";
import { getSupabaseServerClient } from "@/lib/supabase";
import type { FloodReport, ReportSeverity } from "@/types/report";

type EmbedPageProps = {
  searchParams?: {
    severity?: string;
    height?: string;
    zoom?: string;
  };
};

const EmbedMapClient = dynamic(() => import("@/components/map/EmbedMapClient"), {
  ssr: false,
  loading: () => <main className="flex h-[600px] items-center justify-center text-sm text-muted-foreground">Memuat peta...</main>,
});

const columns =
  "id,latitude,longitude,severity,report_type,water_depth,status,comment,reporter_name,photo_url,confirmation_count,cleared_count,created_at,updated_at,last_confirmed_at,expires_at";
const severities: ReportSeverity[] = ["light", "moderate", "severe"];

export const dynamicParams = true;
export const revalidate = 60;

function parseHeight(value: string | undefined) {
  const height = Number(value || "600");
  return Number.isFinite(height) ? Math.max(320, Math.min(900, height)) : 600;
}

function parseZoom(value: string | undefined) {
  const zoom = Number(value || "15");
  return Number.isFinite(zoom) ? Math.max(14, Math.min(19, zoom)) : 15;
}

async function getReports(severity: string | undefined) {
  try {
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("flood_reports")
      .select(columns)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (severity && severities.includes(severity as ReportSeverity)) {
      query = query.eq("severity", severity);
    }

    const { data, error } = await query;
    return error ? [] : ((data || []) as FloodReport[]);
  } catch {
    return [];
  }
}

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
  const reports = await getReports(searchParams?.severity);

  return <EmbedMapClient reports={reports} height={parseHeight(searchParams?.height)} zoom={parseZoom(searchParams?.zoom)} />;
}
