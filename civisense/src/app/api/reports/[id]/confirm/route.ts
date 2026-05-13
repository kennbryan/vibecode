import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getClientIp, limitReportConfirmation, rateLimitResponse } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { jsonError } from "@/lib/utils";
import type { ConfirmReportAction, FloodReport } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO_SIZE_BYTES = 524_288;
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "jpg",
  "image/heif": "jpg",
};

function isAction(value: unknown): value is ConfirmReportAction {
  return value === "still_flooded" || value === "cleared";
}

function cleanText(value: FormDataEntryValue | string | undefined | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function parseConfirmationPayload(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      action: formData.get("action"),
      comment: cleanText(formData.get("comment")),
      photo: formData.get("photo"),
    };
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string; comment?: string };
  return {
    action: body.action,
    comment: cleanText(body.comment),
    photo: null,
  };
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const limit = await limitReportConfirmation(request);
    if (!limit.allowed) return rateLimitResponse(limit);

    const ip = getClientIp(request);
    const body = await parseConfirmationPayload(request);

    if (!isAction(body.action)) return jsonError("Aksi verifikasi tidak valid.", 422);
    if (body.comment.length > 500) return jsonError("Komentar maksimal 500 karakter.", 422);

    const supabase = getSupabaseAdminClient();

    // Check if this IP already voted on this report
    const { data: existing } = await supabase
      .from("report_votes")
      .select("id")
      .eq("report_id", params.id)
      .eq("voter_ip", ip)
      .maybeSingle();

    if (existing) {
      return jsonError("Anda sudah memberikan suara untuk laporan ini.", 409);
    }

    const photo = body.photo;
    let photoUrl: string | null = null;
    let uploadedFilePath: string | null = null;

    if (photo instanceof File && photo.size > 0) {
      if (photo.size > MAX_PHOTO_SIZE_BYTES) return jsonError("Ukuran foto maksimal 512KB setelah kompresi.", 413);

      const extension = ALLOWED_MIME[photo.type];
      if (!extension) return jsonError("Format foto tidak didukung. Gunakan JPEG, PNG, atau WebP.", 422);

      const filePath = `confirmations/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
      const photoBuffer = Buffer.from(await photo.arrayBuffer());
      const storedContentType = photo.type === "image/heic" || photo.type === "image/heif" ? "image/jpeg" : photo.type || "image/jpeg";
      const upload = await supabase.storage.from("flood-photos").upload(filePath, photoBuffer, {
        contentType: storedContentType,
        upsert: false,
      });

      if (upload.error) return jsonError(upload.error.message, 500);

      const { data: publicUrl } = supabase.storage.from("flood-photos").getPublicUrl(filePath);
      uploadedFilePath = filePath;
      photoUrl = publicUrl.publicUrl;
    }

    // Record the vote
    const { error: voteError } = await supabase
      .from("report_votes")
      .insert({ report_id: params.id, voter_ip: ip, action: body.action });

    if (voteError) {
      if (uploadedFilePath) await supabase.storage.from("flood-photos").remove([uploadedFilePath]);
      if (voteError.code === "23505") return jsonError("Anda sudah memberikan suara untuk laporan ini.", 409);
      if (voteError.code === "23503") return jsonError("Laporan tidak ditemukan.", 404);
      return jsonError(voteError.message, 500);
    }

    const { data, error } = await supabase
      .rpc("confirm_flood_report", {
        p_report_id: params.id,
        p_action: body.action,
        p_photo_url: photoUrl,
        p_comment: body.comment || null,
      })
      .single();

    if (error) {
      if (uploadedFilePath) await supabase.storage.from("flood-photos").remove([uploadedFilePath]);
      return jsonError(
        error.message.includes("Report not found") ? "Laporan tidak ditemukan." : error.message,
        error.message.includes("Report not found") ? 404 : 500,
      );
    }

    return Response.json({ report: data as FloodReport });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verifikasi gagal dikirim.";
    return jsonError(message, 500);
  }
}
