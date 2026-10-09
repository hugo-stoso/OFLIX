import { NextResponse } from "next/server";
import { filterGoSergipeItems, fetchGoSergipeOpportunities, isGoSergipeEnabled } from "@/lib/connectors/go-sergipe";

export const runtime = "nodejs";

const disabledMessage = "As vagas públicas do GO Sergipe estão desativadas pela configuração do ambiente.";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  if (source && source !== "go-sergipe") {
    return NextResponse.json({ items: [], source: "GO_SERGIPE", provider: "GO Sergipe", stale: true, partial: false, count: 0, error: "Fonte externa não suportada." }, { status: 400 });
  }

  if (!isGoSergipeEnabled()) {
    return NextResponse.json({ items: [], source: "GO_SERGIPE", provider: "GO Sergipe", collectedAt: null, stale: true, partial: false, count: 0, enabled: false, error: disabledMessage });
  }

  const result = await fetchGoSergipeOpportunities();
  const items = filterGoSergipeItems(result.items, { q: url.searchParams.get("q") ?? undefined, municipality: url.searchParams.get("municipality") ?? undefined });
  return NextResponse.json({ ...result, items, count: items.length, enabled: true });
}
