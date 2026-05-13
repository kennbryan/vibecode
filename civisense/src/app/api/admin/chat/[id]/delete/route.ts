import { NextRequest } from "next/server";
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
  const { data, error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("id", params.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 500);
  }

  if (!data) {
    return jsonError("Pesan tidak ditemukan.", 404);
  }

  return Response.json({ ok: true, id: params.id });
}
