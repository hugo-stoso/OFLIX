import { NextResponse } from "next/server";
import { territoryDataForProfile } from "@/lib/db";
import { territoryAiEnabled } from "@/lib/ai/territory";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const profileId = new URL(request.url).searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 401 });
  const data = territoryDataForProfile(profileId, []);
  if (!data) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  if (data.scope !== "general") return NextResponse.json({ error: "territory_ai_forbidden" }, { status: 403 });
  return NextResponse.json({ enabled: territoryAiEnabled() });
}

