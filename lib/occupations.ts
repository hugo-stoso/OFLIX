import type { DiscoveryItem } from "@/lib/domain";

export const OCCUPATION_FAMILIES = [
  "ADMINISTRATION",
  "CUSTOMER_SERVICE_SALES",
  "LOGISTICS_TRANSPORT",
  "CLEANING_GENERAL_SERVICES",
  "CONSTRUCTION_MAINTENANCE",
  "INDUSTRY_PRODUCTION",
  "TECHNOLOGY",
  "HEALTH",
  "EDUCATION",
  "FOOD_HOSPITALITY",
  "SECURITY",
  "AGRICULTURE",
  "FINANCE_ACCOUNTING",
  "COMMUNICATION_DESIGN",
  "OTHER",
  "UNCLASSIFIED",
] as const;

export type OccupationFamily = (typeof OCCUPATION_FAMILIES)[number];

export const OCCUPATION_FAMILY_LABELS: Record<OccupationFamily, string> = {
  ADMINISTRATION: "Administração",
  CUSTOMER_SERVICE_SALES: "Atendimento e vendas",
  LOGISTICS_TRANSPORT: "Logística e transporte",
  CLEANING_GENERAL_SERVICES: "Limpeza e serviços gerais",
  CONSTRUCTION_MAINTENANCE: "Construção e manutenção",
  INDUSTRY_PRODUCTION: "Indústria e produção",
  TECHNOLOGY: "Tecnologia",
  HEALTH: "Saúde",
  EDUCATION: "Educação",
  FOOD_HOSPITALITY: "Alimentação e hospitalidade",
  SECURITY: "Segurança",
  AGRICULTURE: "Agropecuária",
  FINANCE_ACCOUNTING: "Finanças e contabilidade",
  COMMUNICATION_DESIGN: "Comunicação e design",
  OTHER: "Outras ocupações",
  UNCLASSIFIED: "Não classificada",
};

export type OccupationClassificationSource = "SOURCE_CBO" | "SOURCE_LABEL" | "TITLE_RULE" | "UNCLASSIFIED";

export type HarmonizedOccupation = {
  key: string;
  label: string;
  family: OccupationFamily;
  source: OccupationClassificationSource;
  confidence: "explicit" | "deterministic";
  occupationCode?: string;
  occupationLabel?: string;
};

export type OccupationDataSource = "OFLIX" | "GO_SERGIPE" | "EMPREGAJU" | "IEL_SERGIPE";

export type OccupationMunicipalityAggregate = {
  municipality: string;
  count: number;
  bySource: Record<OccupationDataSource, number>;
};

export type OccupationAggregate = {
  key: string;
  label: string;
  family: OccupationFamily;
  total: number;
  byMunicipality: OccupationMunicipalityAggregate[];
  bySource: Record<OccupationDataSource, number>;
};

export type OccupationFamilyAggregate = {
  family: OccupationFamily;
  label: string;
  total: number;
  byMunicipality: OccupationMunicipalityAggregate[];
  bySource: Record<OccupationDataSource, number>;
};

export type OccupationAggregates = {
  total: number;
  classified: number;
  unclassified: number;
  coverageRate: number;
  families: OccupationFamilyAggregate[];
  occupations: OccupationAggregate[];
};

const OCCUPATION_SOURCES: OccupationDataSource[] = ["OFLIX", "GO_SERGIPE", "EMPREGAJU", "IEL_SERGIPE"];

function emptySourceCounts(): Record<OccupationDataSource, number> {
  return { OFLIX: 0, GO_SERGIPE: 0, EMPREGAJU: 0, IEL_SERGIPE: 0 };
}

export function normalizeOccupationText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type OccupationRule = { family: OccupationFamily; patterns: RegExp[] };

const TITLE_RULES: OccupationRule[] = [
  { family: "ADMINISTRATION", patterns: [/\badministrativ/u, /\bassistente de escritorio\b/u, /\bauxiliar de escritorio\b/u, /\bsecretari(?:a|o)/u, /\bescriturari/u, /\bestagio em administracao\b/u, /\bcoordenador de rh\b/u, /\brecursos humanos\b/u] },
  { family: "CUSTOMER_SERVICE_SALES", patterns: [/\bvendedor/u, /\bvendas?/u, /\batendente/u, /\boperador de caixa\b/u, /\btelemarketing\b/u, /\bcomercial/u, /\bpromotor de vendas\b/u, /\bagente de relacionamento\b/u, /\brecepcionist/u, /\batendimento\b/u] },
  { family: "LOGISTICS_TRANSPORT", patterns: [/\blogistic/u, /\bestoquist/u, /\balmoxarif/u, /\bmotorista/u, /\bcaminhoneir/u, /\bentregador/u, /\bconferente/u, /\bexpedicao/u, /\barmazem/u, /\bcarga e descarga\b/u, /\bcarregador/u, /\boperador de empilhadeira\b/u, /\bmotofretist/u, /\brepositor/u] },
  { family: "CLEANING_GENERAL_SERVICES", patterns: [/\blimpeza/u, /\bfaxineir/u, /\bservicos gerais\b/u, /\bauxiliar de servicos\b/u, /\bauxiliar de limpeza\b/u, /\bservente de limpeza\b/u, /\bzelador/u] },
  { family: "CONSTRUCTION_MAINTENANCE", patterns: [/\beletricist/u, /\bencanador/u, /\bpedreir/u, /\bconstrucao civil\b/u, /\bservente(?: de)? construcao\b/u, /\bservente pedreiro\b/u, /\bcarpinteir/u, /\bmarceneir/u, /\bgesseir/u, /\barmador de ferragens\b/u, /\bmontador de estruturas metalicas\b/u, /\bmarteleteir/u, /\boperador de betoneira\b/u, /\btecnico de edificacoes\b/u, /\btecnico de refrigeracao\b/u, /\btecnicos? em eletricidade\b/u, /\bagrimensur/u, /\bestagio em engenharia civ\b/u, /\bpintor/u, /\bmanutenc(?:ao|ista)/u, /\bmecanico/u, /\bchefe de oficina\b/u, /\bborracheir/u, /\bestofador de moveis\b/u, /\bsoldador/u, /\binstalador/u, /\bauxiliar de eletrotecnico\b/u, /\bengenheir(?:o|a)? civil\b/u] },
  { family: "INDUSTRY_PRODUCTION", patterns: [/\bproducao/u, /\boperador de maquinas?\b/u, /\boperador de caldeira\b/u, /\bcostureir/u, /\btorneir/u, /\btecnico quimic/u, /\blaboratorio de controle de qualidade\b/u] },
  { family: "TECHNOLOGY", patterns: [/\bdesenvolvedor/u, /\bprogramador/u, /\banalista de sistemas\b/u, /\bsuporte tecnico\b/u, /\btecnologia/u, /\binfraestrutura de ti\b/u, /\bdados\b/u] },
  { family: "HEALTH", patterns: [/\benfermeir/u, /\bmedic/u, /\bfarmaceut/u, /\bfisioterap/u, /\bdentist/u, /\btecnico de enfermagem\b/u, /\bauxiliar de enfermagem\b/u, /\bcuidador\b/u, /\bsaude/u] },
  { family: "EDUCATION", patterns: [/\bprofessor/u, /\bpedagog/u, /\binstrutor/u, /\beducador/u, /\bprojetos educativos\b/u, /\blicenciatur/u] },
  { family: "FOOD_HOSPITALITY", patterns: [/\bcozinheir/u, /\bajudante de cozinha\b/u, /\bauxiliar de cozinha\b/u, /\bgarcom/u, /\bconfeiteir/u, /\bcopeir/u, /\bpadeir/u, /\bhotel/u, /\brestaurante/u, /\blanchonete/u, /\bpadaria/u] },
  { family: "SECURITY", patterns: [/\bvigilante/u, /\bseguranca patrimonial\b/u, /\bporteiro/u, /\bagente de portaria\b/u] },
  { family: "AGRICULTURE", patterns: [/\bagricult/u, /\brural/u, /\bpecuar/u, /\bjardineir/u, /\btratorista/u, /\bpescador/u] },
  { family: "FINANCE_ACCOUNTING", patterns: [/\bcontador/u, /\bcontabil/u, /\bfinanceir/u, /\bfiscal/u, /\btesour/u, /\bcobranca\b/u] },
  { family: "COMMUNICATION_DESIGN", patterns: [/\bcomunicacao/u, /\bredator/u, /\bdesigner/u, /\bdesign/u, /\bmarketing/u, /\bjornal/u, /\bsocial media\b/u, /\bmidias sociais\b/u, /\bpublicidade/u, /\bgrafico/u, /\bdesenhista grafico\b/u] },
  { family: "OTHER", patterns: [/\badvogad\b/u, /\bjuridic\b/u, /\bpsicolog\b/u, /\bassistente social\b/u, /\bcabeleireir/u, /\bfrentist/u, /\bengenheir\b/u, /\brecursos humanos\b/u] },
];

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function familyFromText(value: string): OccupationFamily | undefined {
  const normalized = normalizeOccupationText(value);
  if (!normalized) return undefined;
  return TITLE_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(normalized)))?.family;
}

export function resolveOccupationFamily(value: string) {
  return familyFromText(value);
}

function sourceForItem(item: DiscoveryItem): OccupationDataSource | undefined {
  if (item.kind === "formal" && item.source === "OFLIX") return "OFLIX";
  if (item.kind !== "external_job") return undefined;
  return OCCUPATION_SOURCES.includes(item.source as OccupationDataSource) ? item.source as OccupationDataSource : undefined;
}

export function harmonizeOccupation(item: DiscoveryItem): HarmonizedOccupation {
  const occupationCode = textValue(item.occupationCode);
  const occupationLabel = textValue(item.occupationLabel);
  const title = textValue(item.title);
  const explicitText = occupationLabel || title;

  if (occupationCode) {
    return {
      key: `cbo:${normalizeOccupationText(occupationCode)}`,
      label: occupationLabel || title || "Ocupação informada pela fonte",
      family: familyFromText(explicitText) ?? "UNCLASSIFIED",
      source: "SOURCE_CBO",
      confidence: "explicit",
      occupationCode,
      ...(occupationLabel ? { occupationLabel } : {}),
    };
  }

  if (occupationLabel) {
    return {
      key: normalizeOccupationText(occupationLabel),
      label: occupationLabel,
      family: familyFromText(occupationLabel) ?? "UNCLASSIFIED",
      source: "SOURCE_LABEL",
      confidence: "explicit",
      occupationLabel,
    };
  }

  const family = familyFromText(title);
  if (family) return { key: normalizeOccupationText(title), label: title, family, source: "TITLE_RULE", confidence: "deterministic" };
  return { key: normalizeOccupationText(title) || "unclassified", label: title || "Não informado", family: "UNCLASSIFIED", source: "UNCLASSIFIED", confidence: "deterministic" };
}

function addTotalCount(target: { total: number; bySource: Record<OccupationDataSource, number> }, source: OccupationDataSource) {
  target.total += 1;
  target.bySource[source] += 1;
}

function addMunicipalityCount(target: { count: number; bySource: Record<OccupationDataSource, number> }, source: OccupationDataSource) {
  target.count += 1;
  target.bySource[source] += 1;
}

function sortMunicipalities(values: OccupationMunicipalityAggregate[]) {
  return values.sort((left, right) => right.count - left.count || left.municipality.localeCompare(right.municipality, "pt-BR"));
}

export function buildOccupationAggregates(items: DiscoveryItem[]): OccupationAggregates {
  const families = new Map<OccupationFamily, OccupationFamilyAggregate>();
  const occupations = new Map<string, OccupationAggregate>();
  let total = 0;
  let classified = 0;

  for (const item of items) {
    const source = sourceForItem(item);
    if (!source || !item.location?.municipality) continue;
    total += 1;
    const harmonized = harmonizeOccupation(item);
    if (harmonized.family !== "UNCLASSIFIED") classified += 1;
    const family = families.get(harmonized.family) ?? { family: harmonized.family, label: OCCUPATION_FAMILY_LABELS[harmonized.family], total: 0, byMunicipality: [], bySource: emptySourceCounts() };
    const familyMunicipality = family.byMunicipality.find((entry) => entry.municipality === item.location.municipality) ?? { municipality: item.location.municipality, count: 0, bySource: emptySourceCounts() };
    if (!family.byMunicipality.includes(familyMunicipality)) family.byMunicipality.push(familyMunicipality);
    addTotalCount(family, source);
    addMunicipalityCount(familyMunicipality, source);
    families.set(harmonized.family, family);

    const occupation = occupations.get(harmonized.key) ?? { key: harmonized.key, label: harmonized.label, family: harmonized.family, total: 0, byMunicipality: [], bySource: emptySourceCounts() };
    const occupationMunicipality = occupation.byMunicipality.find((entry) => entry.municipality === item.location.municipality) ?? { municipality: item.location.municipality, count: 0, bySource: emptySourceCounts() };
    if (!occupation.byMunicipality.includes(occupationMunicipality)) occupation.byMunicipality.push(occupationMunicipality);
    addTotalCount(occupation, source);
    addMunicipalityCount(occupationMunicipality, source);
    occupations.set(harmonized.key, occupation);
  }

  const sortAggregates = <T extends { total: number; label: string; byMunicipality: OccupationMunicipalityAggregate[] }>(values: T[]) => values.sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "pt-BR")).map((value) => ({ ...value, byMunicipality: sortMunicipalities(value.byMunicipality) }));
  return {
    total,
    classified,
    unclassified: total - classified,
    coverageRate: total ? Math.round((classified / total) * 10000) / 10000 : 0,
    families: sortAggregates(Array.from(families.values())),
    occupations: sortAggregates(Array.from(occupations.values())),
  };
}

export type OccupationSelection = { origin: "all" | "oflix" | "external"; source?: Exclude<OccupationDataSource, "OFLIX">; municipality?: string };

function selectedSources(selection: OccupationSelection) {
  if (selection.source) return [selection.source];
  if (selection.origin === "oflix") return ["OFLIX"] as OccupationDataSource[];
  if (selection.origin === "external") return ["GO_SERGIPE", "EMPREGAJU", "IEL_SERGIPE"] as OccupationDataSource[];
  return OCCUPATION_SOURCES;
}

function selectAggregate<T extends { total: number; byMunicipality: OccupationMunicipalityAggregate[]; bySource: Record<OccupationDataSource, number> }>(aggregate: T, selection: OccupationSelection) {
  const sources = selectedSources(selection);
  const municipalityRows = selection.municipality ? aggregate.byMunicipality.filter((row) => row.municipality === selection.municipality) : aggregate.byMunicipality;
  const bySource = emptySourceCounts();
  for (const source of sources) bySource[source] = municipalityRows.reduce((total, row) => total + row.bySource[source], 0);
  const total = sources.reduce((sum, source) => sum + bySource[source], 0);
  return { total, byMunicipality: municipalityRows.map((row) => ({ ...row, count: sources.reduce((sum, source) => sum + row.bySource[source], 0), bySource: { ...row.bySource } })), bySource };
}

export function selectOccupationAggregates(aggregates: OccupationAggregates, selection: OccupationSelection) {
  const families = aggregates.families.map((family) => ({ ...family, ...selectAggregate(family, selection) })).filter((family) => family.total > 0);
  const occupations = aggregates.occupations.map((occupation) => ({ ...occupation, ...selectAggregate(occupation, selection) })).filter((occupation) => occupation.total > 0);
  const total = families.reduce((sum, family) => sum + family.total, 0);
  const classified = families.filter((family) => family.family !== "UNCLASSIFIED").reduce((sum, family) => sum + family.total, 0);
  return { total, classified, unclassified: families.find((family) => family.family === "UNCLASSIFIED")?.total ?? 0, coverageRate: total ? Math.round((classified / total) * 10000) / 10000 : 0, families, occupations };
}

export type OccupationQueryResolution =
  | { status: "resolved"; occupation: OccupationAggregate; match: "exact" | "unique_normalized" }
  | { status: "ambiguous"; candidates: OccupationAggregate[] }
  | { status: "not_found"; candidates?: OccupationAggregate[] };

function occupationKeyText(key: string) {
  return normalizeOccupationText(key.replace(/^cbo:/i, ""));
}

export function resolveOccupationQuery(occupations: OccupationAggregate[], query: string): OccupationQueryResolution {
  const normalizedQuery = normalizeOccupationText(query);
  if (!normalizedQuery) return { status: "not_found" };

  const exactLabel = occupations.filter((occupation) => normalizeOccupationText(occupation.label) === normalizedQuery);
  if (exactLabel.length === 1) return { status: "resolved", occupation: exactLabel[0], match: "exact" };
  if (exactLabel.length > 1) return { status: "ambiguous", candidates: exactLabel };

  const exactKey = occupations.filter((occupation) => occupationKeyText(occupation.key) === normalizedQuery);
  if (exactKey.length === 1) return { status: "resolved", occupation: exactKey[0], match: "exact" };
  if (exactKey.length > 1) return { status: "ambiguous", candidates: exactKey };

  const candidates = occupations.filter((occupation) => {
    const label = normalizeOccupationText(occupation.label);
    return label === normalizedQuery || label.startsWith(`${normalizedQuery} `) || label.endsWith(` ${normalizedQuery}`) || label.includes(` ${normalizedQuery} `);
  });
  if (candidates.length === 1) return { status: "resolved", occupation: candidates[0], match: "unique_normalized" };
  if (candidates.length > 1) return { status: "ambiguous", candidates };
  return { status: "not_found" };
}

export function occupationFamilyValue(aggregates: OccupationAggregates | undefined, municipality: string, family: OccupationFamily, selection: OccupationSelection) {
  if (!aggregates) return 0;
  const selected = aggregates.families.find((item) => item.family === family);
  if (!selected) return 0;
  return selectAggregate(selected, { ...selection, municipality }).total;
}

export function occupationValue(aggregates: OccupationAggregates | undefined, municipality: string, occupationKey: string, selection: OccupationSelection) {
  if (!aggregates) return 0;
  const selected = aggregates.occupations.find((item) => item.key === occupationKey);
  if (!selected) return 0;
  return selectAggregate(selected, { ...selection, municipality }).total;
}
