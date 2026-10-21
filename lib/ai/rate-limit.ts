type RateLimitBucket = { startedAt: number; count: number };

const buckets = new Map<string, RateLimitBucket>();
const WINDOW_MS = 60_000;

export function takeTerritoryAiRateLimit(key: string, limit: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function territoryAiClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "anonymous";
}

