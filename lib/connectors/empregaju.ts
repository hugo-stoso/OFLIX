import { load } from "cheerio";
import type { DiscoveryItem, PcdAvailability } from "@/lib/domain";
import { deduplicateExternalItems, EXTERNAL_JOB_USER_AGENT, markExternalLifecycle, normalizeExternalFields, parseBrazilianDate, parseLocation, parseSalary, parseVacancies, stableExternalFingerprint, textFromHtml } from "@/lib/connectors/external-utils";

export const EMPREGAJU_HOST = "empregaju.aracaju.se.gov.br";
export const EMPREGAJU_PATH = "/cidadao/vagas";
export const EMPREGAJU_LIST_URL = `https://${EMPREGAJU_HOST}${EMPREGAJU_PATH}`;
export const EMPREGAJU_REGISTER_URL = `https://${EMPREGAJU_HOST}/register`;
export const EMPREGAJU_MAX_PAGES = 10;
export const EMPREGAJU_TIMEOUT_MS = 7_000;
export const EMPREGAJU_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
export const EMPREGAJU_CACHE_TTL_SECONDS = EMPREGAJU_CACHE_TTL_MS / 1000;

type EmpregAjuPage = { items: DiscoveryItem[]; nextUrl?: string; sawOpportunityMarkup: boolean };

export type EmpregAjuResult = {
  items: DiscoveryItem[];
  source: "EMPREGAJU";
  provider: "EmpregAju";
  collectedAt: string;
  stale: boolean;
  partial: boolean;
  pages: number;
  error?: string;
};

type FetchEmpregAjuOptions = { fetcher?: typeof fetch; timeoutMs?: number; now?: () => Date; maxPages?: number };
type CacheEntry = { expiresAt: number; result: EmpregAjuResult };

let cacheEntry: CacheEntry | undefined;
let lastSuccessfulResult: EmpregAjuResult | undefined;

function safeListUrl(rawValue: string | undefined) {
  try {
    const url = new URL(rawValue || EMPREGAJU_LIST_URL, EMPREGAJU_LIST_URL);
    if (url.protocol !== "https:" || url.hostname !== EMPREGAJU_HOST || url.pathname !== EMPREGAJU_PATH) return EMPREGAJU_LIST_URL;
    const page = url.searchParams.get("page");
    if (page && !/^\d+$/u.test(page)) return EMPREGAJU_LIST_URL;
    url.hash = "";
    return url.toString();
  } catch {
    return EMPREGAJU_LIST_URL;
  }
}

function safeApplicationUrl(rawValue: string | undefined) {
  try {
    const url = new URL(rawValue || EMPREGAJU_REGISTER_URL, EMPREGAJU_LIST_URL);
    if (url.protocol !== "https:" || url.hostname !== EMPREGAJU_HOST || url.pathname !== "/register") return EMPREGAJU_REGISTER_URL;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return EMPREGAJU_REGISTER_URL;
  }
}

function extractNextUrl(document: ReturnType<typeof load>) {
  const links = document("nav a[href], .pagination a[href], a[href*='page=']").toArray();
  for (const link of links) {
    const label = textFromHtml(document(link).html() ?? "").toLocaleLowerCase("pt-BR");
    const href = document(link).attr("href");
    if (/pr[oó]xim|next|^\d+$/u.test(label)) {
      const safe = safeListUrl(href);
      if (safe !== EMPREGAJU_LIST_URL || /page=\d+/u.test(safe)) return safe;
    }
  }
  return undefined;
}

function sourceIdFromCard(card: { find(selector: string): { first(): { attr(name: string): string | undefined } } }) {
  const onclick = card.find(".btn-detalhes[onclick]").first().attr("onclick") ?? "";
  const match = onclick.match(/verDetalhes\(\s*['"]?([A-Za-z0-9_-]+)['"]?\s*\)/iu);
  return match?.[1];
}

function contractTypeFromBadges(badges: string[]) {
  const value = badges.find((badge) => /clt|pj|est[aá]gio|tempor[aá]rio|aut[oô]nomo/iu.test(badge));
  if (!value) return undefined;
  if (/est[aá]gio/iu.test(value)) return "Estágio";
  if (/clt/iu.test(value)) return "CLT";
  if (/pj/iu.test(value)) return "PJ";
  if (/tempor[aá]rio/iu.test(value)) return "Temporário";
  if (/aut[oô]nomo/iu.test(value)) return "Autônomo";
  return value;
}

function modalityFromBadges(badges: string[]) {
  const value = badges.find((badge) => /presencial|remoto|h[ií]brido/iu.test(badge));
  if (!value) return undefined;
  if (/h[ií]brido/iu.test(value)) return "Híbrido";
  if (/remoto/iu.test(value)) return "Remoto";
  return "Presencial";
}

function pcdFromCard(title: string): PcdAvailability | undefined {
  return /\bPCD\b/iu.test(title) ? "exclusive" : undefined;
}

export function parseEmpregAjuPage(html: string, options: { pageUrl?: string; collectedAt?: string } = {}): EmpregAjuPage {
  const document = load(html);
  const collectedAt = options.collectedAt ?? new Date().toISOString();
  const items: DiscoveryItem[] = [];
  const cards = document(".vaga-card");

  cards.each((_, element) => {
    const card = document(element);
    const read = (selector: string) => textFromHtml(card.find(selector).first().html() ?? "");
    const title = read(".vaga-title");
    const provider = read(".empresa-tag") || "Empresa não informada";
    const description = read(".vaga-desc");
    const badges = card.find(".vaga-badge").toArray().map((badge) => textFromHtml(document(badge).html() ?? "")).filter(Boolean);
    const details = card.find(".vaga-detail-item span").toArray().map((detail) => textFromHtml(document(detail).html() ?? "")).filter(Boolean);
    const location = details.map(parseLocation).find(Boolean);
    if (!title || !location || location.state !== "SE") return;
    const sourceId = sourceIdFromCard(card) ?? `fingerprint-${stableExternalFingerprint([title, provider, location.municipality, description, details.join("|")])}`;
    const sourceUrl = EMPREGAJU_LIST_URL;
    const salaryData = parseSalary(card.text());
    const dateText = read(".vaga-card-footer small");
    const pcd = pcdFromCard(title);
    const status = read(".vaga-card-status") || undefined;
    const contractType = contractTypeFromBadges(badges);
    const modality = modalityFromBadges(badges);
    const item: DiscoveryItem = {
      id: `empregaju-${sourceId}`,
      kind: "external_job",
      title,
      description,
      category: "Emprego",
      provider,
      company: provider,
      location,
      source: "EMPREGAJU",
      sourceLabel: "EmpregAju",
      sourceId,
      sourceUrl,
      applicationUrl: safeApplicationUrl(card.find("a.btn-candidatar[href]").first().attr("href")),
      publishedAt: parseBrazilianDate(dateText),
      collectedAt,
      status,
      tags: ["EmpregAju", "Vaga externa", ...badges],
      ...salaryData,
      contractType,
      modality,
      vacancies: details.map(parseVacancies).find(Boolean),
      pcd,
    };
    items.push(normalizeExternalFields(item));
  });

  return { items: deduplicateExternalItems(items), nextUrl: extractNextUrl(document), sawOpportunityMarkup: cards.length > 0 };
}

export function clearEmpregAjuCache() {
  cacheEntry = undefined;
  lastSuccessfulResult = undefined;
}

function resultFrom(items: DiscoveryItem[], collectedAt: string, stale: boolean, partial: boolean, pages: number, error?: string): EmpregAjuResult {
  return { items, source: "EMPREGAJU", provider: "EmpregAju", collectedAt, stale, partial, pages, ...(error ? { error } : {}) };
}

export function isEmpregAjuEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.EMPREGAJU_ENABLED !== "false";
}

export async function fetchEmpregAjuOpportunities(options: FetchEmpregAjuOptions = {}): Promise<EmpregAjuResult> {
  const now = options.now ?? (() => new Date());
  const nowMs = now().getTime();
  if (cacheEntry && cacheEntry.expiresAt > nowMs) return cacheEntry.result;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? EMPREGAJU_TIMEOUT_MS;
  const maxPages = options.maxPages ?? EMPREGAJU_MAX_PAGES;
  const collectedAt = now().toISOString();
  let pageUrl = EMPREGAJU_LIST_URL;
  let pages = 0;
  let partial = false;
  let error: string | undefined;
  let items: DiscoveryItem[] = [];
  let receivedValidResponse = false;
  const visited = new Set<string>();

  while (pages < maxPages && !visited.has(pageUrl)) {
    visited.add(pageUrl);
    pages += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response = await fetcher(pageUrl, { headers: { accept: "text/html", "user-agent": EXTERNAL_JOB_USER_AGENT }, signal: controller.signal, next: { revalidate: EMPREGAJU_CACHE_TTL_SECONDS } });
      if (response.status >= 500 && response.status < 600) response = await fetcher(pageUrl, { headers: { accept: "text/html", "user-agent": EXTERNAL_JOB_USER_AGENT }, signal: controller.signal, next: { revalidate: EMPREGAJU_CACHE_TTL_SECONDS } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = parseEmpregAjuPage(await response.text(), { pageUrl, collectedAt });
      if (!page.sawOpportunityMarkup) throw new Error("HTML público sem cards estruturados do EmpregAju");
      receivedValidResponse = true;
      items = deduplicateExternalItems([...items, ...page.items.map((item) => markExternalLifecycle(item, collectedAt))]);
      if (!page.nextUrl || page.nextUrl === pageUrl || page.items.length === 0) break;
      pageUrl = page.nextUrl;
    } catch (collectionError) {
      partial = true;
      error = collectionError instanceof Error ? collectionError.message : "Falha desconhecida na coleta";
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (receivedValidResponse) {
    const result = resultFrom(items, collectedAt, false, partial, pages, error);
    lastSuccessfulResult = result;
    cacheEntry = { expiresAt: nowMs + EMPREGAJU_CACHE_TTL_MS, result };
    return result;
  }
  const fallbackError = "As vagas do EmpregAju não puderam ser atualizadas agora.";
  if (lastSuccessfulResult) return { ...lastSuccessfulResult, stale: true, partial: true, error: fallbackError, pages };
  return resultFrom([], collectedAt, true, true, pages, error ?? fallbackError);
}
