import { NextResponse } from "next/server";
import { geminiAvailable } from "@/lib/ai/gemini";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    deterministic: true,
    gemini: { available: geminiAvailable(), consentRequired: true },
    limitations: [
      "A camada determinística é a resposta padrão e não depende de modelo externo.",
      "Gemini só é usado com configuração server-side válida e consentimento explícito por pergunta.",
    ],
  });
}
