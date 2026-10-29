import { expect, test } from "@playwright/test";
import { geminiRateLimitDiagnostics, takeGeminiQuota } from "../lib/ai/gemini-rate-limit";

const ENV_KEYS = [
  "GEMINI_RATE_LIMIT_REDIS_URL",
  "GEMINI_RATE_LIMIT_REDIS_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "GEMINI_USER_DAILY_LIMIT",
  "GEMINI_GLOBAL_DAILY_LIMIT",
  "GEMINI_GLOBAL_PER_MINUTE_LIMIT",
] as const;

function saveEnvironment() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(snapshot: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

test("contador REST permite no máximo duas chamadas concorrentes por minuto", async () => {
  const snapshot = saveEnvironment();
  const originalFetch = globalThis.fetch;
  const counts = new Map<string, number>();
  try {
    process.env.GEMINI_RATE_LIMIT_REDIS_URL = "https://redis.example.test";
    process.env.GEMINI_RATE_LIMIT_REDIS_TOKEN = "synthetic-token";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.GEMINI_GLOBAL_PER_MINUTE_LIMIT = "2";
    globalThis.fetch = async (_input, init) => {
      const command = JSON.parse(String(init?.body)) as unknown[];
      expect(command[0]).toBe("EVAL");
      expect(command[2]).toBe("3");
      const keys = command.slice(3, 6).map(String);
      const userLimit = Number(command[6]);
      const globalDayLimit = Number(command[7]);
      const globalMinuteLimit = Number(command[8]);
      const globalDay = counts.get(keys[0]) ?? 0;
      const userDay = counts.get(keys[1]) ?? 0;
      const globalMinute = counts.get(keys[2]) ?? 0;
      if (globalMinute >= globalMinuteLimit) return Response.json({ result: [0, "global_minute_exhausted", userLimit - userDay, globalDayLimit - globalDay, 0, 2_000_000_000, 2_000_000_000] });
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
      return Response.json({ result: [1, "allowed", userLimit - userDay - 1, globalDayLimit - globalDay - 1, globalMinuteLimit - globalMinute - 1, 2_000_000_000, 2_000_000_000] });
    };
    const decisions = await Promise.all([
      takeGeminiQuota({ profileId: "profile-a", clientKey: "ip-a" }),
      takeGeminiQuota({ profileId: "profile-b", clientKey: "ip-b" }),
      takeGeminiQuota({ profileId: "profile-c", clientKey: "ip-c" }),
    ]);
    expect(decisions.filter((decision) => decision.allowed)).toHaveLength(2);
    expect(decisions.filter((decision) => decision.reason === "global_minute_exhausted")).toHaveLength(1);
    expect(decisions.every((decision) => decision.storageConfigured)).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(snapshot);
  }
});

test("limites diários preservam cinco perguntas por perfil e vinte globalmente", async () => {
  const snapshot = saveEnvironment();
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  const counts = new Map<string, number>();
  try {
    process.env.GEMINI_RATE_LIMIT_REDIS_URL = "https://redis.example.test";
    process.env.GEMINI_RATE_LIMIT_REDIS_TOKEN = "synthetic-token";
    process.env.GEMINI_GLOBAL_PER_MINUTE_LIMIT = "2";
    globalThis.fetch = async (_input, init) => {
      const command = JSON.parse(String(init?.body)) as unknown[];
      const keys = command.slice(3, 6).map(String);
      const userLimit = Number(command[6]);
      const globalDayLimit = Number(command[7]);
      const globalMinuteLimit = Number(command[8]);
      const globalDay = counts.get(keys[0]) ?? 0;
      const userDay = counts.get(keys[1]) ?? 0;
      const globalMinute = counts.get(keys[2]) ?? 0;
      if (userDay >= userLimit) return Response.json({ result: [0, "user_daily_exhausted", 0, globalDayLimit - globalDay, globalMinuteLimit - globalMinute, 2_000_000_000, 2_000_000_000] });
      if (globalDay >= globalDayLimit) return Response.json({ result: [0, "global_daily_exhausted", userLimit - userDay, 0, globalMinuteLimit - globalMinute, 2_000_000_000, 2_000_000_000] });
      if (globalMinute >= globalMinuteLimit) return Response.json({ result: [0, "global_minute_exhausted", userLimit - userDay, globalDayLimit - globalDay, 0, 2_000_000_000, 2_000_000_000] });
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
      return Response.json({ result: [1, "allowed", userLimit - userDay - 1, globalDayLimit - globalDay - 1, globalMinuteLimit - globalMinute - 1, 2_000_000_000, 2_000_000_000] });
    };

    const baseNow = originalNow();
    const ask = async (profileId: string, sequence: number) => {
      Date.now = () => baseNow + sequence * 60_000;
      return takeGeminiQuota({ profileId, clientKey: "ip-a" });
    };
    const profileDecisions = [];
    for (let index = 0; index < 6; index += 1) profileDecisions.push(await ask("profile-a", index));
    expect(profileDecisions.filter((decision) => decision.allowed)).toHaveLength(5);
    expect(profileDecisions[5].reason).toBe("user_daily_exhausted");

    counts.clear();
    const globalDecisions = [];
    for (let index = 0; index < 21; index += 1) globalDecisions.push(await ask(`profile-${index}`, index));
    expect(globalDecisions.filter((decision) => decision.allowed)).toHaveLength(20);
    expect(globalDecisions[20].reason).toBe("global_daily_exhausted");
  } finally {
    Date.now = originalNow;
    globalThis.fetch = originalFetch;
    restoreEnvironment(snapshot);
  }
});

test("contador continua fail closed e não chama Redis quando não há storage compartilhado", async () => {
  const snapshot = saveEnvironment();
  const originalFetch = globalThis.fetch;
  let called = false;
  try {
    for (const key of ["GEMINI_RATE_LIMIT_REDIS_URL", "GEMINI_RATE_LIMIT_REDIS_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const) delete process.env[key];
    globalThis.fetch = async () => { called = true; return Response.json({ result: [] }); };
    const decision = await takeGeminiQuota({ profileId: "profile-a", clientKey: "ip-a" });
    expect(decision).toMatchObject({ allowed: false, reason: "storage_unavailable", storageConfigured: false });
    expect(called).toBe(false);
    expect(geminiRateLimitDiagnostics()).toMatchObject({ configured: false, userDailyLimit: 5, globalDailyLimit: 20, globalPerMinuteLimit: 2 });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(snapshot);
  }
});

test("aliases do Redis REST são aceitos sem duplicar credenciais no código", async () => {
  const snapshot = saveEnvironment();
  const originalFetch = globalThis.fetch;
  try {
    delete process.env.GEMINI_RATE_LIMIT_REDIS_URL;
    delete process.env.GEMINI_RATE_LIMIT_REDIS_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "synthetic-token";
    globalThis.fetch = async () => Response.json({ result: [1, "allowed", 4, 19, 1, 2_000_000_000, 2_000_000_000] });
    const decision = await takeGeminiQuota({ profileId: "profile-a", clientKey: "ip-a" });
    expect(decision).toMatchObject({ allowed: true, reason: "allowed", userRemaining: 4, globalRemaining: 19, minuteRemaining: 1, storageConfigured: true });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(snapshot);
  }
});
