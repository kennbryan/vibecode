import type { NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "flood-photos";

function storagePathFromUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    // Supabase public URL format: /storage/v1/object/public/<bucket>/<path>
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    if (url.pathname.startsWith(prefix)) {
      return decodeURIComponent(url.pathname.slice(prefix.length));
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET tidak dikonfigurasi." }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const now = new Date().toISOString();

    // Fetch expired reports that haven't been cleaned up yet
    const { data: expiredReports, error: fetchError } = await supabase
      .from("flood_reports")
      .select("id,photo_url")
      .lt("expires_at", now);

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    if (!expiredReports || expiredReports.length === 0) {
      return Response.json({ deleted: 0, expired: 0 });
    }

    const reportIds = expiredReports.map((r) => r.id as string);

    // Collect all photo paths: report photos + confirmation photos
    const { data: confirmations } = await supabase
      .from("report_confirmations")
      .select("photo_url")
      .in("report_id", reportIds)
      .not("photo_url", "is", null);

    const allPhotoUrls: string[] = [
      ...expiredReports.map((r) => r.photo_url as string).filter(Boolean),
      ...((confirmations || []).map((c) => c.photo_url as string).filter(Boolean)),
    ];

    const storagePaths = allPhotoUrls
      .map(storagePathFromUrl)
      .filter((p): p is string => p !== null);

    // Delete storage files in batches of 100 (Supabase limit)
    let deleted = 0;
    for (let i = 0; i < storagePaths.length; i += 100) {
      const batch = storagePaths.slice(i, i + 100);
      const { error: removeError } = await supabase.storage.from(BUCKET).remove(batch);
      if (!removeError) deleted += batch.length;
    }

    // Hard-delete expired reports (cascades to confirmations and votes)
    const { error: deleteError } = await supabase
      .from("flood_reports")
      .delete()
      .in("id", reportIds);

    if (deleteError) {
      return Response.json({ error: deleteError.message }, { status: 500 });
    }

    return Response.json({ deleted, expired: reportIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup gagal.";
    return Response.json({ error: message }, { status: 500 });
  }
}
