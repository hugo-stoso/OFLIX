import { NextResponse } from "next/server";
import { z } from "zod";
import { answerTerritoryQuestion, buildTerritoryAiContext, territoryAiEnabled, territoryAiFiltersSchema, TerritoryAiProviderError, TerritoryAiUnavailableError } from "@/lib/ai/territory";
import { takeTerritoryAiRateLimit, territoryAiClientKey } from "@/lib/ai/rate-limit";
import { loadTerritoryDataForProfile } from "@/lib/territory-server";

export const runtime = "nodejs";

const requestSchema = z.object({ profileId: z.string().trim().min(1).max(120), question: z.string().trim().min(3).max(500), currentFilters: territoryAiFiltersSchema }).strict();

function logAiEvent(durationMs: number, result: "success" | "failure") {
  console.info(JSON.stringify({ endpoint: "/api/territory/ai/ask", durationMs, provider: process.env.AI_PROVIDER ?? "openai-compatible", model: process.env.AI_MODEL ?? "unconfigured", result }));
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  if (!territoryAiEnabled()) return NextResponse.json({ error: "territory_ai_unavailable" }, { status: 503 });
  if (!takeTerritoryAiRateLimit(`ask:${territoryAiClientKey(request)}`, 20)) return NextResponse.json({ error: "territory_ai_rate_limited" }, { status: 429 });
  try {
    const body = requestSchema.parse(await request.json());
    const data = await loadTerritoryDataForProfile(body.profileId);
    if (!data) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    if (data.scope !== "general") return NextResponse.json({ error: "territory_ai_forbidden" }, { status: 403 });
    const context = buildTerritoryAiContext(data, body.currentFilters);
    const result = await answerTerritoryQuestion(context, body.question);
    logAiEvent(Date.now() - startedAt, "success");
    return NextResponse.json(result);
  } catch (error) {
    logAiEvent(Date.now() - startedAt, "failure");
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    if (error instanceof TerritoryAiUnavailableError || error instanceof TerritoryAiProviderError) return NextResponse.json({ error: "territory_ai_unavailable" }, { status: 503 });
    return NextResponse.json({ error: "territory_ai_unavailable" }, { status: 503 });
  }
}

