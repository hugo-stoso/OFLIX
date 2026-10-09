import { NextResponse } from "next/server";
import { externalSourceFromParam, fetchExternalJobs } from "@/lib/connectors/external-jobs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawSource = url.searchParams.get("source");
  const source = externalSourceFromParam(rawSource);
  if (rawSource && source === undefined) {
    return NextResponse.json({ items: [], source: "ALL", provider: "Fontes externas", stale: true, partial: false, count: 0, error: "Fonte externa não suportada." }, { status: 400 });
  }

  const result = await fetchExternalJobs({ source, q: url.searchParams.get("q") ?? undefined, municipality: url.searchParams.get("municipality") ?? undefined });
  const singleSource = result.sources.length === 1 ? result.sources[0] : undefined;
  return NextResponse.json({ ...result, count: result.items.length, ...(singleSource ? { enabled: singleSource.enabled } : { enabled: result.sources.some((item) => item.enabled) }) });
}
