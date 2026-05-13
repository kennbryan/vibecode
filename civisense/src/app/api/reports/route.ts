import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { REPORT_EXPIRY_HOURS, TIME_WINDOWS } from "@/lib/constants";
import { createReportSystemMessage } from "@/lib/chat-server";
import { isWithinBojongsoangBounds, parseCoordinate } from "@/lib/geo";
import { limitReportCreate, rateLimitResponse } from "@/lib/rate-limit";
import { jsonError } from "@/lib/utils";
import type { FloodReport, ReportSeverity, WaterDepth } from "@/types/report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const severities: ReportSeverity[] = ["light", "moderate", "severe"];
const waterDepths: WaterDepth[] = ["ankle", "calf", "knee", "thigh", "waist", "above_waist"];
const MAX_PHOTO_SIZE_BYTES = 524_288;

function isSeverity(value: FormDataEntryValue | null): value is ReportSeverity {
  return typeof value === "string" && severities.includes(value as ReportSeverity);
}

function isWaterDepth(value: FormDataEntryValue | null): value is WaterDepth {
  return typeof value === "string" && waterDepths.includes(value as WaterDepth);
}

function cleanText(value: FormDataEntryValue | null, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function selectColumns() {
  return "id,latitude,longitude,severity,water_depth,status,comment,reporter_name,photo_url,confirmation_count,cleared_count,created_at,updated_at,last_confirmed_at,expires_at";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity");
    const timeWindow = searchParams.get("time") || "5h";
    const sort = searchParams.get("sort") || "newest";
    const since = new Date(Date.now() - (TIME_WINDOWS[timeWindow as keyof typeof TIME_WINDOWS] ?? TIME_WINDOWS["5h"])).toISOString();

    let query = supabase
      .from("flood_reports")
      .select(selectColumns())
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .or(`created_at.gte.${since},last_confirmed_at.gte.${since}`);

    if (severity && severity !== "all" && severities.includes(severity as ReportSeverity)) {
      query = query.eq("severity", severity);
    }

    query =
      sort === "confirmed"
        ? query.order("confirmation_count", { ascending: false }).order("last_confirmed_at", { ascending: false })
        : query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json({ reports: (data || []) as unknown as FloodReport[] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tidak dapat memuat laporan.";
    return jsonError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const limit = await limitReportCreate(request);

    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return jsonError("Permintaan harus menggunakan multipart/form-data.", 422);
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return jsonError("Format permintaan tidak valid.", 422);
    }
    const latitude = parseCoordinate(formData.get("latitude"));
    const longitude = parseCoordinate(formData.get("longitude"));
    const comment = cleanText(formData.get("comment"));
    const reporterName = cleanText(formData.get("reporter_name"), "Anonymous").slice(0, 80);
    const severity = formData.get("severity");
    const waterDepth = formData.get("water_depth");
    const photo = formData.get("photo");

    if (!isWithinBojongsoangBounds(latitude, longitude)) {
      return jsonError("Lokasi laporan harus berada di area Bojongsoang.", 422);
    }

    if (!isSeverity(severity)) {
      return jsonError("Pilih tingkat banjir yang valid.", 422);
    }

    if (waterDepth !== null && !isWaterDepth(waterDepth)) {
      return jsonError("Pilih perkiraan kedalaman yang valid.", 422);
    }
    const validatedWaterDepth = isWaterDepth(waterDepth) ? waterDepth : null;

    if (!comment || comment.length > 500) {
      return jsonError("Komentar wajib diisi dan maksimal 500 karakter.", 422);
    }

    if (!(photo instanceof File) || photo.size === 0) {
      return jsonError("Foto banjir wajib diunggah.", 422);
    }

    if (photo.size > MAX_PHOTO_SIZE_BYTES) {
      return jsonError("Ukuran foto maksimal 512KB setelah kompresi.", 413);
    }

    const ALLOWED_MIME: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "jpg",
      "image/heif": "jpg",
    };
    const extension = ALLOWED_MIME[photo.type];
    if (!extension) {
      return jsonError("Format foto tidak didukung. Gunakan JPEG, PNG, atau WebP.", 422);
    }

    const supabase = getSupabaseAdminClient();
    const filePath = `reports/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;
    const photoBuffer = Buffer.from(await photo.arrayBuffer());

    const storedContentType = photo.type === "image/heic" || photo.type === "image/heif" ? "image/jpeg" : photo.type || "image/jpeg";
    const upload = await supabase.storage.from("flood-photos").upload(filePath, photoBuffer, {
      contentType: storedContentType,
      upsert: false,
    });

    if (upload.error) {
      return jsonError(upload.error.message, 500);
    }

    const { data: publicUrl } = supabase.storage.from("flood-photos").getPublicUrl(filePath);
    const expiresAt = new Date(Date.now() + REPORT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("flood_reports")
      .insert({
        latitude,
        longitude,
        severity,
        water_depth: validatedWaterDepth,
        comment,
        reporter_name: reporterName,
        photo_url: publicUrl.publicUrl,
        confirmation_count: 1,
        expires_at: expiresAt,
        last_confirmed_at: new Date().toISOString(),
      })
      .select(selectColumns())
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    try {
      const { error: chatError } = await createReportSystemMessage(latitude, longitude, severity);
      if (chatError) {
        console.warn("Gagal membuat pesan sistem chat.", chatError.message);
      }
    } catch (chatError) {
      console.warn("Gagal membuat pesan sistem chat.", chatError);
    }

    return Response.json({ report: data as unknown as FloodReport }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Laporan gagal dikirim.";
    return jsonError(message, 500);
  }
}
