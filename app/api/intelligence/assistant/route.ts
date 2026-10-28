import { NextResponse } from "next/server";
import { z } from "zod";
import { listProfiles } from "@/lib/db";
import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { takeTerritoryAiRateLimit, territoryAiClientKey } from "@/lib/ai/rate-limit";
import { generateGeminiJson, geminiAvailable, GeminiProviderError, GeminiUnavailableError } from "@/lib/ai/gemini";
import { buildDeterministicAssistantAnswer, buildGeminiAssistantPrompt, isSafeGeminiAssistantAnswer, profileFromInput } from "@/lib/ai/opportunities";

export const runtime = "nodejs";

const requestSchema = z.object({
  profileId: z.string().trim().min(1).max(120),
  question: z.string().trim().min(3).max(500),
  activities: z.array(z.string().trim().min(1).max(120)).max(40).default([]),
  workPreferences: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  useGemini: z.boolean().default(false),
}).strict();

const GEMINI_SYSTEM_PROMPT = `Você é o Assistente OFLIX. Redija uma resposta curta em português do Brasil usando somente o contexto determinístico recebido.
Não invente oportunidades, qualificações, salários, prazos, municípios, links ou resultados.
Não transforme uma ausência de registro em afirmação sobre o mercado.
Não inclua números, URLs ou fatos que não estejam explicitamente no contexto; os fatos e cartões verificáveis serão exibidos pelo backend.
Se o contexto não responder à pergunta, diga que não há evidência suficiente.
Responda somente JSON válido no formato {"answer": string}.`;

const geminiOutputSchema = z.object({ answer: z.string().trim().min(10).max(900) }).strict();

function logAssistantEvent(durationMs: number, mode: "deterministic" | "gemini" | "fallback", requestedGemini: boolean) {
  console.info(JSON.stringify({ endpoint: "/api/intelligence/assistant", durationMs, mode, requestedGemini, geminiConfigured: geminiAvailable() }));
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const body = requestSchema.parse(await request.json());
    const profile = listProfiles().find((candidate) => candidate.id === body.profileId);
    if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    if (profile.type !== "PERSON") return NextResponse.json({ error: "person_required" }, { status: 403 });
    const intelligenceProfile = profileFromInput({ id: profile.id, municipality: profile.location.municipality, capabilities: profile.capabilities, activities: body.activities, workPreferences: body.workPreferences });
    const collected = await fetchExternalJobs({ source: "all" });
    const deterministic = buildDeterministicAssistantAnswer(body.question, collected.items, intelligenceProfile);
    let answer = deterministic.answer;
    let mode: "deterministic" | "gemini" | "fallback" = "deterministic";
    let geminiReason = body.useGemini ? "not_configured" : "not_requested";

    if (body.useGemini && geminiAvailable()) {
      if (!takeTerritoryAiRateLimit(`assistant:${territoryAiClientKey(request)}`, 8)) {
        geminiReason = "rate_limited";
      } else {
        try {
          const generated = await generateGeminiJson({ system: GEMINI_SYSTEM_PROMPT, user: buildGeminiAssistantPrompt(deterministic, body.question) });
          const parsed = geminiOutputSchema.safeParse(generated.object);
          if (parsed.success && isSafeGeminiAssistantAnswer(parsed.data.answer)) {
            answer = parsed.data.answer;
            mode = "gemini";
            geminiReason = "used";
          } else {
            geminiReason = "invalid_output";
            mode = "fallback";
          }
        } catch (error) {
          if (!(error instanceof GeminiProviderError) && !(error instanceof GeminiUnavailableError)) throw error;
          geminiReason = "provider_failed";
          mode = "fallback";
        }
      }
    }
    logAssistantEvent(Date.now() - startedAt, mode, body.useGemini);
    return NextResponse.json({
      ...deterministic,
      answer,
      mode,
      gemini: { requested: body.useGemini, available: geminiAvailable(), used: mode === "gemini", reason: geminiReason },
      sources: collected.sources,
      collectedAt: collected.collectedAt,
      stale: collected.stale,
      partial: collected.partial,
      ...(collected.error ? { error: collected.error } : {}),
    });
  } catch (error) {
    logAssistantEvent(Date.now() - startedAt, "fallback", false);
    if (error instanceof z.ZodError) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    return NextResponse.json({ error: "assistant_unavailable" }, { status: 503 });
  }
}
