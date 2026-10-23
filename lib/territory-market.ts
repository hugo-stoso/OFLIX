import type { ExternalJobSource, ExternalJobsResult, ExternalJobsSourceSummary } from "@/lib/connectors/external-jobs";
import type { DiscoveryItem, ExternalDiscoverySource } from "@/lib/domain";
import { buildOccupationAggregates, occupationFamilyValue, selectOccupationAggregates, type OccupationAggregates, type OccupationFamily, type OccupationSelection } from "@/lib/occupations";
import type { MunicipalityAggregate } from "@/lib/territory";

export type TerritoryEmploymentOrigin = "all" | "oflix" | "external";
export type TerritoryEmploymentSource = ExternalDiscoverySource;

export const TERRITORY_EMPLOYMENT_SOURCES: TerritoryEmploymentSource[] = ["GO_SERGIPE", "EMPREGAJU", "IEL_SERGIPE"];

export type TerritoryEmploymentMunicipality = {
  municipality: string;
  normalizedMunicipality: string;
  ibgeCode?: string;
  oflix: number;
  external: number;
  total: number;
  bySource: Record<TerritoryEmploymentSource, number>;
};

export type TerritoryEmploymentMarket = {
  total: number;
  oflix: number;
  external: number;
  municipalities: TerritoryEmploymentMunicipality[];
  sources: ExternalJobsSourceSummary[];
  collectedAt: string;
  stale: boolean;
  partial: boolean;
  occupations: OccupationAggregates;
  error?: string;
};

export type TerritoryEmploymentSelection = {
  origin: TerritoryEmploymentOrigin;
  source?: TerritoryEmploymentSource;
  oflix: number;
  external: number;
  total: number;
  sourceCounts: Record<TerritoryEmploymentSource, number>;
};

function emptySourceCounts(): Record<TerritoryEmploymentSource, number> {
  return { GO_SERGIPE: 0, EMPREGAJU: 0, IEL_SERGIPE: 0 };
}
export function normalizeMunicipalityKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function displayMunicipalityName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isSergipeExternalJob(item: DiscoveryItem): item is DiscoveryItem & { source: TerritoryEmploymentSource } {
  return item.kind === "external_job" && item.location.state.trim().toUpperCase() === "SE" && TERRITORY_EMPLOYMENT_SOURCES.includes(item.source as TerritoryEmploymentSource) && Boolean(normalizeMunicipalityKey(item.location.municipality));
}

function createMunicipality(municipality: string, ibgeCode?: string): TerritoryEmploymentMunicipality {
  return { municipality, normalizedMunicipality: normalizeMunicipalityKey(municipality), ...(ibgeCode ? { ibgeCode } : {}), oflix: 0, external: 0, total: 0, bySource: emptySourceCounts() };
}

export function buildTerritoryEmploymentMarket(baseMunicipalities: MunicipalityAggregate[], external: ExternalJobsResult, oflixItems: DiscoveryItem[] = []): TerritoryEmploymentMarket {
  const municipalityMap = new Map<string, TerritoryEmploymentMunicipality>();
  const oflix = baseMunicipalities.reduce((total, municipality) => total + municipality.formal, 0);

  for (const municipality of baseMunicipalities) {
    const key = normalizeMunicipalityKey(municipality.municipality);
    const current = municipalityMap.get(key) ?? createMunicipality(municipality.municipality, municipality.ibgeCode);
    current.oflix += municipality.formal;
    current.total += municipality.formal;
    municipalityMap.set(key, current);
  }

  for (const item of external.items) {
    if (!isSergipeExternalJob(item)) continue;
    const key = normalizeMunicipalityKey(item.location.municipality);
    const current = municipalityMap.get(key) ?? createMunicipality(displayMunicipalityName(item.location.municipality));
    current.external += 1;
    current.total += 1;
    current.bySource[item.source] += 1;
    municipalityMap.set(key, current);
  }

  const sourceCounts = new Map<ExternalJobSource, number>(TERRITORY_EMPLOYMENT_SOURCES.map((source) => [source, 0]));
  for (const municipality of municipalityMap.values()) {
    for (const source of TERRITORY_EMPLOYMENT_SOURCES) sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + municipality.bySource[source]);
  }
  const sources = external.sources.map((source) => ({ ...source, count: sourceCounts.get(source.source) ?? 0 }));
  const municipalities = Array.from(municipalityMap.values()).sort((left, right) => right.total - left.total || left.municipality.localeCompare(right.municipality, "pt-BR"));
  const externalCount = municipalities.reduce((total, municipality) => total + municipality.external, 0);

  return {
    total: oflix + externalCount,
    oflix,
    external: externalCount,
    municipalities,
    sources,
    collectedAt: external.collectedAt,
    stale: external.stale,
    partial: external.partial,
    occupations: buildOccupationAggregates([...oflixItems, ...external.items]),
    ...(external.error ? { error: external.error } : {}),
  };
}

function sourceCountForMunicipality(municipality: TerritoryEmploymentMunicipality, source?: TerritoryEmploymentSource) {
  if (source) return municipality.bySource[source];
  return municipality.external;
}

export function resolveTerritoryEmploymentSelection(market: TerritoryEmploymentMarket, origin: TerritoryEmploymentOrigin, source?: string | null, occupationFamily?: OccupationFamily): TerritoryEmploymentSelection {
  const resolvedOrigin: TerritoryEmploymentOrigin = origin === "oflix" || origin === "external" ? origin : "all";
  const resolvedSource = resolvedOrigin === "oflix" || !source || !TERRITORY_EMPLOYMENT_SOURCES.includes(source as TerritoryEmploymentSource) ? undefined : source as TerritoryEmploymentSource;
  const includeAll = resolvedOrigin === "all" && !resolvedSource;
  const includeOflix = includeAll || resolvedOrigin === "oflix";
  const includeExternal = includeAll || resolvedOrigin === "external" || (resolvedOrigin === "all" && Boolean(resolvedSource));
  const sourceCounts = emptySourceCounts();
  let oflix = 0;
  let external = 0;

  for (const municipality of market.municipalities) {
    if (includeOflix) oflix += municipality.oflix;
    if (includeExternal) {
      if (resolvedSource) sourceCounts[resolvedSource] += municipality.bySource[resolvedSource];
      else for (const item of TERRITORY_EMPLOYMENT_SOURCES) sourceCounts[item] += municipality.bySource[item];
      external += sourceCountForMunicipality(municipality, resolvedSource);
    }
  }

  if (occupationFamily) {
    const occupationSelection: OccupationSelection = { origin: resolvedOrigin, ...(resolvedSource ? { source: resolvedSource } : {}), ...(market.municipalities.length === 1 ? { municipality: market.municipalities[0].municipality } : {}) };
    const selected = selectOccupationAggregates(market.occupations, occupationSelection);
    const family = selected.families.find((item) => item.family === occupationFamily);
    const familyBySource = family?.bySource ?? { OFLIX: 0, GO_SERGIPE: 0, EMPREGAJU: 0, IEL_SERGIPE: 0 };
    const selectedOflix = familyBySource.OFLIX;
    const selectedExternal = familyBySource.GO_SERGIPE + familyBySource.EMPREGAJU + familyBySource.IEL_SERGIPE;
    return {
      origin: resolvedOrigin,
      ...(resolvedSource ? { source: resolvedSource } : {}),
      oflix: selectedOflix,
      external: selectedExternal,
      total: selectedOflix + selectedExternal,
      sourceCounts: { GO_SERGIPE: familyBySource.GO_SERGIPE, EMPREGAJU: familyBySource.EMPREGAJU, IEL_SERGIPE: familyBySource.IEL_SERGIPE },
    };
  }

  return { origin: resolvedOrigin, ...(resolvedSource ? { source: resolvedSource } : {}), oflix, external, total: oflix + external, sourceCounts };
}

export function territoryEmploymentValue(market: TerritoryEmploymentMarket, municipality: string, origin: TerritoryEmploymentOrigin, source?: string | null, occupationFamily?: OccupationFamily) {
  const item = market.municipalities.find((candidate) => candidate.normalizedMunicipality === normalizeMunicipalityKey(municipality));
  if (!item) return 0;
  if (occupationFamily) return occupationFamilyValue(market.occupations, item.municipality, occupationFamily, { origin, ...(source ? { source: source as Exclude<TerritoryEmploymentSource, "OFLIX"> } : {}) });
  const selection = resolveTerritoryEmploymentSelection({ ...market, municipalities: [item] }, origin, source);
  return selection.total;
}

export function territoryEmploymentBreakdown(market: TerritoryEmploymentMarket, municipality: string | null, origin: TerritoryEmploymentOrigin, source?: string | null, occupationFamily?: OccupationFamily) {
  if (!municipality) return resolveTerritoryEmploymentSelection(market, origin, source, occupationFamily);
  return resolveTerritoryEmploymentSelection({ ...market, municipalities: market.municipalities.filter((item) => item.normalizedMunicipality === normalizeMunicipalityKey(municipality)) }, origin, source, occupationFamily);
}

