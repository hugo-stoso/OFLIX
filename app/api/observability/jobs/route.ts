import { after, NextResponse } from "next/server";
import { ANALYST_PROFILE_ID } from "@/lib/domain";
import { fetchExternalJobs, refreshExternalJobs } from "@/lib/connectors/external-jobs";
import { getJobObservabilitySnapshot } from "@/lib/job-observability";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const profileId = new URL(request.url).searchParams.get("profileId");
  if (profileId !== ANALYST_PROFILE_ID) return NextResponse.json({ error: "analyst_profile_required" }, { status: 403 });
  const external = await fetchExternalJobs({ source: "all" });
  if (external.refreshSuggested) after(() => refreshExternalJobs({ source: "all" }));
  return NextResponse.json(getJobObservabilitySnapshot());
}
