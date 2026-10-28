import { z } from "zod";

export type GeminiJsonResponse = {
  object: unknown;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
};

type GeminiTransport = "native" | "openai-compatible";

export class GeminiUnavailableError extends Error {
  constructor() {
    super("Gemini is not configured or is disabled");
    this.name = "GeminiUnavailableError";
  }
}

export class GeminiProviderError extends Error {
  constructor(message = "Gemini provider failed") {
    super(message);
    this.name = "GeminiProviderError";
  }
}

const configSchema = z.object({
  apiKey: z.string().min(1),
  model: z.string().min(1),
  baseUrl: z.string().url(),
  timeoutMs: z.number().int().min(1_000).max(30_000),
  maxOutputTokens: z.number().int().min(64).max(1_000),
});

function geminiConfig() {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase();
  const usesCompatibleGemini = provider === "gemini-openai-compatible" || provider === "gemini-openai";
  const geminiFlag = (process.env.GEMINI_ENABLED ?? "").trim().toLowerCase();
  const explicitlyEnabled = geminiFlag === "true";
  const explicitlyDisabled = geminiFlag === "false";
  const inheritedEnabled = usesCompatibleGemini && (process.env.TERRITORY_AI_ENABLED ?? "false").toLowerCase() === "true";
  if (explicitlyDisabled || (!explicitlyEnabled && !inheritedEnabled)) return null;
  const explicitBaseUrl = (process.env.GEMINI_BASE_URL ?? "").trim();
  const inheritedBaseUrl = usesCompatibleGemini ? (process.env.AI_BASE_URL ?? "").trim() : "";
  const baseUrl = (explicitBaseUrl || inheritedBaseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/u, "");
  const parsed = configSchema.safeParse({
    apiKey: (process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY ?? "").trim(),
    model: (process.env.GEMINI_MODEL ?? process.env.AI_MODEL ?? "").trim(),
    baseUrl,
    timeoutMs: Math.min(30_000, Math.max(1_000, Number(process.env.GEMINI_TIMEOUT_MS ?? 10_000))),
    maxOutputTokens: Math.min(1_000, Math.max(64, Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 350))),
  });
  if (!parsed.success) return null;
  if (new URL(parsed.data.baseUrl).protocol !== "https:" && process.env.NODE_ENV === "production") return null;
  const transport: GeminiTransport = (!explicitBaseUrl && usesCompatibleGemini) || /\/openai$/u.test(parsed.data.baseUrl) ? "openai-compatible" : "native";
  return { ...parsed.data, transport };
}

export function geminiAvailable() {
  return Boolean(geminiConfig());
}

export async function generateGeminiJson(request: { system: string; user: string }): Promise<GeminiJsonResponse> {
  const config = geminiConfig();
  if (!config) throw new GeminiUnavailableError();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = config.transport === "openai-compatible"
      ? await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }],
            response_format: { type: "json_object" },
            max_tokens: config.maxOutputTokens,
          }),
          signal: controller.signal,
        })
      : await fetch(`${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": config.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.system }] },
            contents: [{ role: "user", parts: [{ text: request.user }] }],
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: config.maxOutputTokens },
          }),
          signal: controller.signal,
        });
    if (!response.ok) throw new GeminiProviderError(`Gemini returned ${response.status}`);
    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
      choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    const openAiContent = payload.choices?.[0]?.message?.content;
    const text = (config.transport === "openai-compatible"
      ? Array.isArray(openAiContent) ? openAiContent.map((part) => part.text ?? "").join("") : openAiContent
      : payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join(""))?.trim();
    if (!text) throw new GeminiProviderError("Gemini returned no JSON");
    let object: unknown;
    try { object = JSON.parse(text); } catch { throw new GeminiProviderError("Gemini returned invalid JSON"); }
    return {
      object,
      usage: {
        promptTokens: config.transport === "openai-compatible" ? payload.usage?.prompt_tokens : payload.usageMetadata?.promptTokenCount,
        completionTokens: config.transport === "openai-compatible" ? payload.usage?.completion_tokens : payload.usageMetadata?.candidatesTokenCount,
        totalTokens: config.transport === "openai-compatible" ? payload.usage?.total_tokens : payload.usageMetadata?.totalTokenCount,
      },
    };
  } catch (error) {
    if (error instanceof GeminiProviderError || error instanceof GeminiUnavailableError) throw error;
    throw new GeminiProviderError(error instanceof Error && error.name === "AbortError" ? "Gemini request timed out" : "Gemini request failed");
  } finally {
    clearTimeout(timeout);
  }
}
