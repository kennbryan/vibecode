import { NextRequest } from "next/server";
import { getClientIpHash } from "@/lib/ip";
import { chatRateLimitResponse, limitChatFlag } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { jsonError } from "@/lib/utils";
import { toPublicChatMessage, type ChatActionRow } from "@/lib/chat-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const viewerIpHash = getClientIpHash(request);
    const limit = await limitChatFlag(viewerIpHash);

    if (!limit.allowed) {
      return chatRateLimitResponse(limit, "Terlalu banyak laporan pesan. Coba lagi sebentar.");
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .rpc("flag_chat_message", {
        p_message_id: params.id,
        p_ip_hash: viewerIpHash,
      })
      .single();

    if (error) {
      return jsonError(error.message, 500);
    }

    const row = data as ChatActionRow;

    if (row.outcome === "not_found") {
      return jsonError("Pesan tidak ditemukan.", 404);
    }

    if (row.outcome === "self") {
      return jsonError("Pesan sendiri tidak dapat dilaporkan.", 403);
    }

    if (row.outcome === "system") {
      return jsonError("Pesan sistem tidak dapat dilaporkan.", 403);
    }

    if (row.outcome === "duplicate") {
      return jsonError("Anda sudah melaporkan pesan ini.", 409);
    }

    return Response.json({
      message: toPublicChatMessage(row),
      hidden: row.outcome === "hidden",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Laporan pesan gagal dikirim.";
    return jsonError(message, 500);
  }
}
