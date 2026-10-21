import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeTerritory, buildTerritoryAiContext, territoryAiEnabled, territoryAiFiltersSchema, TerritoryAiProviderError, TerritoryAiUnavailableError } from "@/lib/ai/territory";
import { takeTerritoryAiRateLimit, territoryAiClientKey } from "@/lib/ai/rate-limit";
import { loadTerritoryDataForProfile } from "@/lib/territory-server";

export const runtime = "nodejs";

const requestSchema = z.object({ profileId: z.string().trim().min(1).max(120), filters: territoryAiFiltersSchema }).strict();

function logAiEvent(durationMs: number, result: "success" | "failure", provider?: string, model?: string) {
  console.info(JSON.stringify({ endpoint: "/api/territory/ai/analyze", durationMs, provider: provider ?? "unknown", model: model ?? "unknown", result }));
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  if (!territoryAiEnabled()) return NextResponse.json({ error: "territory_ai_unavailable" }, { status: 503 });
  if (!takeTerritoryAiRateLimit(`analyze:${territoryAiClientKey(request)}`, 10)) return NextResponse.json({ error: "territory_ai_rate_limited" }, { status: 429 });
  try {
    const body = requestSchema.parse(await request.json());
    const data = await loadTerritoryDataForProfile(body.profileId);
    if (!data) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    if (data.scope !== "general") return NextResponse.json({ error: "territory_ai_forbidden" }, { status: 403 });
    const context = buildTerritoryAiContext(data, body.filters);
    const result = await analyzeTerritory(context);
    logAiEvent(Date.now() - startedAt, "success", process.env.AI_PROVIDER ?? "openai-compatible", process.env.AI_MODEL ?? "unconfigured");
    return NextResponse.json(result);
  } catch (error) {
    logAiEvent(Date.now() - startedAt, "failure", process.env.AI_PROVIDER ?? "openai-compatible", process.env.AI_MODEL ?? "unconfigured");
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    if (error instanceof TerritoryAiUnavailableError || error instanceof TerritoryAiProviderError) return NextResponse.json({ error: "territory_ai_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "territory_ai_unavailable" }, { status: 503 });
  }
}

