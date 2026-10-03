import { NextResponse } from "next/server";
import { fetchPncpOpportunities, pncpEndpoint } from "@/lib/connectors/pncp";
import { demoDiscoveryItems } from "@/lib/discovery";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const live = url.searchParams.get("live") === "1";
  if (!live) return NextResponse.json({ items: demoDiscoveryItems.filter((item) => item.kind === "public_procurement"), source: "DEMO_DATA", stale: false, provider: "PNCP", endpoint: pncpEndpoint() });
  try {
    const result = await fetchPncpOpportunities({ state: url.searchParams.get("state") ?? "SE", municipality: url.searchParams.get("municipality") ?? undefined, text: url.searchParams.get("text") ?? undefined });
    return NextResponse.json({ ...result, provider: "PNCP", endpoint: pncpEndpoint() });
  } catch {
    return NextResponse.json({ items: [], source: "PNCP", stale: true, error: "Não foi possível atualizar oportunidades públicas agora.", provider: "PNCP", endpoint: pncpEndpoint() }, { status: 502 });
  }
}
