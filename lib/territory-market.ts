import type { ExternalJobSource, ExternalJobsResult, ExternalJobsSourceSummary } from "@/lib/connectors/external-jobs";
import type { DiscoveryItem, ExternalDiscoverySource } from "@/lib/domain";
import { buildOccupationAggregates, occupationFamilyValue, occupationValue, selectOccupationAggregates, type OccupationAggregates, type OccupationFamily, type OccupationSelection } from "@/lib/occupations";
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

export type TerritoryObservedFilters = {
  municipality?: string | null;
  category?: string | null;
  employmentOrigin?: TerritoryEmploymentOrigin;
  externalSource?: TerritoryEmploymentSource | string | null;
  occupationFamily?: OccupationFamily | null;
  occupationKey?: string | null;
};

export type TerritoryObservedCategory = {
  front: "service" | "volunteer";
  category: string;
  total: number;
};

export type TerritoryObservedMunicipality = {
  municipality: string;
  ibgeCode?: string;
  employment: number;
  services: number;
  volunteer: number;
  opportunities: number;
  interactions: number;
  categories: TerritoryObservedCategory[];
};

export type TerritoryObservedAggregation = {
  employment: TerritoryEmploymentSelection;
  services: number;
  volunteer: number;
  opportunities: number;
  interactions: number;
  activeMunicipalities: number;
  municipalities: TerritoryObservedMunicipality[];
  categories: TerritoryObservedCategory[];
  occupations: OccupationAggregates;
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

  const eligibleExternalItems = external.items.filter(isSergipeExternalJob).map((item) => ({
    ...item,
    location: { ...item.location, municipality: displayMunicipalityName(item.location.municipality) },
  }));
  const eligibleOflixItems = oflixItems.filter((item) => item.kind === "formal" && item.source === "OFLIX");

  return {
    total: oflix + externalCount,
    oflix,
    external: externalCount,
    municipalities,
    sources,
    collectedAt: external.collectedAt,
    stale: external.stale,
    partial: external.partial,
    occupations: buildOccupationAggregates([...eligibleOflixItems, ...eligibleExternalItems]),
    ...(external.error ? { error: external.error } : {}),
  };
}

function sourceCountForMunicipality(municipality: TerritoryEmploymentMunicipality, source?: TerritoryEmploymentSource) {
  if (source) return municipality.bySource[source];
  return municipality.external;
}

export function resolveTerritoryEmploymentSelection(market: TerritoryEmploymentMarket, origin: TerritoryEmploymentOrigin, source?: string | null, occupationFamily?: OccupationFamily, occupationKey?: string | null): TerritoryEmploymentSelection {
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

  if (occupationKey) {
    const occupationSelection: OccupationSelection = { origin: resolvedOrigin, ...(resolvedSource ? { source: resolvedSource } : {}), ...(market.municipalities.length === 1 ? { municipality: market.municipalities[0].municipality } : {}) };
    const selected = market.occupations.occupations.find((item) => item.key === occupationKey);
    const selectedValues = selected ? selectOccupationAggregates({ ...market.occupations, occupations: [selected] }, occupationSelection).occupations[0] : undefined;
    const bySource = selectedValues?.bySource ?? { OFLIX: 0, GO_SERGIPE: 0, EMPREGAJU: 0, IEL_SERGIPE: 0 };
    return { origin: resolvedOrigin, ...(resolvedSource ? { source: resolvedSource } : {}), oflix: bySource.OFLIX, external: bySource.GO_SERGIPE + bySource.EMPREGAJU + bySource.IEL_SERGIPE, total: bySource.OFLIX + bySource.GO_SERGIPE + bySource.EMPREGAJU + bySource.IEL_SERGIPE, sourceCounts: { GO_SERGIPE: bySource.GO_SERGIPE, EMPREGAJU: bySource.EMPREGAJU, IEL_SERGIPE: bySource.IEL_SERGIPE } };
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

export function territoryEmploymentValue(market: TerritoryEmploymentMarket, municipality: string, origin: TerritoryEmploymentOrigin, source?: string | null, occupationFamily?: OccupationFamily, occupationKey?: string | null) {
  const item = market.municipalities.find((candidate) => candidate.normalizedMunicipality === normalizeMunicipalityKey(municipality));
  if (!item) return 0;
  if (occupationKey) return occupationValue(market.occupations, item.municipality, occupationKey, { origin, ...(source ? { source: source as Exclude<TerritoryEmploymentSource, "OFLIX"> } : {}) });
  if (occupationFamily) return occupationFamilyValue(market.occupations, item.municipality, occupationFamily, { origin, ...(source ? { source: source as Exclude<TerritoryEmploymentSource, "OFLIX"> } : {}) });
  const selection = resolveTerritoryEmploymentSelection({ ...market, municipalities: [item] }, origin, source);
  return selection.total;
}

export function territoryEmploymentBreakdown(market: TerritoryEmploymentMarket, municipality: string | null, origin: TerritoryEmploymentOrigin, source?: string | null, occupationFamily?: OccupationFamily, occupationKey?: string | null) {
  if (!municipality) return resolveTerritoryEmploymentSelection(market, origin, source, occupationFamily, occupationKey);
  return resolveTerritoryEmploymentSelection({ ...market, municipalities: market.municipalities.filter((item) => item.normalizedMunicipality === normalizeMunicipalityKey(municipality)) }, origin, source, occupationFamily, occupationKey);
}

function normalizedEmploymentOrigin(origin?: TerritoryEmploymentOrigin): TerritoryEmploymentOrigin {
  return origin === "oflix" || origin === "external" ? origin : "all";
}

function normalizedExternalSource(origin: TerritoryEmploymentOrigin, source?: string | null) {
  if (origin === "oflix" || !source || !TERRITORY_EMPLOYMENT_SOURCES.includes(source as TerritoryEmploymentSource)) return undefined;
  return source as TerritoryEmploymentSource;
}

function internalCategories(municipality: MunicipalityAggregate | undefined, category?: string | null) {
  return (municipality?.categories ?? [])
    .filter((item) => (item.front === "service" || item.front === "volunteer") && (!category || item.category === category))
    .map((item) => ({ front: item.front as "service" | "volunteer", category: item.category, total: item.total }));
}

export function territoryActivityCategoryOptions(baseMunicipalities: MunicipalityAggregate[]) {
  return Array.from(new Set(baseMunicipalities.flatMap((municipality) => municipality.categories
    .filter((item) => item.front === "service" || item.front === "volunteer")
    .map((item) => item.category)))).sort((left, right) => left.localeCompare(right, "pt-BR"));
}

function aggregateCategories(categories: TerritoryObservedCategory[]) {
  return Array.from(categories.reduce((map, item) => {
    const key = `${item.front}:${item.category}`;
    const current = map.get(key) ?? { front: item.front, category: item.category, total: 0 };
    current.total += item.total;
    map.set(key, current);
    return map;
  }, new Map<string, TerritoryObservedCategory>()).values()).sort((left, right) => right.total - left.total || left.category.localeCompare(right.category, "pt-BR"));
}

export function aggregateObservedTerritory(
  baseMunicipalities: MunicipalityAggregate[],
  employmentMarket: TerritoryEmploymentMarket | undefined,
  filters: TerritoryObservedFilters = {},
): TerritoryObservedAggregation {
  const origin = normalizedEmploymentOrigin(filters.employmentOrigin);
  const source = normalizedExternalSource(origin, filters.externalSource);
  const municipalityKey = filters.municipality ? normalizeMunicipalityKey(filters.municipality) : undefined;
  const marketMunicipalities = employmentMarket?.municipalities ?? [];
  const names = new Map<string, { municipality: string; ibgeCode?: string }>();

  for (const municipality of baseMunicipalities) {
    names.set(normalizeMunicipalityKey(municipality.municipality), { municipality: municipality.municipality, ...(municipality.ibgeCode ? { ibgeCode: municipality.ibgeCode } : {}) });
  }
  for (const municipality of marketMunicipalities) {
    const key = normalizeMunicipalityKey(municipality.municipality);
    if (!names.has(key)) names.set(key, { municipality: municipality.municipality, ...(municipality.ibgeCode ? { ibgeCode: municipality.ibgeCode } : {}) });
  }

  const municipalities = Array.from(names.entries())
    .filter(([key]) => !municipalityKey || key === municipalityKey)
    .map(([key, identity]) => {
      const internal = baseMunicipalities.find((item) => normalizeMunicipalityKey(item.municipality) === key);
      const categories = internalCategories(internal, filters.category);
      const employment = employmentMarket
        ? territoryEmploymentBreakdown(employmentMarket, identity.municipality, origin, source, filters.occupationFamily ?? undefined, filters.occupationKey ?? undefined)
        : { origin, ...(source ? { source } : {}), oflix: 0, external: 0, total: 0, sourceCounts: emptySourceCounts() };
      const services = categories.filter((item) => item.front === "service").reduce((total, item) => total + item.total, 0);
      const volunteer = categories.filter((item) => item.front === "volunteer").reduce((total, item) => total + item.total, 0);
      const interactions = (internal?.categories ?? [])
        .filter((item) => !filters.category || (item.front === "service" || item.front === "volunteer") && item.category === filters.category)
        .reduce((total, item) => total + item.interactions, 0);
      return { municipality: identity.municipality, ...(identity.ibgeCode ? { ibgeCode: identity.ibgeCode } : {}), employment: employment.total, services, volunteer, opportunities: employment.total + services + volunteer, interactions, categories };
    })
    .sort((left, right) => right.opportunities - left.opportunities || right.interactions - left.interactions || left.municipality.localeCompare(right.municipality, "pt-BR"));

  const employment = employmentMarket
    ? territoryEmploymentBreakdown(employmentMarket, filters.municipality ?? null, origin, source, filters.occupationFamily ?? undefined, filters.occupationKey ?? undefined)
    : { origin, ...(source ? { source } : {}), oflix: 0, external: 0, total: 0, sourceCounts: emptySourceCounts() };
  const categories = aggregateCategories(municipalities.flatMap((item) => item.categories));
  const services = municipalities.reduce((total, municipality) => total + municipality.services, 0);
  const volunteer = municipalities.reduce((total, municipality) => total + municipality.volunteer, 0);
  const interactions = municipalities.reduce((total, municipality) => total + municipality.interactions, 0);
  const occupations = employmentMarket ? selectOccupationAggregates(employmentMarket.occupations, { origin, ...(source ? { source } : {}), ...(filters.municipality ? { municipality: filters.municipality } : {}) }) : { total: 0, classified: 0, unclassified: 0, coverageRate: 0, families: [], occupations: [] };

  return {
    employment,
    services,
    volunteer,
    opportunities: employment.total + services + volunteer,
    interactions,
    activeMunicipalities: municipalities.filter((municipality) => municipality.opportunities > 0 || municipality.interactions > 0).length,
    municipalities,
    categories,
    occupations,
  };
}

