import { fetchExternalJobs } from "@/lib/connectors/external-jobs";
import { listOpportunities, territoryDataForProfile } from "@/lib/db";
import { internalToDiscoveryItem } from "@/lib/discovery";
import { aggregateObservedTerritory, buildTerritoryEmploymentMarket } from "@/lib/territory-market";
import type { TerritoryData } from "@/lib/territory";

export async function loadTerritoryDataForProfile(profileId: string, activities: string[] = []): Promise<TerritoryData | null> {
  const data = territoryDataForProfile(profileId, activities);
  if (!data || data.scope !== "general") return data as TerritoryData | null;

  const external = await fetchExternalJobs({ source: "all" });
  const formalItems = listOpportunities().formal.map(internalToDiscoveryItem);
  const employmentMarket = buildTerritoryEmploymentMarket(data.municipalities, external, formalItems);
  const observed = aggregateObservedTerritory(data.municipalities, employmentMarket);
  return {
    ...data,
    fronts: [{ key: "employment", label: "Empregos observados", total: observed.employment.total }, { key: "service", label: "Prestação de serviços", total: observed.services }, { key: "volunteer", label: "Voluntariado", total: observed.volunteer }],
    totalOpportunities: observed.opportunities,
    interactions: observed.interactions,
    activeMunicipalities: observed.activeMunicipalities,
    employmentMarket,
  };
}

