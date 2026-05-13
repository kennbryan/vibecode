import { NextRequest } from "next/server";
import { limitPublicRead, publicRateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { FloodReport } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const columns =
  "id,latitude,longitude,severity,water_depth,status,comment,reporter_name,photo_url,confirmation_count,cleared_count,created_at,updated_at,last_confirmed_at,expires_at";

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
      .select(columns)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 500, headers: publicHeaders() });
    }

    const reports = ((data || []) as FloodReport[]).map((report) => ({
      id: report.id,
      latitude: report.latitude,
      longitude: report.longitude,
      severity: report.severity,
      water_depth: report.water_depth,
      status: report.status,
      comment: report.comment,
      reporter_name: report.reporter_name && report.reporter_name !== "Anonymous" ? report.reporter_name : null,
      photo_url: report.photo_url,
      confirmation_count: report.confirmation_count,
      cleared_count: report.cleared_count,
      created_at: report.created_at,
      updated_at: report.updated_at,
      last_confirmed_at: report.last_confirmed_at,
      expires_at: report.expires_at,
    }));

    return Response.json(reports, { headers: publicHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidak dapat memuat laporan publik.";
    return Response.json({ error: message }, { status: 500, headers: publicHeaders() });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: publicHeaders() });
}
