import { getSupabaseAdminClient } from "@/lib/supabase";
import { jsonError } from "@/lib/utils";
import type { FloodReport } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const columns =
  "id,latitude,longitude,severity,report_type,water_depth,status,comment,reporter_name,photo_url,confirmation_count,cleared_count,created_at,updated_at,last_confirmed_at,expires_at";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from("flood_reports").select(columns).eq("id", params.id).single();

    if (error) {
      return jsonError("Laporan tidak ditemukan.", 404);
    }

    return Response.json({ report: data as FloodReport });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidak dapat memuat laporan.";
    return jsonError(message, 500);
  }
}
