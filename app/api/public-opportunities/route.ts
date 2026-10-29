import { NextResponse } from "next/server";
import { fetchPncpOpportunities, pncpEndpoint } from "@/lib/connectors/pncp";
import { demoDiscoveryItems } from "@/lib/discovery";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const live = url.searchParams.get("live") === "1";
  if (!live) return NextResponse.json({ items: demoDiscoveryItems.filter((item) => item.kind === "public_procurement"), source: "DEMO_DATA", stale: false, provider: "PNCP", endpoint: pncpEndpoint() });
  try {
    const result = await fetchPncpOpportunities({
      state: url.searchParams.get("state") ?? "SE",
      municipality: url.searchParams.get("municipality") ?? undefined,
      text: url.searchParams.get("text") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
      pageSize: Number(url.searchParams.get("pageSize") ?? 12),
    });
    return NextResponse.json({ ...result, items: result.items.map((item) => ({ ...item, source: "PNCP" as const, demo: false })), provider: "PNCP", endpoint: pncpEndpoint(), fallback: false, unavailable: Boolean(result.error) });
  } catch {
    return NextResponse.json({ items: [], source: "PNCP", stale: true, fallback: false, unavailable: true, error: "Fonte PNCP indisponível; nenhum registro fictício foi exibido.", provider: "PNCP", endpoint: pncpEndpoint() }, { status: 503 });
  }
}
