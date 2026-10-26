import { compensationReferenceValue } from "@/lib/compensation";
import type { DiscoveryItem } from "@/lib/domain";

export type SalaryResearchQuery = { occupation?: string; municipality?: string; source?: string };
export type SalaryResearchSummary = { label: "Salários publicados nas vagas observadas"; publications: number; withUsableSalary: number; coverageRate: number; median: number | null; minimum: number | null; maximum: number | null; period: "MONTHLY"; source: string; methodology: string[]; query: SalaryResearchQuery };
const normalize = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const median = (values: number[]) => { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; };

export function calculateSalaryResearch(items: DiscoveryItem[], query: SalaryResearchQuery = {}): SalaryResearchSummary {
  const occupation = normalize(query.occupation ?? "");
  const filtered = items.filter((item) => {
    const text = normalize(`${item.title} ${item.category} ${item.occupationLabel ?? ""} ${item.tags.join(" ")}`);
    return (item.kind === "formal" || item.kind === "external_job") && (!occupation || text.includes(occupation)) && (!query.municipality || normalize(item.location.municipality) === normalize(query.municipality)) && (!query.source || item.source === query.source);
  });
  const values = filtered.flatMap((item) => item.compensation?.period === "MONTHLY" ? [compensationReferenceValue(item.compensation)] : item.salaryMin !== undefined && (!item.salaryPeriod || item.salaryPeriod === "MONTHLY") ? [item.salaryMax !== undefined ? (item.salaryMin + item.salaryMax) / 2 : item.salaryMin] : []);
  return { label: "Salários publicados nas vagas observadas", publications: filtered.length, withUsableSalary: values.length, coverageRate: filtered.length ? Number((values.length / filtered.length).toFixed(4)) : 0, median: median(values), minimum: values.length ? Math.min(...values) : null, maximum: values.length ? Math.max(...values) : null, period: "MONTHLY", source: "OFLIX + fontes externas integradas", methodology: ["Somente valores explicitamente mensais são comparados.", "Faixas usam o ponto médio; salários ausentes não viram zero.", "Uma publicação observada conta como uma observação."], query };
}
