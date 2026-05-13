import { getSupabaseAdminClient } from "@/lib/supabase";
import { hashIpAddress } from "@/lib/ip";
import type { ChatMessage } from "@/types/chat";

export const CHAT_MESSAGE_SELECT =
  "id,body,ip_hash,verification_count,flag_count,is_hidden,is_system,attached_lat,attached_lng,created_at";

export const CHAT_MESSAGE_PUBLIC_SELECT =
  "id,body,verification_count,flag_count,is_hidden,is_system,attached_lat,attached_lng,created_at";

export type ChatMessageRow = {
  id: string;
  body: string;
  ip_hash: string;
  verification_count: number;
  flag_count: number;
  is_hidden: boolean;
  is_system: boolean;
  attached_lat: number | null;
  attached_lng: number | null;
  created_at: string;
};

export type ChatActionRow = Omit<ChatMessageRow, "ip_hash"> & {
  outcome: "verified" | "flagged" | "hidden" | "duplicate" | "self" | "system" | "not_found";
};

type PublicMessageOptions = {
  viewerVerified?: boolean;
  viewerIsAuthor?: boolean;
};

export function toChatMessage(row: ChatMessageRow, viewerIpHash: string, viewerVerifiedIds: Set<string>): ChatMessage {
  return {
    id: row.id,
    body: row.body,
    verification_count: row.verification_count,
    flag_count: row.flag_count,
    is_hidden: row.is_hidden,
    is_system: row.is_system,
    attached_lat: row.attached_lat,
    attached_lng: row.attached_lng,
    created_at: row.created_at,
    viewer_verified: viewerVerifiedIds.has(row.id),
    viewer_is_author: row.ip_hash === viewerIpHash,
  };
}

export function toPublicChatMessage(row: Omit<ChatMessageRow, "ip_hash">, options: PublicMessageOptions = {}): ChatMessage {
  return {
    id: row.id,
    body: row.body,
    verification_count: row.verification_count,
    flag_count: row.flag_count,
    is_hidden: row.is_hidden,
    is_system: row.is_system,
    attached_lat: row.attached_lat,
    attached_lng: row.attached_lng,
    created_at: row.created_at,
    viewer_verified: Boolean(options.viewerVerified),
    viewer_is_author: Boolean(options.viewerIsAuthor),
  };
}

const SEVERITY_LABEL: Record<string, string> = {
  severe: "parah",
  moderate: "sedang",
  light: "ringan",
};

export async function createReportSystemMessage(latitude: number, longitude: number, severity: string) {
  const supabase = getSupabaseAdminClient();
  const coordinate = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  const label = SEVERITY_LABEL[severity] ?? severity;
  const emoji = severity === "severe" ? "🚨" : severity === "moderate" ? "⚠️" : "🌧️";

  return supabase.from("chat_messages").insert({
    body: `${emoji} Laporan baru: banjir ${label} di ${coordinate}. Buka peta untuk detail.`,
    ip_hash: hashIpAddress("civisense:system"),
    is_system: true,
    attached_lat: latitude,
    attached_lng: longitude,
  });
}
