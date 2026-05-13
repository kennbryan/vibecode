import { FloodMap } from "@/components/map/FloodMap";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { FloodReport } from "@/types/report";

const columns =
  "id,latitude,longitude,severity,water_depth,status,comment,reporter_name,photo_url,confirmation_count,cleared_count,created_at,updated_at,last_confirmed_at,expires_at";

export const dynamic = "force-dynamic";

async function getInitialReports(): Promise<FloodReport[]> {
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("flood_reports")
      .select(columns)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return [];
    }

    return (data || []) as FloodReport[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const initialReports = await getInitialReports();

  return <FloodMap initialReports={initialReports} />;
}
