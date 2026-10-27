import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db";
import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { internalToDiscoveryItem } from "@/lib/discovery";
import { calculateSalaryResearch } from "@/lib/salary-research";
import { getOfficialSalaryStatus } from "@/lib/official-market";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const external = await fetchExternalJobs({ source: "all" });
  const internal = listOpportunities().formal.map(internalToDiscoveryItem);
  const query = {
    occupation: url.searchParams.get("occupation") ?? undefined,
    occupationCode: url.searchParams.get("occupationCode") ?? undefined,
    municipality: url.searchParams.get("municipality") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
  };
  const health = external.sources.map((source) => ({
    source: source.source,
    provider: source.provider,
    count: source.count,
    stale: source.stale,
    partial: source.partial,
    status: source.stale
      ? ("STALE" as const)
      : source.error
        ? ("UNAVAILABLE" as const)
        : source.partial
          ? ("PARTIAL" as const)
          : ("FULL" as const),
  }));
  const result = calculateSalaryResearch(
    [...internal, ...external.items],
    query,
    health,
  );
  return NextResponse.json({
    ...result,
    official: getOfficialSalaryStatus({
      occupationCode: query.occupationCode,
      occupationLabel: query.occupation,
      municipality: query.municipality,
      state: query.state,
    }),
    incomplete: external.partial || external.stale,
    incompleteMessage:
      external.partial || external.stale
        ? "Uma ou mais fontes não puderam ser atualizadas; este recorte está incompleto."
        : undefined,
  });
}
