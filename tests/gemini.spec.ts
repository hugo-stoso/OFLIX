import { expect, test } from "@playwright/test";
import { generateGeminiJson, geminiAvailable } from "../lib/ai/gemini";

const ENV_KEYS = ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL", "AI_PROVIDER", "GEMINI_API_KEY", "GEMINI_BASE_URL", "GEMINI_ENABLED", "GEMINI_MAX_OUTPUT_TOKENS", "GEMINI_MODEL", "GEMINI_TIMEOUT_MS", "TERRITORY_AI_ENABLED"] as const;

function saveEnvironment() {
  return Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
}

function restoreEnvironment(snapshot: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

test("reutiliza AI_API_KEY e a configuração Gemini OpenAI-compatible sem duplicar credencial", async () => {
  const snapshot = saveEnvironment();
  const originalFetch = globalThis.fetch;
  try {
    process.env.AI_API_KEY = "synthetic-preview-key";
    process.env.AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
    process.env.AI_MODEL = "gemini-3.5-flash-lite";
    process.env.AI_PROVIDER = "gemini-openai-compatible";
    process.env.TERRITORY_AI_ENABLED = "true";
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_BASE_URL;
    delete process.env.GEMINI_ENABLED;

    expect(geminiAvailable()).toBe(true);
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"answer":"Resposta segura do provedor."}' } }], usage: { prompt_tokens: 7, completion_tokens: 4, total_tokens: 11 } }), { status: 200, headers: { "Content-Type": "application/json" } });
    };
    const result = await generateGeminiJson({ system: "sistema", user: "pergunta" });
    expect(requestUrl).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    expect((requestInit?.headers as Record<string, string>).Authorization).toBe("Bearer synthetic-preview-key");
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({ model: "gemini-3.5-flash-lite", response_format: { type: "json_object" } });
    expect(result.object).toEqual({ answer: "Resposta segura do provedor." });
    expect(result.usage).toEqual({ promptTokens: 7, completionTokens: 4, totalTokens: 11 });
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(snapshot);
  }
});

test("GEMINI_ENABLED=false desativa a herança da configuração AI_*", async () => {
  const snapshot = saveEnvironment();
  try {
    process.env.AI_API_KEY = "synthetic-preview-key";
    process.env.AI_MODEL = "gemini-3.5-flash-lite";
    process.env.AI_PROVIDER = "gemini-openai-compatible";
    process.env.TERRITORY_AI_ENABLED = "true";
    process.env.GEMINI_ENABLED = "false";
    expect(geminiAvailable()).toBe(false);
  } finally {
    restoreEnvironment(snapshot);
  }
});
