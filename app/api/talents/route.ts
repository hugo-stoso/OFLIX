import { NextRequest, NextResponse } from "next/server";
import { canAccessTalentBank, listTalentInterests } from "@/lib/db";

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 401 });
  if (!canAccessTalentBank(profileId)) return NextResponse.json({ error: "organization_required" }, { status: 403 });
  return NextResponse.json(listTalentInterests());
}
