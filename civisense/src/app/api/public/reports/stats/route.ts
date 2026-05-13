import { NextRequest } from "next/server";
import { limitPublicRead, publicRateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { ReportSeverity } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SeverityRow = {
  severity: ReportSeverity;
  updated_at: string;
};

function publicHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };
}

export async function GET(request: NextRequest) {
  const limit = await limitPublicRead(request);

  if (!limit.allowed) {
    return publicRateLimitResponse(limit);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("flood_reports")
      .select("severity,updated_at")
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString());

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: publicHeaders() });
    }

    const rows = (data || []) as SeverityRow[];
    const bySeverity: Record<ReportSeverity, number> = { light: 0, moderate: 0, severe: 0 };
    let lastUpdated: string | null = null;

    rows.forEach((row) => {
      bySeverity[row.severity] += 1;
      if (!lastUpdated || row.updated_at > lastUpdated) {
        lastUpdated = row.updated_at;
      }
    });

    return Response.json(
      {
        active_count: rows.length,
        by_severity: bySeverity,
        last_updated: lastUpdated,
      },
      { headers: publicHeaders() },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidak dapat memuat statistik publik.";
    return Response.json({ error: message }, { status: 500, headers: publicHeaders() });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: publicHeaders() });
}
