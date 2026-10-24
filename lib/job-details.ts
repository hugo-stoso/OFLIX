import { load } from "cheerio";
import type { DiscoveryItem, DiscoverySource, JobDetailField, JobDetailExtraction, JobDetailProvenance } from "@/lib/domain";

const BLOCK_TAGS = /<\/?(?:br|div|li|p|h[1-6])[^>]*>/giu;

export function normalizeJobDetailText(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  const document = load(`<div>${raw.replace(BLOCK_TAGS, "\n")}</div>`);
  document("script, style, noscript, iframe, form").remove();
  const lines = document("div").text().replace(/\u00a0/g, " ").split(/\r?\n/u).map((line) => line.replace(/[\t ]+/gu, " ").trim()).filter(Boolean);
  return lines.length ? lines.join("\n") : undefined;
}

export function mergeJobDetailText(...values: unknown[]) {
  const unique = new Set<string>();
  for (const value of values) {
    const normalized = normalizeJobDetailText(value);
    if (normalized) unique.add(normalized);
  }
  return unique.size ? Array.from(unique).join("\n") : undefined;
}

function hasDetailValue(item: DiscoveryItem, field: JobDetailField) {
  if (field === "salary") return Boolean(item.salary || item.salaryMin !== undefined || item.salaryMax !== undefined);
  if (field === "pcd") return Boolean(item.pcd || item.isPcdEligible !== undefined);
  const value = item[field as keyof DiscoveryItem];
  return Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
}

export function createJobDetailProvenance(item: DiscoveryItem, fields: JobDetailField[], extraction: JobDetailExtraction = "structured_field", verifiedAt = item.collectedAt ?? new Date().toISOString()): JobDetailProvenance[] {
  return fields.filter((field) => hasDetailValue(item, field)).map((field) => ({ field, source: item.source as DiscoverySource, extraction, verifiedAt }));
}

export function jobDetailCoverage(items: DiscoveryItem[]) {
  const sources = Array.from(new Set(items.map((item) => item.source))).sort();
  return sources.map((source) => {
    const sourceItems = items.filter((item) => item.source === source);
    const total = sourceItems.length;
    const count = (field: JobDetailField | "description") => sourceItems.filter((item) => field === "description" ? Boolean(item.description.trim()) : hasDetailValue(item, field)).length;
    const withDescription = count("description");
    const withRequirements = count("requirements");
    const withResponsibilities = count("responsibilities");
    const withEducation = count("education");
    const withExperience = count("experience");
    const withBenefits = count("benefits");
    const withContractType = count("contractType");
    const withWorkSchedule = count("workSchedule");
    const withWorkMode = sourceItems.filter((item) => Boolean(item.workMode ?? item.modality)).length;
    const withSalary = count("salary");
    const withPcd = count("pcd");
    const rate = (value: number) => total ? Number((value / total).toFixed(4)) : 0;
    return {
      source,
      total,
      withDescription,
      withRequirements,
      withResponsibilities,
      withEducation,
      withExperience,
      withBenefits,
      withContractType,
      withWorkSchedule,
      withWorkMode,
      withSalary,
      withPcd,
      coverageRate: {
        description: rate(withDescription),
        requirements: rate(withRequirements),
        responsibilities: rate(withResponsibilities),
        education: rate(withEducation),
        experience: rate(withExperience),
        benefits: rate(withBenefits),
        contractType: rate(withContractType),
        workSchedule: rate(withWorkSchedule),
        workMode: rate(withWorkMode),
        salary: rate(withSalary),
        pcd: rate(withPcd),
      },
    };
  });
}
