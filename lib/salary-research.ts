import { compensationReferenceValue } from "@/lib/compensation";
import {
  buildOccupationAggregates,
  resolveOccupationQuery,
} from "@/lib/occupations";
import type { DiscoveryItem } from "@/lib/domain";
import {
  findOccupationReference,
  normalizeCbo,
} from "@/lib/occupation-catalog";

export type SalaryResearchQuery = {
  occupation?: string;
  occupationCode?: string;
  municipality?: string;
  state?: string;
  source?: string;
};
export type NormalizedRemuneration = {
  hasPublishedValue: boolean;
  min?: number;
  max?: number;
  referenceValue?: number;
  currency?: "BRL";
  period: "MONTHLY" | "HOURLY" | "DAILY" | "UNKNOWN";
  raw?: string;
  comparableMonthly: boolean;
  sourceField: "compensation" | "salary_range" | "raw_salary";
};
export type SalarySourceHealth = {
  source: string;
  provider: string;
  count: number;
  stale: boolean;
  partial: boolean;
  status: "FULL" | "PARTIAL" | "STALE" | "UNAVAILABLE";
};
export type SalaryResearchSummary = {
  label: "Salários publicados nas vagas observadas";
  publications: number;
  withPublishedRemuneration: number;
  publishedCoverageRate: number;
  monthlyComparable: number;
  monthlyComparableCoverageRate: number;
  medianMonthly: number | null;
  minimumMonthly: number | null;
  maximumMonthly: number | null;
  sampleSize: number;
  hasSmallSample: boolean;
  municipalities: string[];
  sourceHealth: SalarySourceHealth[];
  occupationResolution:
    | "not_requested"
    | "resolved"
    | "ambiguous"
    | "not_found";
  incompleteMessage?: string;
  methodology: string[];
  query: SalaryResearchQuery;
};
const normalize = (value: string) =>
  value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

function parseRawSalary(raw: string) {
  const match = raw.replace(/\s+/g, " ").match(/R\$\s*([\d.]+(?:,\d{1,2})?)/iu);
  if (!match) return undefined;
  const value = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export function normalizeRemuneration(
  item: DiscoveryItem,
): NormalizedRemuneration | undefined {
  if (item.compensation)
    return {
      hasPublishedValue: true,
      min: item.compensation.min,
      max: item.compensation.max,
      referenceValue: compensationReferenceValue(item.compensation),
      currency: "BRL",
      period: "MONTHLY",
      comparableMonthly: true,
      sourceField: "compensation",
    };
  if (item.salaryMin !== undefined || item.salaryMax !== undefined) {
    const min = item.salaryMin ?? item.salaryMax;
    const max = item.salaryMax;
    const period = item.salaryPeriod ?? "UNKNOWN";
    return {
      hasPublishedValue: true,
      min,
      max,
      referenceValue:
        min === undefined
          ? undefined
          : max === undefined
            ? min
            : (min + max) / 2,
      currency: item.salaryCurrency ?? "BRL",
      period,
      comparableMonthly: period === "MONTHLY",
      raw: item.salary,
      sourceField: "salary_range",
    };
  }
  const rawValue = item.salary ? parseRawSalary(item.salary) : undefined;
  return rawValue === undefined
    ? undefined
    : {
        hasPublishedValue: true,
        min: rawValue,
        referenceValue: rawValue,
        currency: "BRL",
        period: "UNKNOWN",
        comparableMonthly: false,
        raw: item.salary,
        sourceField: "raw_salary",
      };
}

function defaultSourceHealth(items: DiscoveryItem[]): SalarySourceHealth[] {
  const grouped = new Map<
    string,
    { count: number; stale: boolean; partial: boolean }
  >();
  for (const item of items) {
    const current = grouped.get(item.source) ?? {
      count: 0,
      stale: false,
      partial: false,
    };
    current.count += 1;
    grouped.set(item.source, current);
  }
  return [...grouped.entries()].map(([source, value]) => ({
    source,
    provider:
      source === "GO_SERGIPE"
        ? "GO Sergipe"
        : source === "EMPREGAJU"
          ? "EmpregAju"
          : source === "IEL_SERGIPE"
            ? "IEL Sergipe"
            : "OFLIX",
    ...value,
    status: value.stale ? "STALE" : value.partial ? "PARTIAL" : "FULL",
  }));
}

export function calculateSalaryResearch(
  items: DiscoveryItem[],
  query: SalaryResearchQuery = {},
  health?: SalarySourceHealth[],
): SalaryResearchSummary {
  const eligible = items.filter(
    (item) => (item.kind === "formal" || item.kind === "external_job") && !item.demo,
  );
  const aggregates = buildOccupationAggregates(eligible);
  const requestedOccupation = query.occupation?.trim() ?? "";
  const reference = findOccupationReference(
    requestedOccupation,
    query.occupationCode,
  );
  const resolution = reference
    ? {
        status: "resolved" as const,
        occupation: { key: `cbo:${reference.cbo}`, label: reference.label },
      }
    : requestedOccupation
      ? resolveOccupationQuery(aggregates.occupations, requestedOccupation)
      : undefined;
  const occupationResolution =
    !requestedOccupation && !query.occupationCode
      ? "not_requested"
      : (resolution?.status ?? "not_found");
  const filtered = eligible.filter((item) => {
    const codeMatch =
      !query.occupationCode ||
      normalizeCbo(item.occupationCode ?? "") ===
        normalizeCbo(query.occupationCode);
    const occupationMatch =
      !requestedOccupation ||
      (resolution?.status === "resolved" &&
        (item.occupationCode
          ? `cbo:${normalizeCbo(item.occupationCode)}` ===
            resolution.occupation.key
          : reference
            ? normalize(item.occupationLabel ?? item.title) ===
              normalize(reference.label)
            : resolution.occupation.key ===
              normalize(item.occupationLabel ?? item.title)));
    return (
      Boolean(codeMatch && occupationMatch) &&
      (!query.state ||
        normalize(item.location.state) === normalize(query.state)) &&
      (!query.municipality ||
        normalize(item.location.municipality) ===
          normalize(query.municipality)) &&
      (!query.source || item.source === query.source)
    );
  });
  const remunerations = filtered
    .map(normalizeRemuneration)
    .filter((value): value is NormalizedRemuneration => Boolean(value));
  const monthly = remunerations
    .map((value) =>
      value.comparableMonthly ? value.referenceValue : undefined,
    )
    .filter((value): value is number => value !== undefined);
  const monthlyMedian = median(monthly);
  const withPublishedRemuneration = remunerations.length;
  return {
    label: "Salários publicados nas vagas observadas",
    publications: filtered.length,
    withPublishedRemuneration,
    publishedCoverageRate: filtered.length
      ? Number((withPublishedRemuneration / filtered.length).toFixed(4))
      : 0,
    monthlyComparable: monthly.length,
    monthlyComparableCoverageRate: filtered.length
      ? Number((monthly.length / filtered.length).toFixed(4))
      : 0,
    medianMonthly: monthlyMedian,
    minimumMonthly: monthly.length ? Math.min(...monthly) : null,
    maximumMonthly: monthly.length ? Math.max(...monthly) : null,
    sampleSize: monthly.length,
    hasSmallSample: monthly.length < 2,
    municipalities: [
      ...new Set(eligible.map((item) => item.location.municipality)),
    ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    sourceHealth: health ?? defaultSourceHealth(filtered),
    occupationResolution,
    methodology: [
      "Remuneração publicada conta mesmo quando a fonte não informa periodicidade.",
      "Somente valores com semântica mensal explícita entram na mediana e na faixa mensal.",
      "GO Sergipe, EmpregAju e IEL permanecem UNKNOWN quando o anúncio não define o período; não há inferência por plausibilidade.",
      "Faixas estruturadas usam o ponto médio; ausência de remuneração não vira zero.",
    ],
    query,
  };
}
