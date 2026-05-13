import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwardedIp = forwardedFor?.split(",")[0]?.trim();

  return firstForwardedIp || request.headers.get("x-real-ip") || "unknown";
}

export function hashIpAddress(ipAddress: string) {
  const secret = process.env.IP_HASH_SECRET;

  if (!secret) {
    throw new Error("Missing IP_HASH_SECRET environment variable.");
  }

  return createHmac("sha256", secret).update(ipAddress).digest("hex");
}

export function getClientIpHash(request: NextRequest) {
  return hashIpAddress(getClientIp(request));
}
