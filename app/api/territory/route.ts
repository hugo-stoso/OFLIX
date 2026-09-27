import { NextResponse } from "next/server";
import { territoryDataForProfile } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileId = url.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 401 });
  const activities = url.searchParams.getAll("activity").flatMap((value) => value.split(",")).concat(url.searchParams.get("activities")?.split(",") ?? []);
  const data = territoryDataForProfile(profileId, activities);
  if (!data) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  return NextResponse.json(data);
}
