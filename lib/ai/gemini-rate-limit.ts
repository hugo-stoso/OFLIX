import { createHash } from "node:crypto";

export type GeminiQuotaReason =
  | "allowed"
  | "user_daily_exhausted"
  | "global_daily_exhausted"
  | "global_minute_exhausted"
  | "storage_unavailable";

export type GeminiQuotaDecision = {
  allowed: boolean;
  reason: GeminiQuotaReason;
  userRemaining: number | null;
  globalRemaining: number | null;
  minuteRemaining: number | null;
  dailyResetAt: string | null;
  minuteResetAt: string | null;
  storageConfigured: boolean;
};

type GeminiRateLimitConfig = {
  userDailyLimit: number;
  globalDailyLimit: number;
  globalPerMinuteLimit: number;
  namespace: string;
  redisUrl: string;
  redisToken: string;
};

const DEFAULT_USER_DAILY_LIMIT = 5;
const DEFAULT_GLOBAL_DAILY_LIMIT = 20;
const DEFAULT_GLOBAL_PER_MINUTE_LIMIT = 2;
const MAX_REDIS_WAIT_MS = 4_000;

// One EVAL call makes the three checks and increments one atomic Redis operation.
// A pipeline is deliberately not used: Upstash documents that pipelines allow
// interleaving commands from other clients.
const CONSUME_SCRIPT = `
local function remaining(limit, used)
  return math.max(0, limit - used)
end

local now = redis.call("TIME")
local unix = tonumber(now[1])
local dayTtl = 86400 - (unix % 86400)
local minuteTtl = 60 - (unix % 60)
local userLimit = tonumber(ARGV[1])
local globalDayLimit = tonumber(ARGV[2])
local globalMinuteLimit = tonumber(ARGV[3])
local globalDay = tonumber(redis.call("GET", KEYS[1]) or "0")
local userDay = tonumber(redis.call("GET", KEYS[2]) or "0")
local globalMinute = tonumber(redis.call("GET", KEYS[3]) or "0")

local function denied(reason)
  return {0, reason, remaining(userLimit, userDay), remaining(globalDayLimit, globalDay), remaining(globalMinuteLimit, globalMinute), unix + dayTtl, unix + minuteTtl}
end

if userDay >= userLimit then return denied("user_daily_exhausted") end
if globalDay >= globalDayLimit then return denied("global_daily_exhausted") end
if globalMinute >= globalMinuteLimit then return denied("global_minute_exhausted") end

local newGlobalDay = redis.call("INCR", KEYS[1])
local newUserDay = redis.call("INCR", KEYS[2])
local newGlobalMinute = redis.call("INCR", KEYS[3])
if newGlobalDay == 1 then redis.call("EXPIRE", KEYS[1], dayTtl) end
if newUserDay == 1 then redis.call("EXPIRE", KEYS[2], dayTtl) end
if newGlobalMinute == 1 then redis.call("EXPIRE", KEYS[3], minuteTtl) end

return {1, "allowed", remaining(userLimit, newUserDay), remaining(globalDayLimit, newGlobalDay), remaining(globalMinuteLimit, newGlobalMinute), unix + dayTtl, unix + minuteTtl}
`;

function cappedLimit(value: string | undefined, fallback: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(maximum, Math.floor(parsed));
}

function envFirst(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function normalizedNamespace(value: string) {
  const normalized = value.replace(/[^a-zA-Z0-9:_-]/gu, "-").replace(/-+/gu, "-").replace(/:{2,}/gu, ":");
  return normalized || "oflix:gemini";
}

export function geminiRateLimitConfig(): GeminiRateLimitConfig {
  return {
    userDailyLimit: cappedLimit(process.env.GEMINI_USER_DAILY_LIMIT, DEFAULT_USER_DAILY_LIMIT, DEFAULT_USER_DAILY_LIMIT),
    globalDailyLimit: cappedLimit(process.env.GEMINI_GLOBAL_DAILY_LIMIT, DEFAULT_GLOBAL_DAILY_LIMIT, DEFAULT_GLOBAL_DAILY_LIMIT),
    globalPerMinuteLimit: cappedLimit(process.env.GEMINI_GLOBAL_PER_MINUTE_LIMIT, DEFAULT_GLOBAL_PER_MINUTE_LIMIT, DEFAULT_GLOBAL_PER_MINUTE_LIMIT),
    namespace: normalizedNamespace(process.env.GEMINI_RATE_LIMIT_NAMESPACE?.trim() || "oflix:gemini"),
    redisUrl: envFirst("GEMINI_RATE_LIMIT_REDIS_URL", "UPSTASH_REDIS_REST_URL"),
    redisToken: envFirst("GEMINI_RATE_LIMIT_REDIS_TOKEN", "UPSTASH_REDIS_REST_TOKEN"),
  };
}

export function geminiRateLimitDiagnostics() {
  const config = geminiRateLimitConfig();
  const validUrl = (() => {
    try {
      const url = new URL(config.redisUrl);
      return url.protocol === "https:" || process.env.NODE_ENV !== "production";
    } catch {
      return false;
    }
  })();
  return {
    storage: "upstash-redis-rest-eval" as const,
    configured: Boolean(config.redisUrl && config.redisToken && validUrl),
    userDailyLimit: config.userDailyLimit,
    globalDailyLimit: config.globalDailyLimit,
    globalPerMinuteLimit: config.globalPerMinuteLimit,
  };
}

function unavailableDecision(): GeminiQuotaDecision {
  return {
    allowed: false,
    reason: "storage_unavailable",
    userRemaining: null,
    globalRemaining: null,
    minuteRemaining: null,
    dailyResetAt: null,
    minuteResetAt: null,
    storageConfigured: false,
  };
}

function safeResetAt(value: unknown) {
  const epoch = typeof value === "number" ? value : Number(value);
  return Number.isFinite(epoch) && epoch > 0 ? new Date(epoch * 1_000).toISOString() : null;
}

function hashedIdentity(profileId: string, clientKey: string) {
  return createHash("sha256").update(`${profileId}|${clientKey}`).digest("hex").slice(0, 32);
}

function redisKeys(config: GeminiRateLimitConfig, profileId: string, clientKey: string) {
  const day = new Date().toISOString().slice(0, 10);
  const minute = Math.floor(Date.now() / 60_000);
  const identity = hashedIdentity(profileId, clientKey);
  return [
    `${config.namespace}:day:${day}:global`,
    `${config.namespace}:day:${day}:user:${identity}`,
    `${config.namespace}:minute:${minute}:global`,
  ];
}

function parseRedisResult(value: unknown): GeminiQuotaDecision {
  if (!Array.isArray(value) || value.length < 7) throw new Error("invalid quota response");
  const allowed = Number(value[0]) === 1;
  const reason = value[1];
  if (reason !== "allowed" && reason !== "user_daily_exhausted" && reason !== "global_daily_exhausted" && reason !== "global_minute_exhausted") throw new Error("invalid quota reason");
  const numbers = value.slice(2, 5).map(Number);
  if (numbers.some((number) => !Number.isFinite(number) || number < 0)) throw new Error("invalid quota counters");
  return {
    allowed,
    reason,
    userRemaining: numbers[0],
    globalRemaining: numbers[1],
    minuteRemaining: numbers[2],
    dailyResetAt: safeResetAt(value[5]),
    minuteResetAt: safeResetAt(value[6]),
    storageConfigured: true,
  };
}

export async function takeGeminiQuota(input: { profileId: string; clientKey: string }): Promise<GeminiQuotaDecision> {
  const config = geminiRateLimitConfig();
  if (!config.redisUrl || !config.redisToken) return unavailableDecision();
  try {
    const parsedUrl = new URL(config.redisUrl);
    if (parsedUrl.protocol !== "https:" && process.env.NODE_ENV === "production") return unavailableDecision();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAX_REDIS_WAIT_MS);
    try {
      const response = await fetch(config.redisUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.redisToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", CONSUME_SCRIPT, "3", ...redisKeys(config, input.profileId, input.clientKey), String(config.userDailyLimit), String(config.globalDailyLimit), String(config.globalPerMinuteLimit)]),
        signal: controller.signal,
      });
      if (!response.ok) return unavailableDecision();
      const payload = await response.json() as { result?: unknown; error?: unknown };
      if (payload.error !== undefined) return unavailableDecision();
      return parseRedisResult(payload.result);
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return unavailableDecision();
  }
}

export { CONSUME_SCRIPT as GEMINI_QUOTA_CONSUME_SCRIPT };
