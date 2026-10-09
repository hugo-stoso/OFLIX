import { load } from "cheerio";
import type { DiscoveryItem } from "@/lib/domain";
import { deduplicateExternalItems, EXTERNAL_JOB_USER_AGENT, markExternalLifecycle, normalizeExternalFields, parseBrazilianDate, parseLocation, parseSalary, stableExternalFingerprint, textFromHtml } from "@/lib/connectors/external-utils";

export const IEL_SERGIPE_HOST = "carreiras.iel.org.br";
export const IEL_SERGIPE_PATH = "/SE";
export const IEL_SERGIPE_LIST_URL = `https://${IEL_SERGIPE_HOST}${IEL_SERGIPE_PATH}`;
export const IEL_SERGIPE_TIMEOUT_MS = 7_000;
export const IEL_SERGIPE_CACHE_TTL_MS = 4 * 60 * 60 * 1000;
export const IEL_SERGIPE_CACHE_TTL_SECONDS = IEL_SERGIPE_CACHE_TTL_MS / 1000;

type IelPage = { items: DiscoveryItem[]; sawOpportunityMarkup: boolean };

export type IelSergipeResult = {
  items: DiscoveryItem[];
  source: "IEL_SERGIPE";
  provider: "IEL Sergipe";
  collectedAt: string;
  stale: boolean;
  partial: boolean;
  pages: number;
  error?: string;
};

type FetchIelOptions = { fetcher?: typeof fetch; timeoutMs?: number; now?: () => Date };
type CacheEntry = { expiresAt: number; result: IelSergipeResult };

let cacheEntry: CacheEntry | undefined;
let lastSuccessfulResult: IelSergipeResult | undefined;

function safeDetailUrl(rawValue: string | undefined) {
  try {
    const url = new URL(rawValue || IEL_SERGIPE_LIST_URL, IEL_SERGIPE_LIST_URL);
    if (url.protocol !== "https:" || url.hostname !== IEL_SERGIPE_HOST || !/^\/SE\/vaga\/[A-Za-z0-9-]+\/\d+\/[A-Za-z0-9-]+$/u.test(url.pathname)) return IEL_SERGIPE_LIST_URL;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return IEL_SERGIPE_LIST_URL;
  }
}

function cardAnchors(document: ReturnType<typeof load>) {
  return document("a[href]").filter((_, element) => {
    try {
      const url = new URL(document(element).attr("href") ?? "", IEL_SERGIPE_LIST_URL);
      return url.protocol === "https:" && url.hostname === IEL_SERGIPE_HOST && /^\/SE\/vaga\/[A-Za-z0-9-]+\/\d+\/[A-Za-z0-9-]+$/u.test(url.pathname);
    } catch {
      return false;
    }
  });
}

function iconParentText(card: ReturnType<ReturnType<typeof load>>, iconName: string) {
  const icon = card.find(`svg[data-icon='${iconName}']`).first();
  if (!icon.length) return "";
  let current = icon.parent();
  for (let level = 0; level < 4 && current.length; level += 1) {
    const text = textFromHtml(current.html() ?? "");
    if (text) return text;
    current = current.parent();
  }
  return "";
}

function contractType(category: string) {
  if (/est[aá]gio/iu.test(category)) return "Estágio";
  if (/aprendiz/iu.test(category)) return "Aprendiz";
  return category || undefined;
}

export function parseIelSergipePage(html: string, options: { collectedAt?: string } = {}): IelPage {
  const document = load(html);
  const collectedAt = options.collectedAt ?? new Date().toISOString();
  const items: DiscoveryItem[] = [];
  const cards = cardAnchors(document);

  cards.each((_, element) => {
    const card = document(element);
    const headings = card.find("h1, h2, h3").toArray().map((heading) => textFromHtml(document(heading).html() ?? "")).filter(Boolean);
    const category = headings[0] ?? "";
    const publishedAt = parseBrazilianDate(headings[1] ?? "");
    const title = textFromHtml(card.find("span.text-lg").first().html() ?? "") || headings[2] || "";
    const company = textFromHtml(card.find("div.flex.flex-col.mb-4 span").last().html() ?? "") || undefined;
    const location = parseLocation(iconParentText(card, "location-dot"));
    if (!title || !location || location.state !== "SE") return;
    const sourceUrl = safeDetailUrl(card.attr("href"));
    const sourceId = sourceUrl.match(/\/([0-9]+)\/[A-Za-z0-9-]+$/u)?.[1] ?? `fingerprint-${stableExternalFingerprint([title, company ?? "", location.municipality, publishedAt ?? "", sourceUrl])}`;
    const modality = iconParentText(card, "briefcase") || undefined;
    const salaryData = parseSalary(iconParentText(card, "dollar-sign"));
    const item: DiscoveryItem = {
      id: `iel-sergipe-${sourceId}`,
      kind: "external_job",
      title,
      description: "Consulte os requisitos, benefícios e processo de candidatura na página original.",
      category: "Emprego",
      provider: company ?? "Empresa não informada",
      company,
      location,
      source: "IEL_SERGIPE",
      sourceLabel: "IEL Sergipe",
      sourceId,
      sourceUrl,
      applicationUrl: sourceUrl,
      publishedAt,
      collectedAt,
      status: "Publicado",
      tags: ["IEL Sergipe", "Vaga externa", category].filter(Boolean),
      ...salaryData,
      contractType: contractType(category),
      modality,
    };
    items.push(normalizeExternalFields(item));
  });

  return { items: deduplicateExternalItems(items), sawOpportunityMarkup: cards.length > 0 };
}

export function clearIelSergipeCache() {
  cacheEntry = undefined;
  lastSuccessfulResult = undefined;
}

function resultFrom(items: DiscoveryItem[], collectedAt: string, stale: boolean, partial: boolean, pages: number, error?: string): IelSergipeResult {
  return { items, source: "IEL_SERGIPE", provider: "IEL Sergipe", collectedAt, stale, partial, pages, ...(error ? { error } : {}) };
}

export function isIelSergipeEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.IEL_SERGIPE_ENABLED !== "false";
}

export async function fetchIelSergipeOpportunities(options: FetchIelOptions = {}): Promise<IelSergipeResult> {
  const now = options.now ?? (() => new Date());
  const nowMs = now().getTime();
  if (cacheEntry && cacheEntry.expiresAt > nowMs) return cacheEntry.result;
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? IEL_SERGIPE_TIMEOUT_MS;
  const collectedAt = now().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetcher(IEL_SERGIPE_LIST_URL, { headers: { accept: "text/html", "user-agent": EXTERNAL_JOB_USER_AGENT }, signal: controller.signal, next: { revalidate: IEL_SERGIPE_CACHE_TTL_SECONDS } });
    if (response.status >= 500 && response.status < 600) response = await fetcher(IEL_SERGIPE_LIST_URL, { headers: { accept: "text/html", "user-agent": EXTERNAL_JOB_USER_AGENT }, signal: controller.signal, next: { revalidate: IEL_SERGIPE_CACHE_TTL_SECONDS } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const page = parseIelSergipePage(await response.text(), { collectedAt });
    if (!page.sawOpportunityMarkup) throw new Error("HTML público sem cards estruturados do IEL Sergipe");
    const result = resultFrom(page.items.map((item) => markExternalLifecycle(item, collectedAt)), collectedAt, false, false, 1);
    lastSuccessfulResult = result;
    cacheEntry = { expiresAt: nowMs + IEL_SERGIPE_CACHE_TTL_MS, result };
    return result;
  } catch (collectionError) {
    const error = collectionError instanceof Error ? collectionError.message : "Falha desconhecida na coleta";
    if (lastSuccessfulResult) return { ...lastSuccessfulResult, stale: true, partial: true, error: "As vagas do IEL Sergipe não puderam ser atualizadas agora." };
    return resultFrom([], collectedAt, true, true, 1, error);
  } finally {
    clearTimeout(timeout);
  }
}
