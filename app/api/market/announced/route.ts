import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db";
import { announcedCompensationSummary } from "@/lib/market";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const municipality = url.searchParams.get("municipality")?.trim() || undefined;
  const category = url.searchParams.get("category")?.trim() || undefined;
  const formal = listOpportunities().formal.filter((opportunity) => (!municipality || opportunity.location.municipality === municipality) && (!category || opportunity.category === category) && opportunity.compensation);
  const summary = announcedCompensationSummary(formal.flatMap((opportunity) => opportunity.compensation ? [opportunity.compensation] : []), { municipality, category });
  return NextResponse.json(summary);
}
