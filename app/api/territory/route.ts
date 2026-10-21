import { NextResponse } from "next/server";
import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { territoryDataForProfile } from "@/lib/db";
import { buildTerritoryEmploymentMarket } from "@/lib/territory-market";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profileId = url.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profile_required" }, { status: 401 });
  const activities = url.searchParams.getAll("activity").flatMap((value) => value.split(",")).concat(url.searchParams.get("activities")?.split(",") ?? []);
  const data = territoryDataForProfile(profileId, activities);
  if (!data) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  if (data.scope !== "general") return NextResponse.json(data);

  const external = await fetchExternalJobs({ source: "all" });
  return NextResponse.json({ ...data, employmentMarket: buildTerritoryEmploymentMarket(data.municipalities, external) });
}
