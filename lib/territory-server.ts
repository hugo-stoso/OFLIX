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
  const baseByMunicipality = new Map(data.municipalities.map((municipality) => [municipality.municipality.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"), municipality]));
  const municipalities = observed.municipalities.map((municipality) => {
    const base = baseByMunicipality.get(municipality.municipality.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"));
    return { municipality: municipality.municipality, ...(municipality.ibgeCode ? { ibgeCode: municipality.ibgeCode } : {}), opportunities: municipality.opportunities, formal: municipality.employment, clt: base?.clt ?? 0, internship: base?.internship ?? 0, services: municipality.services, volunteer: municipality.volunteer, interactions: municipality.interactions, categories: base?.categories ?? [] };
  });
  return {
    ...data,
    municipalities,
    fronts: [{ key: "employment", label: "Empregos observados", total: observed.employment.total }, { key: "service", label: "Prestação de serviços", total: observed.services }, { key: "volunteer", label: "Voluntariado", total: observed.volunteer }],
    totalOpportunities: observed.opportunities,
    interactions: observed.interactions,
    activeMunicipalities: observed.activeMunicipalities,
    employmentMarket,
  };
}

