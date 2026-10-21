import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { territoryDataForProfile } from "@/lib/db";
import { buildTerritoryEmploymentMarket } from "@/lib/territory-market";
import type { TerritoryData } from "@/lib/territory";

export async function loadTerritoryDataForProfile(profileId: string, activities: string[] = []): Promise<TerritoryData | null> {
  const data = territoryDataForProfile(profileId, activities);
  if (!data || data.scope !== "general") return data as TerritoryData | null;

  const external = await fetchExternalJobs({ source: "all" });
  return { ...data, employmentMarket: buildTerritoryEmploymentMarket(data.municipalities, external) };
}

