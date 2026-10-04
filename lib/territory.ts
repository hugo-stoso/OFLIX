export type TerritoryMetric = "opportunities" | "employment" | "services" | "volunteer" | "interactions";

export type MunicipalityCategory = {
  front: "formal" | "service" | "volunteer";
  category: string;
  total: number;
  interactions: number;
  clt: number;
  internship: number;
};

export type MunicipalityAggregate = {
  municipality: string;
  ibgeCode?: string;
  opportunities: number;
  formal: number;
  clt: number;
  internship: number;
  services: number;
  volunteer: number;
  interactions: number;
  categories: MunicipalityCategory[];
};

export type TerritoryData = {
  scope: "general";
  fronts: { key: string; label: string; total: number }[];
  totalOpportunities: number;
  interactions: number;
  activeMunicipalities: number;
  territorial: { municipality: string; district: string; opportunities: number; total: number }[];
  categories: { front: string; category: string; total: number }[];
  employmentByRegion: { municipality: string; district: string; employmentType: "CLT" | "INTERNSHIP"; total: number }[];
  municipalities: MunicipalityAggregate[];
};

export type TerritoryGeometry = {
  type: "FeatureCollection";
  properties?: Record<string, unknown>;
  features: Array<{
    type: "Feature";
    properties: { municipality: string; ibgeCode?: string; state?: string };
    geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
  }>;
};

export const TERRITORY_METRICS: Array<{ value: TerritoryMetric; label: string; shortLabel: string }> = [
  { value: "opportunities", label: "Todas as oportunidades", shortLabel: "Oportunidades" },
  { value: "employment", label: "Empregos", shortLabel: "Empregos" },
  { value: "services", label: "Serviços", shortLabel: "Serviços" },
  { value: "volunteer", label: "Voluntariado", shortLabel: "Voluntariado" },
  { value: "interactions", label: "Interações", shortLabel: "Interações" },
];

export function territoryMetricLabel(metric: TerritoryMetric) {
  return TERRITORY_METRICS.find((item) => item.value === metric)?.shortLabel ?? "Oportunidades";
}

export function territoryMetricValue(municipality: Pick<MunicipalityAggregate, "opportunities" | "formal" | "services" | "volunteer" | "interactions">, metric: TerritoryMetric) {
  if (metric === "employment") return municipality.formal;
  return municipality[metric];
}
