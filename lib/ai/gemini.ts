import { z } from "zod";

export type GeminiJsonResponse = {
  object: unknown;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
};

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
  if ((process.env.GEMINI_ENABLED ?? "false").toLowerCase() !== "true") return null;
  const parsed = configSchema.safeParse({
    apiKey: (process.env.GEMINI_API_KEY ?? "").trim(),
    model: (process.env.GEMINI_MODEL ?? "").trim(),
    baseUrl: (process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/u, ""),
    timeoutMs: Math.min(30_000, Math.max(1_000, Number(process.env.GEMINI_TIMEOUT_MS ?? 10_000))),
    maxOutputTokens: Math.min(1_000, Math.max(64, Number(process.env.GEMINI_MAX_OUTPUT_TOKENS ?? 350))),
  });
  if (!parsed.success) return null;
  if (new URL(parsed.data.baseUrl).protocol !== "https:" && process.env.NODE_ENV === "production") return null;
  return parsed.data;
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
    const response = await fetch(`${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`, {
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
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new GeminiProviderError("Gemini returned no JSON");
    let object: unknown;
    try { object = JSON.parse(text); } catch { throw new GeminiProviderError("Gemini returned invalid JSON"); }
    return {
      object,
      usage: {
        promptTokens: payload.usageMetadata?.promptTokenCount,
        completionTokens: payload.usageMetadata?.candidatesTokenCount,
        totalTokens: payload.usageMetadata?.totalTokenCount,
      },
    };
  } catch (error) {
    if (error instanceof GeminiProviderError || error instanceof GeminiUnavailableError) throw error;
    throw new GeminiProviderError(error instanceof Error && error.name === "AbortError" ? "Gemini request timed out" : "Gemini request failed");
  } finally {
    clearTimeout(timeout);
  }
}
