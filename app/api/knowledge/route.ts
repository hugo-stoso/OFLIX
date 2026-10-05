import { NextResponse } from "next/server";
import { getAcademicArticles, type AcademicTopic } from "@/lib/connectors/openalex";

const topics = new Set<AcademicTopic>(["Mercado de trabalho", "Gestão", "Produtividade"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedTopic = url.searchParams.get("topic") ?? undefined;
  const topic = requestedTopic && topics.has(requestedTopic as AcademicTopic) ? requestedTopic as AcademicTopic : undefined;
  const query = url.searchParams.get("q") ?? undefined;
  const result = await getAcademicArticles({ topic, query });
  return NextResponse.json(result);
}
