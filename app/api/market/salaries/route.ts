import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db";
import {
  fetchExternalJobs,
  type ExternalJobsResult,
} from "@/lib/connectors/external-jobs";
import { internalToDiscoveryItem } from "@/lib/discovery";
import { calculateSalaryResearch } from "@/lib/salary-research";
import { getOfficialSalaryStatus } from "@/lib/official-market";
import { SERGIPE_MUNICIPALITIES } from "@/lib/sergipe-municipalities";

export const runtime = "nodejs";
export const maxDuration = 120;

// GO Sergipe and EmpregAju paginate public pages. Ten seconds was shorter
// than a normal complete collection and caused this endpoint to return an
// empty recorte while the real request was still in flight.
const EXTERNAL_RESEARCH_DEADLINE_MS = 90_000;

function timedOutExternalJobs(): ExternalJobsResult {
  const collectedAt = new Date().toISOString();
  return {
    items: [],
    source: "ALL",
    provider: "Fontes externas",
    collectedAt,
    stale: true,
    partial: true,
    pages: 0,
    error: "A coleta externa excedeu o prazo desta pesquisa.",
    sources: [
      ["GO_SERGIPE", "GO Sergipe"],
      ["EMPREGAJU", "EmpregAju"],
      ["IEL_SERGIPE", "IEL Sergipe"],
    ].map(([source, provider]) => ({
      source: source as "GO_SERGIPE" | "EMPREGAJU" | "IEL_SERGIPE",
      provider,
      enabled: true,
      count: 0,
      stale: true,
      partial: true,
      pages: 0,
      error: "Tempo limite da coleta externa.",
    })),
  };
}

async function fetchExternalForResearch(): Promise<ExternalJobsResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const external = fetchExternalJobs({ source: "all" });
  const deadline = new Promise<ExternalJobsResult>((resolve) => {
    timeout = setTimeout(
      () => resolve(timedOutExternalJobs()),
      EXTERNAL_RESEARCH_DEADLINE_MS,
    );
  });
  try {
    return await Promise.race([external, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const external = await fetchExternalForResearch();
  const internal = listOpportunities().formal.filter((opportunity) => !opportunity.ownerIsDemo).map(internalToDiscoveryItem);
  const requestedIbgeCode = url.searchParams.get("municipalityIbgeCode") ?? url.searchParams.get("ibgeCode") ?? undefined;
  const municipalityFromIbge = requestedIbgeCode
    ? SERGIPE_MUNICIPALITIES.find((municipality) => municipality.ibgeCode === requestedIbgeCode)
    : undefined;
  if (requestedIbgeCode && !municipalityFromIbge) {
    return NextResponse.json({ error: "municipality_ibge_not_found" }, { status: 400 });
  }
  const query = {
    occupation: url.searchParams.get("occupation") ?? undefined,
    occupationCode: url.searchParams.get("occupationCode") ?? undefined,
    municipality: municipalityFromIbge?.name ?? url.searchParams.get("municipality") ?? undefined,
    municipalityIbgeCode: requestedIbgeCode,
    state: url.searchParams.get("state") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
  };
  const health = external.sources.map((source) => ({
    source: source.source,
    provider: source.provider,
    count: source.count,
    withPublishedRemuneration: 0,
    monthlyComparable: 0,
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
