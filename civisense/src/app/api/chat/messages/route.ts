import { NextRequest } from "next/server";
import { CHAT_MESSAGE_SELECT, toChatMessage } from "@/lib/chat-server";
import { isWithinBojongsoangBounds } from "@/lib/geo";
import { getClientIpHash } from "@/lib/ip";
import { sanitizeProfanity } from "@/lib/profanity";
import { chatRateLimitResponse, limitChatSend } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { jsonError } from "@/lib/utils";
import type { ChatMessageRow } from "@/lib/chat-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateChatPayload = {
  body?: unknown;
  attached_lat?: unknown;
  attached_lng?: unknown;
};

function parseOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export async function GET(request: NextRequest) {
  try {
    const viewerIpHash = getClientIpHash(request);
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("chat_messages")
      .select(CHAT_MESSAGE_SELECT)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return jsonError(error.message, 500);
    }

    const rows = (data || []) as ChatMessageRow[];
    const messageIds = rows.map((message) => message.id);
    const viewerVerifiedIds = new Set<string>();

    if (messageIds.length > 0) {
      const { data: verifications, error: verificationError } = await supabase
        .from("chat_verifications")
        .select("message_id")
        .eq("ip_hash", viewerIpHash)
        .in("message_id", messageIds);

      if (verificationError) {
        return jsonError(verificationError.message, 500);
      }

      for (const verification of verifications || []) {
        viewerVerifiedIds.add(verification.message_id as string);
      }
    }

    return Response.json({
      messages: rows.map((row) => toChatMessage(row, viewerIpHash, viewerVerifiedIds)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat gagal dimuat.";
    return jsonError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const viewerIpHash = getClientIpHash(request);
    const limit = await limitChatSend(viewerIpHash);

    if (!limit.allowed) {
      return chatRateLimitResponse(limit, "Tunggu 1 menit sebelum mengirim pesan lagi.");
    }

    const payload = (await request.json().catch(() => ({}))) as CreateChatPayload;
    const body = typeof payload.body === "string" ? payload.body.trim() : "";

    if (body.length < 1 || body.length > 280) {
      return jsonError("Pesan wajib diisi dan maksimal 280 karakter.", 422);
    }

    const attachedLat = parseOptionalNumber(payload.attached_lat);
    const attachedLng = parseOptionalNumber(payload.attached_lng);
    const hasOneCoordinate = (attachedLat === null) !== (attachedLng === null);

    if (hasOneCoordinate || Number.isNaN(attachedLat) || Number.isNaN(attachedLng)) {
      return jsonError("Lampiran lokasi tidak valid.", 422);
    }

    if (
      attachedLat !== null &&
      attachedLng !== null &&
      !isWithinBojongsoangBounds(attachedLat, attachedLng)
    ) {
      return jsonError("Lokasi chat harus berada di area Bojongsoang.", 422);
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        body: sanitizeProfanity(body),
        ip_hash: viewerIpHash,
        attached_lat: attachedLat,
        attached_lng: attachedLng,
      })
      .select(CHAT_MESSAGE_SELECT)
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    return Response.json(
      { message: toChatMessage(data as ChatMessageRow, viewerIpHash, new Set()) },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pesan gagal dikirim.";
    return jsonError(message, 500);
  }
}
