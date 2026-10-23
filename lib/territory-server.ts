import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { listOpportunities, territoryDataForProfile } from "@/lib/db";
import { internalToDiscoveryItem } from "@/lib/discovery";
import { buildTerritoryEmploymentMarket } from "@/lib/territory-market";
import type { TerritoryData } from "@/lib/territory";

export async function loadTerritoryDataForProfile(profileId: string, activities: string[] = []): Promise<TerritoryData | null> {
  const data = territoryDataForProfile(profileId, activities);
  if (!data || data.scope !== "general") return data as TerritoryData | null;

  const external = await fetchExternalJobs({ source: "all" });
  const formalItems = listOpportunities().formal.map(internalToDiscoveryItem);
  return { ...data, employmentMarket: buildTerritoryEmploymentMarket(data.municipalities, external, formalItems) };
}

