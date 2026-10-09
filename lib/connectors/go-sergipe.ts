import { createHash } from "node:crypto";
import { load } from "cheerio";
import type { DiscoveryItem, PcdAvailability } from "@/lib/domain";

export const GO_SERGIPE_HOST = "gosergipe.se.gov.br";
export const GO_SERGIPE_PATH = "/oportunidades";
export const GO_SERGIPE_LIST_URL = `https://${GO_SERGIPE_HOST}${GO_SERGIPE_PATH}`;
export const GO_SERGIPE_API_PATH = "/api/oportunidades";
export const GO_SERGIPE_API_URL = `https://${GO_SERGIPE_HOST}${GO_SERGIPE_API_PATH}`;
export const GO_SERGIPE_MAX_PAGES = 25;
export const GO_SERGIPE_TIMEOUT_MS = 7_000;
export const GO_SERGIPE_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
export const GO_SERGIPE_CACHE_TTL_SECONDS = GO_SERGIPE_CACHE_TTL_MS / 1000;
export const GO_SERGIPE_USER_AGENT = "OFLIX/0.1 (+https://oflix-six.vercel.app)";

type GoSergipePage = {
  items: DiscoveryItem[];
  nextUrl?: string;
  sawOpportunityMarkup: boolean;
  ignoredOutsideState: number;
};

type GoSergipeApiRecord = Record<string, unknown>;

export type GoSergipeResult = {
  items: DiscoveryItem[];
  source: "GO_SERGIPE";
  provider: "GO Sergipe";
  collectedAt: string;
  stale: boolean;
  partial: boolean;
  pages: number;
  error?: string;
};

type FetchGoSergipeOptions = {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => Date;
};

type CacheEntry = { expiresAt: number; result: GoSergipeResult };

let cacheEntry: CacheEntry | undefined;
let lastSuccessfulResult: GoSergipeResult | undefined;

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/[\t\r\n]+/g, " ").replace(/ {2,}/g, " ").trim();
}

function textFromHtml(html: string) {
  if (!html) return "";
  const spacedHtml = html.replace(/<\/?(?:br|p|div|li|strong|span|a)[^>]*>/giu, " ");
  const $ = load(`<div>${spacedHtml}</div>`);
  $("script, style, noscript, iframe, form").remove();
  return normalizeWhitespace($("div").text());
}

function parsePublishedDate(value: string) {
  const match = value.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function scalarText(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return textFromHtml(String(value));
}

function apiRecordText(record: GoSergipeApiRecord, key: string) {
  return scalarText(record[key]);
}

function apiRecordId(record: GoSergipeApiRecord) {
  const value = record.id;
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).trim();
  return /^[A-Za-z0-9_-]+$/u.test(normalized) ? normalized : undefined;
}

function apiRecordVacancies(record: GoSergipeApiRecord) {
  const value = record.opportunities_available;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return `${value} ${value === 1 ? "vaga" : "vagas"}`;
  const text = scalarText(value);
  return text || undefined;
}

function apiRecordPcd(record: GoSergipeApiRecord): PcdAvailability | undefined {
  if (record.pcd_exclusive === true) return "exclusive";
  if (record.pcd_impediments === true) return "also_available";
  return undefined;
}

function apiRecordCbo(record: GoSergipeApiRecord) {
  if (!isRecord(record.cbo)) return { occupationCode: undefined, occupationLabel: undefined };
  const occupationCode = apiRecordText(record.cbo, "code") || undefined;
  const occupationLabel = apiRecordText(record.cbo, "name") || undefined;
  return { occupationCode, occupationLabel };
}

function apiPageUrl(page: number) {
  const url = new URL(GO_SERGIPE_API_URL);
  url.search = new URLSearchParams({
    source: "",
    code_ibge: "",
    q: "",
    page: String(page),
    status: "aberta",
    pcd_exclusive: "false",
    pcd_inclusive: "false",
    contract_type: "",
    schooling: "",
    for_me: "",
    no_experience: "",
    code_uf: "SE",
  }).toString();
  return url.toString();
}

function parseLocation(value: string) {
  const match = normalizeWhitespace(value).match(/^(.+?)\s*[-–—]\s*([A-Za-z]{2})$/u);
  if (!match) return undefined;
  return { municipality: normalizeWhitespace(match[1]), state: match[2].toUpperCase() };
}

function parsePcd(value: string): PcdAvailability | undefined {
  const normalized = value.toLocaleLowerCase("pt-BR");
  if (/vaga\s+exclusiv[ae]\s+para\s+pcd/.test(normalized)) return "exclusive";
  if (/vaga\s+tamb[eé]m\s+para\s+pcd/.test(normalized)) return "also_available";
  return undefined;
}

function stableFingerprint(fields: string[]) {
  return createHash("sha256").update(fields.join("|")).digest("hex").slice(0, 20);
}

function safeGoSergipeUrl(rawValue: string | undefined, allowedPath: "list" | "detail" = "list") {
  if (!rawValue) return GO_SERGIPE_LIST_URL;
  try {
    const url = new URL(rawValue, GO_SERGIPE_LIST_URL);
    const pathIsAllowed = allowedPath === "list" ? url.pathname === GO_SERGIPE_PATH : /^\/detalheOportunidades\/[A-Za-z0-9_-]+$/u.test(url.pathname);
    if (url.protocol !== "https:" || url.hostname !== GO_SERGIPE_HOST || !pathIsAllowed) return GO_SERGIPE_LIST_URL;
    url.hash = "";
    return url.toString();
  } catch {
    return GO_SERGIPE_LIST_URL;
  }
}

function safeNextUrl(rawValue: string | undefined) {
  if (!rawValue) return undefined;
  try {
    const url = new URL(rawValue, GO_SERGIPE_LIST_URL);
    if (url.protocol !== "https:" || url.hostname !== GO_SERGIPE_HOST || url.pathname !== GO_SERGIPE_PATH) return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function safeApiNextUrl(rawValue: unknown) {
  if (typeof rawValue !== "string" || !rawValue) return undefined;
  try {
    const url = new URL(rawValue, GO_SERGIPE_API_URL);
    if (url.protocol !== "https:" || url.hostname !== GO_SERGIPE_HOST || url.pathname !== GO_SERGIPE_API_PATH) return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function extractNextUrl($: ReturnType<typeof load>) {
  const candidates = $("a[rel='next'], a.next, a[aria-label], .pagination a").toArray();
  for (const candidate of candidates) {
    const rel = ($(candidate).attr("rel") ?? "").toLocaleLowerCase("pt-BR");
    const aria = ($(candidate).attr("aria-label") ?? "").toLocaleLowerCase("pt-BR");
    const text = textFromHtml($(candidate).html() ?? "").toLocaleLowerCase("pt-BR");
    if (rel === "next" || /próxim|proxim|next/.test(`${aria} ${text}`)) return safeNextUrl($(candidate).attr("href"));
  }
  return undefined;
}

function sourceIdFromCard($card: ReturnType<ReturnType<typeof load>>) {
  const href = $card.find("a.ver-mais[href]").first().attr("href");
  if (!href) return undefined;
  try {
    const url = new URL(href, GO_SERGIPE_LIST_URL);
    if (url.protocol !== "https:" || url.hostname !== GO_SERGIPE_HOST) return undefined;
    return url.pathname.match(/^\/detalheOportunidades\/([A-Za-z0-9_-]+)$/u)?.[1];
  } catch {
    return undefined;
  }
}

export function parseGoSergipePage(html: string, options: { pageUrl?: string; collectedAt?: string } = {}): GoSergipePage {
  const $ = load(html);
  const collectedAt = options.collectedAt ?? new Date().toISOString();
  const items: DiscoveryItem[] = [];
  let ignoredOutsideState = 0;
  const cards = $(".card.card-oportunidade");

  cards.each((_, element) => {
    const $card = $(element);
    const read = (selector: string) => textFromHtml($card.find(selector).first().html() ?? "");
    const title = read(".titulo-vaga");
    const locationText = $card.find(".card-o-info .local-vaga").toArray().map((node) => textFromHtml($(node).html() ?? "")).find((value) => parseLocation(value));
    const location = locationText ? parseLocation(locationText) : undefined;
    if (!title || !location) return;
    if (location.state !== "SE") {
      ignoredOutsideState += 1;
      return;
    }

    const provider = read(".header-c .local-vaga") || read(".local-vaga");
    const description = read(".descricao-vaga");
    const dateText = read(".created-at");
    const vacancyText = $card.find(".card-o-info .local-vaga").toArray().map((node) => textFromHtml($(node).html() ?? "")).find((value) => /\b\d+\s+vagas?\b/i.test(value));
    const salaryText = read(".card-footer p").replace(/^salário\s*:\s*/iu, "").trim();
    const salary = salaryText && !/não informado/i.test(salaryText) ? salaryText : undefined;
    const pcd = parsePcd(read(".pcd-badge"));
    const publicId = sourceIdFromCard($card);
    const sourceId = publicId ?? `fingerprint-${stableFingerprint([title, provider, location.municipality, dateText, vacancyText ?? ""])}`;
    const href = $card.find("a.ver-mais[href]").first().attr("href");
    const sourceUrl = publicId ? safeGoSergipeUrl(href, "detail") : safeGoSergipeUrl(options.pageUrl ?? GO_SERGIPE_LIST_URL, "list");

    items.push({
      id: `go-sergipe-${sourceId}`,
      kind: "external_job",
      title,
      description,
      category: "Emprego",
      provider: provider || "Empresa não informada",
      location,
      source: "GO_SERGIPE",
      sourceLabel: "GO Sergipe",
      sourceId,
      sourceUrl,
      publishedAt: parsePublishedDate(dateText),
      collectedAt,
      tags: ["GO Sergipe", "Vaga externa", ...(pcd ? ["PcD"] : [])],
      salary,
      pcd,
      vacancies: vacancyText,
    });
  });

  return { items: deduplicateGoSergipeItems(items), nextUrl: extractNextUrl($), sawOpportunityMarkup: cards.length > 0, ignoredOutsideState };
}

export function parseGoSergipeApiResponse(payload: unknown, options: { collectedAt?: string } = {}): GoSergipePage {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return { items: [], sawOpportunityMarkup: false, ignoredOutsideState: 0 };
  const collectedAt = options.collectedAt ?? new Date().toISOString();
  const items: DiscoveryItem[] = [];
  let ignoredOutsideState = 0;

  for (const value of payload.results) {
    if (!isRecord(value)) continue;
    const record = value as GoSergipeApiRecord;
    const ibge = isRecord(record.ibge_code) ? record.ibge_code : {};
    const municipality = scalarText(ibge.name);
    const state = scalarText(ibge.state).toUpperCase();
    const title = apiRecordText(record, "short_description");
    if (!title || !municipality || !state) continue;
    if (state !== "SE") {
      ignoredOutsideState += 1;
      continue;
    }

    const provider = apiRecordText(record, "company_name") || "Empresa não informada";
    const description = apiRecordText(record, "description");
    const dateText = apiRecordText(record, "created_on");
    const publicId = apiRecordId(record);
    const sourceId = publicId ?? `fingerprint-${stableFingerprint([title, provider, municipality, dateText])}`;
    const { occupationCode, occupationLabel } = apiRecordCbo(record);
    const pcd = apiRecordPcd(record);
    const salary = apiRecordText(record, "salary") || undefined;
    const contractType = apiRecordText(record, "contract_type") || undefined;
    const education = apiRecordText(record, "schooling") || undefined;

    items.push({
      id: `go-sergipe-${sourceId}`,
      kind: "external_job",
      title,
      description,
      category: "Emprego",
      provider,
      location: { state, municipality },
      source: "GO_SERGIPE",
      sourceLabel: "GO Sergipe",
      sourceId,
      sourceUrl: publicId ? safeGoSergipeUrl(`/detalheOportunidades/${publicId}`, "detail") : GO_SERGIPE_LIST_URL,
      publishedAt: parsePublishedDate(dateText),
      deadline: parsePublishedDate(apiRecordText(record, "limit_date")),
      collectedAt,
      status: apiRecordText(record, "status") || undefined,
      tags: ["GO Sergipe", "Vaga externa", ...(pcd ? ["PcD"] : [])],
      salary,
      contractType,
      education,
      vacancies: apiRecordVacancies(record),
      pcd,
      occupationCode,
      occupationLabel,
    });
  }

  return { items: deduplicateGoSergipeItems(items), nextUrl: safeApiNextUrl(payload.next), sawOpportunityMarkup: true, ignoredOutsideState };
}

export function deduplicateGoSergipeItems(items: DiscoveryItem[]) {
  const unique = new Map<string, DiscoveryItem>();
  for (const item of items) {
    if (item.source !== "GO_SERGIPE") continue;
    const key = `${item.source}:${item.sourceId ?? item.id}`;
    if (!unique.has(key)) unique.set(key, item);
  }
  return Array.from(unique.values());
}

export function isGoSergipeEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.GO_SERGIPE_ENABLED !== "false";
}

function resultFrom(items: DiscoveryItem[], collectedAt: string, stale: boolean, partial: boolean, pages: number, error?: string): GoSergipeResult {
  return { items, source: "GO_SERGIPE", provider: "GO Sergipe", collectedAt, stale, partial, pages, ...(error ? { error } : {}) };
}

export function clearGoSergipeCache() {
  cacheEntry = undefined;
  lastSuccessfulResult = undefined;
}

export async function fetchGoSergipeOpportunities(options: FetchGoSergipeOptions = {}): Promise<GoSergipeResult> {
  const now = options.now ?? (() => new Date());
  const nowMs = now().getTime();
  if (cacheEntry && cacheEntry.expiresAt > nowMs) return cacheEntry.result;

  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? GO_SERGIPE_TIMEOUT_MS;
  const collectedAt = now().toISOString();
  const startedAt = Date.now();
  let pageUrl = apiPageUrl(1);
  let pages = 0;
  let partial = false;
  let error: string | undefined;
  let items: DiscoveryItem[] = [];
  let receivedValidResponse = false;
  const visited = new Set<string>();

  console.info(`[go-sergipe] coleta iniciada url=${GO_SERGIPE_API_URL} state=SE`);
  while (pages < GO_SERGIPE_MAX_PAGES && !visited.has(pageUrl)) {
    visited.add(pageUrl);
    pages += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(pageUrl, {
        headers: { accept: "application/json", "user-agent": GO_SERGIPE_USER_AGENT },
        signal: controller.signal,
        next: { revalidate: GO_SERGIPE_CACHE_TTL_SECONDS },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const page = parseGoSergipeApiResponse(await response.json(), { collectedAt });
      if (!page.sawOpportunityMarkup) throw new Error("Resposta JSON pública sem lista estruturada de oportunidades");
      receivedValidResponse = true;
      items = deduplicateGoSergipeItems([...items, ...page.items]);
      const nextUrl = page.nextUrl;
      if (!nextUrl || nextUrl === pageUrl || page.items.length === 0) break;
      pageUrl = nextUrl;
    } catch (collectionError) {
      partial = true;
      error = collectionError instanceof Error ? collectionError.message : "Falha desconhecida na coleta";
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  const durationMs = Date.now() - startedAt;
  console.info(`[go-sergipe] coleta finalizada pages=${pages} items=${items.length} durationMs=${durationMs} partial=${partial}`);
  if (receivedValidResponse) {
    const result = resultFrom(items, collectedAt, false, partial, pages, error);
    lastSuccessfulResult = result;
    cacheEntry = { expiresAt: nowMs + GO_SERGIPE_CACHE_TTL_MS, result };
    return result;
  }

  const fallbackError = "As vagas do GO Sergipe não puderam ser atualizadas agora.";
  if (lastSuccessfulResult) {
    return { ...lastSuccessfulResult, stale: true, partial: true, error: fallbackError, pages };
  }
  return resultFrom([], collectedAt, true, true, pages, error ?? fallbackError);
}

export function filterGoSergipeItems(items: DiscoveryItem[], query: { q?: string; municipality?: string }) {
  const normalized = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const term = normalized(query.q?.trim() ?? "");
  const municipality = normalized(query.municipality?.trim() ?? "");
  return items.filter((item) => {
    const haystack = normalized(`${item.title} ${item.description} ${item.provider} ${item.location.municipality}`);
    return (!term || haystack.includes(term)) && (!municipality || normalized(item.location.municipality) === municipality);
  });
}
