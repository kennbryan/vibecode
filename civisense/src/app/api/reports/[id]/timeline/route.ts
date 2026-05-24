import { getSupabaseAdminClient } from "@/lib/supabase";
import { jsonError } from "@/lib/utils";
import type { FloodReport, ReportConfirmation } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportColumns =
  "id,latitude,longitude,severity,report_type,water_depth,status,comment,reporter_name,photo_url,confirmation_count,cleared_count,created_at,updated_at,last_confirmed_at,expires_at";
const confirmationColumns = "id,report_id,action,photo_url,comment,created_at";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdminClient();
    const [reportResult, confirmationsResult] = await Promise.all([
      supabase.from("flood_reports").select(reportColumns).eq("id", params.id).single(),
      supabase
        .from("report_confirmations")
        .select(confirmationColumns)
        .eq("report_id", params.id)
        .order("created_at", { ascending: true }),
    ]);

    if (reportResult.error || !reportResult.data) {
      const notFound = reportResult.error?.code === "PGRST116" || !reportResult.data;
      return jsonError("Laporan tidak ditemukan.", notFound ? 404 : 500);
    }

    if (confirmationsResult.error) {
      return jsonError(confirmationsResult.error.message, 500);
    }

    return Response.json({
      report: reportResult.data as FloodReport,
      confirmations: (confirmationsResult.data || []) as ReportConfirmation[],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Timeline laporan gagal dimuat.";
    return jsonError(message, 500);
  }
}
