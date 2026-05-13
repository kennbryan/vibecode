import { NextRequest } from "next/server";
import { CHAT_MESSAGE_SELECT, toPublicChatMessage, type ChatMessageRow } from "@/lib/chat-server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { jsonError } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertAdmin(request: NextRequest) {
  const expected = process.env.ADMIN_SECRET;
  const provided = request.headers.get("x-admin-secret");

  if (!expected) {
    return jsonError("ADMIN_SECRET belum dikonfigurasi.", 500);
  }

  if (provided !== expected) {
    return jsonError("Akses admin ditolak.", 401);
  }

  return null;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const adminError = assertAdmin(request);
  if (adminError) return adminError;

  const supabase = getSupabaseAdminClient();

  await supabase.from("chat_flags").delete().eq("message_id", params.id);

  const { data, error } = await supabase
    .from("chat_messages")
    .update({ is_hidden: false, flag_count: 0 })
    .eq("id", params.id)
    .select(CHAT_MESSAGE_SELECT)
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return jsonError(status === 404 ? "Pesan tidak ditemukan." : error.message, status);
  }

  const row = data as ChatMessageRow;
  const message = {
    id: row.id,
    body: row.body,
    verification_count: row.verification_count,
    flag_count: row.flag_count,
    is_hidden: row.is_hidden,
    is_system: row.is_system,
    attached_lat: row.attached_lat,
    attached_lng: row.attached_lng,
    created_at: row.created_at,
  };

  return Response.json({ message: toPublicChatMessage(message) });
}
