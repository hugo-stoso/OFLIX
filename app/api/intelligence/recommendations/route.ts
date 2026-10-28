import { NextResponse } from "next/server";
import { z } from "zod";
import { listProfiles } from "@/lib/db";
import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { isVerifiedDiscoveryItem, profileFromInput, rankVerifiedRecommendations, verifiedOpportunityLimitations, type IntelligenceProfile } from "@/lib/ai/opportunities";

export const runtime = "nodejs";

const querySchema = z.object({
  profileId: z.string().trim().min(1).max(120),
  activities: z.string().max(2_000).optional().default(""),
  workPreferences: z.string().max(1_000).optional().default(""),
}).strict();

function listParam(value: string) {
  return Array.from(new Set(value.split("|").map((item) => item.trim()).filter(Boolean))).slice(0, 40);
}

function intelligenceProfile(profile: ReturnType<typeof listProfiles>[number], activities: string[], workPreferences: string[]): IntelligenceProfile {
  return profileFromInput({
    id: profile.id,
    municipality: profile.location.municipality,
    capabilities: profile.capabilities,
    activities,
    workPreferences,
  });
}

export async function GET(request: Request) {
  const query = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams.entries()));
  if (!query.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const profile = listProfiles().find((candidate) => candidate.id === query.data.profileId);
  if (!profile) return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
  if (profile.type !== "PERSON") return NextResponse.json({ error: "person_required" }, { status: 403 });

  const intelligence = intelligenceProfile(profile, listParam(query.data.activities), listParam(query.data.workPreferences));
  const collected = await fetchExternalJobs({ source: "all" });
  const recommendations = rankVerifiedRecommendations(collected.items, intelligence);
  const limitations = verifiedOpportunityLimitations(collected.items.filter((item) => item.demo !== true));
  if (!recommendations.length && (intelligence.activities.length > 0 || intelligence.courseName || intelligence.specialization) && collected.items.some(isVerifiedDiscoveryItem)) {
    limitations.push("Nenhuma oportunidade verificável correspondeu às profissões, áreas ou habilidades informadas neste perfil; o OFLIX não substitui a ausência por uma profissão diferente.");
  }
  return NextResponse.json({
    recommendations,
    limitations,
    sources: collected.sources,
    collectedAt: collected.collectedAt,
    stale: collected.stale,
    partial: collected.partial,
    ...(collected.error ? { error: collected.error } : {}),
  });
}
