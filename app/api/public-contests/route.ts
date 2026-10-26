import { NextResponse } from "next/server";
import { fetchSeadContests } from "@/lib/connectors/public-contests";

export const runtime = "nodejs";

export async function GET() {
  try { return NextResponse.json(await fetchSeadContests()); }
  catch { return NextResponse.json({ source: "SEAD_SERGIPE", items: [], stale: true, error: "Fonte pública indisponível." }, { status: 502 }); }
}
