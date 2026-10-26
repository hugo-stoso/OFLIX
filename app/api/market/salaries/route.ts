import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db";
import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { internalToDiscoveryItem } from "@/lib/discovery";
import { calculateSalaryResearch } from "@/lib/salary-research";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const external = await fetchExternalJobs({ source: "all" });
  const internal = listOpportunities().formal.map(internalToDiscoveryItem);
  return NextResponse.json(calculateSalaryResearch([...internal, ...external.items], { occupation: url.searchParams.get("occupation") ?? undefined, municipality: url.searchParams.get("municipality") ?? undefined, source: url.searchParams.get("source") ?? undefined }));
}
