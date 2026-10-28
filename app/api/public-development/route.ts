import { NextResponse } from "next/server";
import { fetchAracajuEditais, fetchSeadContests } from "@/lib/connectors/public-contests";
import { fetchTrainingSources } from "@/lib/connectors/training";
import { deduplicateDiscoveryItems } from "@/lib/discovery";

export const runtime = "nodejs";

export async function GET() {
  const [sead, aracaju, training] = await Promise.all([
    fetchSeadContests(),
    fetchAracajuEditais(),
    fetchTrainingSources(),
  ]);
  const contests = [sead, aracaju];
  return NextResponse.json({
    items: deduplicateDiscoveryItems([...contests.flatMap((result) => result.items), ...training.items]).filter((item) => item.source !== "DEMO_DATA"),
    contests: contests.map(({ items, ...health }) => ({ ...health, count: items.length })),
    training: training.sources,
    stale: contests.some((result) => result.stale) || training.stale,
  });
}
