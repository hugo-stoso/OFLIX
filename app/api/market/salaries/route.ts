import { NextResponse } from "next/server";
import { listOpportunities } from "@/lib/db";
import {
  fetchExternalJobs,
  type ExternalJobsResult,
} from "@/lib/connectors/external-jobs";
import { internalToDiscoveryItem } from "@/lib/discovery";
import { calculateSalaryResearch } from "@/lib/salary-research";
import { getOfficialSalaryStatus } from "@/lib/official-market";

export const runtime = "nodejs";

const EXTERNAL_RESEARCH_DEADLINE_MS = 10_000;

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
