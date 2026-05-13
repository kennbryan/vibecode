import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";
import { getClientIp } from "@/lib/ip";

type LimitResult = {
  allowed: boolean;
  retryAfter?: number;
};

type LimitCheck = {
  limiter: Ratelimit | null;
};

const RATE_LIMIT_MESSAGE = "Terlalu banyak laporan dari lokasi Anda. Coba lagi nanti.";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const hasUpstashConfig = Boolean(upstashUrl && upstashToken);
let hasWarnedMissingConfig = false;
let hasWarnedRuntimeError = false;

const redis = hasUpstashConfig ? new Redis({ url: upstashUrl!, token: upstashToken! }) : null;

const reportHourLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      prefix: "civisense:reports:hour",
    })
  : null;

const reportBurstLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "30 s"),
      prefix: "civisense:reports:burst",
    })
  : null;

const confirmationLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "civisense:reports:confirm",
    })
  : null;

const publicReadLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "civisense:public:read",
    })
  : null;

const chatSendLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "60 s"),
      prefix: "civisense:chat:send",
    })
  : null;

const chatVerifyLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "civisense:chat:verify",
    })
  : null;

const chatFlagLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "civisense:chat:flag",
    })
  : null;

function warnMissingConfigOnce() {
  if (!hasWarnedMissingConfig) {
    hasWarnedMissingConfig = true;
    console.warn("Upstash env vars are missing; CiviSense rate limiting is disabled for this runtime.");
  }
}

function warnRuntimeErrorOnce(error: unknown) {
  if (!hasWarnedRuntimeError) {
    hasWarnedRuntimeError = true;
    console.warn("CiviSense rate limiting failed open.", error);
  }
}

function retryAfterSeconds(reset: number) {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

const isDev = process.env.NODE_ENV === "development";

async function checkLimits(identifier: string, checks: LimitCheck[]): Promise<LimitResult> {
  if (isDev) {
    return { allowed: true };
  }

  if (!hasUpstashConfig) {
    warnMissingConfigOnce();
    return { allowed: true };
  }

  try {
    for (const check of checks) {
      if (!check.limiter) {
        continue;
      }

      const result = await check.limiter.limit(identifier);

      if (!result.success) {
        return {
          allowed: false,
          retryAfter: retryAfterSeconds(result.reset),
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    warnRuntimeErrorOnce(error);
    return { allowed: true };
  }
}

export { getClientIp };

export async function limitReportCreate(request: NextRequest) {
  const ip = getClientIp(request);

  return checkLimits(`create:${ip}`, [
    { limiter: reportBurstLimit },
    { limiter: reportHourLimit },
  ]);
}

export async function limitReportConfirmation(request: NextRequest) {
  const ip = getClientIp(request);

  return checkLimits(`confirm:${ip}`, [{ limiter: confirmationLimit }]);
}

export async function limitPublicRead(request: NextRequest) {
  const ip = getClientIp(request);

  return checkLimits(`public:${ip}`, [{ limiter: publicReadLimit }]);
}

export async function limitChatSend(ipHash: string) {
  return checkLimits(`chat:send:${ipHash}`, [{ limiter: chatSendLimit }]);
}

export async function limitChatVerify(ipHash: string) {
  return checkLimits(`chat:verify:${ipHash}`, [{ limiter: chatVerifyLimit }]);
}

export async function limitChatFlag(ipHash: string) {
  return checkLimits(`chat:flag:${ipHash}`, [{ limiter: chatFlagLimit }]);
}

export function rateLimitResponse(result: LimitResult) {
  return Response.json(
    { error: RATE_LIMIT_MESSAGE },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter || 60),
      },
    },
  );
}

export function publicRateLimitResponse(result: LimitResult) {
  return Response.json(
    { error: "Terlalu banyak permintaan. Coba lagi nanti." },
    {
      status: 429,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Retry-After": String(result.retryAfter || 60),
      },
    },
  );
}

export function chatRateLimitResponse(result: LimitResult, message = "Terlalu cepat mengirim pesan. Coba lagi sebentar.") {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter || 60),
      },
    },
  );
}
