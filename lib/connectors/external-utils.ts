import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { DiscoveryItem, DiscoveryLocation } from "@/lib/domain";

export const EXTERNAL_JOB_USER_AGENT = "OFLIX/0.1 (+https://oflix-six.vercel.app)";

const firstSeenByItem = new Map<string, string>();

export function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[\t\r\n]+/g, " ").replace(/ {2,}/g, " ").trim();
}

export function textFromHtml(html: string) {
  if (!html) return "";
  const spacedHtml = html.replace(/<\/?(?:br|p|div|li|strong|span|a|h[1-6])[^>]*>/giu, " ");
  const document = load(`<div>${spacedHtml}</div>`);
  document("script, style, noscript, iframe, form").remove();
  return normalizeWhitespace(document("div").text());
}

export function parseBrazilianDate(value: string) {
  const match = normalizeWhitespace(value).match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : undefined;
}

export function parseLocation(value: string): DiscoveryLocation | undefined {
  const match = normalizeWhitespace(value).match(/^(.+?)\s*(?:\/|[-–—])\s*([A-Za-z]{2})$/u);
  if (!match) return undefined;
  return { municipality: normalizeWhitespace(match[1]), state: match[2].toUpperCase() };
}

export function parseVacancies(value: string) {
  const match = normalizeWhitespace(value).match(/\b(\d+)\s+vagas?\b/iu);
  if (!match) return undefined;
  const count = Number(match[1]);
  return Number.isFinite(count) ? `${count} ${count === 1 ? "vaga" : "vagas"}` : undefined;
}

export function parseSalary(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized || !/R\$\s*[\d.]+,\d{2}/u.test(normalized)) return {};
  const match = normalized.match(/R\$\s*([\d.]+,\d{2})/u);
  if (!match) return {};
  const numeric = Number(match[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(numeric) || numeric <= 0) return {};
  return {
    salary: normalized,
    salaryMin: numeric,
    salaryCurrency: "BRL" as const,
    salaryPeriod: /mensal|m[eê]s/iu.test(normalized) ? ("MONTHLY" as const) : ("UNKNOWN" as const),
    salaryIsEstimated: /a partir|at[eé]|estimad/iu.test(normalized),
  };
}

export function stableExternalFingerprint(fields: string[]) {
  return createHash("sha256").update(fields.join("|")).digest("hex").slice(0, 20);
}

export function markExternalLifecycle(item: DiscoveryItem, collectedAt: string) {
  const normalized = normalizeExternalFields(item);
  const key = `${normalized.source}:${normalized.sourceId ?? normalized.id}`;
  const firstSeenAt = firstSeenByItem.get(key) ?? collectedAt;
  firstSeenByItem.set(key, firstSeenAt);
  return {
    ...normalized,
    collectedAt,
    firstSeenAt,
    lastSeenAt: collectedAt,
    lastVerifiedAt: collectedAt,
    importedAt: firstSeenAt,
  };
}

export function normalizeExternalFields(item: DiscoveryItem) {
  const vacancyCount = item.vacancies?.match(/\b(\d+)\s+vagas?\b/iu)?.[1];
  return {
    ...item,
    sourceJobId: item.sourceJobId ?? item.sourceId,
    city: item.city ?? item.location.municipality,
    state: item.state ?? item.location.state,
    workMode: item.workMode ?? item.modality,
    opportunityType: item.opportunityType ?? item.category,
    vacanciesCount: item.vacanciesCount ?? (vacancyCount ? Number(vacancyCount) : undefined),
    isPcdEligible: item.isPcdEligible ?? (item.pcd ? true : undefined),
    expiresAt: item.expiresAt ?? item.deadline,
  };
}

export function clearExternalLifecycle() {
  firstSeenByItem.clear();
}

export function deduplicateExternalItems(items: DiscoveryItem[]) {
  const unique = new Map<string, DiscoveryItem>();
  for (const item of items) {
    const key = `${item.source}:${item.sourceId ?? item.id}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return Array.from(unique.values());
}

export function filterExternalItems(items: DiscoveryItem[], query: { q?: string; municipality?: string }) {
  const normalized = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const term = normalized(query.q?.trim() ?? "");
  const municipality = normalized(query.municipality?.trim() ?? "");
  return items.filter((item) => {
    const haystack = normalized(`${item.title} ${item.description} ${item.provider} ${item.location.municipality} ${item.tags.join(" ")}`);
    return (!term || haystack.includes(term)) && (!municipality || normalized(item.location.municipality) === municipality);
  });
}
