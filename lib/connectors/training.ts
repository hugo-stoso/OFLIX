import https from "node:https";
import tls from "node:tls";
import * as cheerio from "cheerio";
import type { DiscoveryItem, DiscoverySource } from "@/lib/domain";

export const SENAI_SE_URL = "https://www.se.senai.br/";
export const SENAI_SE_COURSES_URL = "https://www.se.senai.br/cursos";
export const FUNDACAO_BRADESCO_URL = "https://www.ev.org.br/Cursos";
export const EVG_CATALOG_URL = "https://www.escolavirtual.gov.br/catalogo";

export type SourceHealth = { source: DiscoverySource; count: number; collectedAt: string; stale: boolean; partial?: boolean; error?: string; causeCode?: string; transport?: "fetch" | "system-ca" };
type CacheEntry = { expiresAt: number; items: DiscoveryItem[]; collectedAt: string; transport: "fetch" | "system-ca" };
const cache = new Map<string, CacheEntry>();

function text(value: string) { return value.replace(/\s+/g, " ").trim(); }
function absolute(href: string, base: string, origin: string) { try { const url = new URL(href, base); return url.origin === origin ? url.toString() : undefined; } catch { return undefined; } }
function slug(value: string) { return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function field(textValue: string, pattern: RegExp) { return textValue.match(pattern)?.[1]?.trim(); }
function errorCode(error: unknown) {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: unknown; cause?: { code?: unknown } };
  return typeof candidate.cause?.code === "string" ? candidate.cause.code : typeof candidate.code === "string" ? candidate.code : undefined;
}
function isCertificateVerificationError(error: unknown) {
  const code = errorCode(error);
  if (["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN"].includes(code ?? "")) return true;
  return error instanceof Error && /certificate|ca|tls/iu.test(`${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`);
}
function systemCaCertificates() {
  try {
    return typeof tls.getCACertificates === "function" ? tls.getCACertificates("system") : [];
  } catch {
    return [];
  }
}
function requestWithSystemCa(url: string, options: { headers: Record<string, string>; timeoutMs: number }, redirects = 0): Promise<Response> {
  const ca = systemCaCertificates();
  if (!ca.length) return Promise.reject(new Error("Node system CA store unavailable"));
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: options.headers, ca, timeout: options.timeoutMs }, (response) => {
      const location = response.headers.location;
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && location && redirects < 3) {
        response.resume();
        const nextUrl = new URL(location, url);
        if (nextUrl.protocol !== "https:") return reject(new Error("Catalog redirect is not HTTPS"));
        requestWithSystemCa(nextUrl.toString(), options, redirects + 1).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      response.on("end", () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(response.headers)) {
          if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 502, headers }));
      });
    });
    request.on("timeout", () => request.destroy(new Error("Catalog request timed out")));
    request.on("error", reject);
  });
}
async function fetchCatalogPage(url: string, timeoutMs: number) {
  const headers = { accept: "text/html" };
  try {
    return { response: await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" }), transport: "fetch" as const };
  } catch (error) {
    if (!isCertificateVerificationError(error)) throw error;
    return { response: await requestWithSystemCa(url, { headers, timeoutMs }), transport: "system-ca" as const };
  }
}
function senaiDuration(value: string) { return value.match(/carga hor[aá]ria\s*[:：]\s*([0-9]+(?:[,.][0-9]+)?(?:\s*(?:h|horas?))?)/iu)?.[1]?.trim(); }
function senaiMunicipality(value: string) { return field(value, /(?:munic[ií]pio|cidade)\s*[:：]\s*([^|.;·]+)/iu) ?? "Não informado"; }
function senaiStatus(value: string, deadline?: string) {
  if (deadline) {
    const [day, month, year] = deadline.split(/[/.]/u).map(Number);
    if (year && month && day && Date.UTC(year < 100 ? 2000 + year : year, month - 1, day) < Date.now()) return "Inscrições encerradas";
  }
  return /turma\s+(?:est[aá]\s+)?aberta|inscri(?:ções|coes)\s+(?:est[aã]o\s+)?abertas|matr[ií]culas\s+(?:est[aã]o\s+)?abertas/iu.test(value) ? "Inscrições abertas" : "Disponível no catálogo";
}

function courseBase(options: { id: string; title: string; description: string; provider: string; source: DiscoverySource; sourceLabel: string; sourceUrl: string; collectedAt: string; category: string; tags: string[] }): DiscoveryItem {
  return { id: options.id, kind: "course", title: options.title, description: options.description || `Curso público disponibilizado por ${options.provider}.`, category: options.category, provider: options.provider, location: { state: "SE", municipality: "Online" }, source: options.source, sourceLabel: options.sourceLabel, sourceId: options.id, sourceUrl: options.sourceUrl, collectedAt: options.collectedAt, status: "Disponível no catálogo", modality: "Online", tags: options.tags };
}

export function parseSenaiCourses(html: string, collectedAt = new Date().toISOString()): DiscoveryItem[] {
  const $ = cheerio.load(html); const items: DiscoveryItem[] = [];
  const officialCards = $(".itemCurso");
  if (officialCards.length > 0) {
    officialCards.each((_, element) => {
      const card = $(element);
      const title = text(card.find(".descricao h5").first().text());
      const detailUrl = card.find(".descricao a[href], .saibaMais a[href]").first().attr("href");
      const sourceUrl = detailUrl && /^https:\/\/app\.fies\.org\.br\/MatriculaWebSENAI\//iu.test(detailUrl) ? detailUrl : undefined;
      if (!sourceUrl || !title) return;
      const context = text(card.text());
      const category = text(card.find(".descricao > span").first().text()) || "Formação profissional";
      const modality = text(card.find(".modalidade").first().text()) || undefined;
      const applicationUrl = card.find(".btMatricule-se a[href]").first().attr("href");
      const item = courseBase({ id: `senai-${slug(sourceUrl)}`, title, description: context, provider: "SENAI Sergipe", source: "SENAI_SE", sourceLabel: "SENAI Sergipe", sourceUrl, collectedAt, category, tags: ["SENAI Sergipe", ...(modality ? [modality] : [])] });
      item.location = { state: "SE", municipality: senaiMunicipality(context) };
      item.modality = modality || item.modality;
      item.duration = senaiDuration(context) ?? field(context, /dura[cç][aã]o\s*[:：]\s*([^|.;]+)/iu);
      const deadline = context.match(/(?:inscri(?:ções|coes)|matr[ií]culas)\s+at[eé]\s+([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4})/iu)?.[1];
      item.deadline = deadline;
      item.status = senaiStatus(context, deadline);
      if (applicationUrl && /^https:\/\/app\.fies\.org\.br\/MatriculaWebSENAI\//iu.test(applicationUrl)) item.applicationUrl = applicationUrl;
      if (/gratuit[oa]/iu.test(context)) item.cost = "Gratuito";
      if (!items.some((current) => current.sourceUrl === item.sourceUrl)) items.push(item);
    });
    return items;
  }
  $("a").each((_, element) => {
    const title = text($(element).text()); const href = $(element).attr("href");
    const sourceUrl = href ? absolute(href, SENAI_SE_COURSES_URL, "https://www.se.senai.br") : undefined;
    if (!sourceUrl || !title || !/curso|qualifica|aperfei|capacita/iu.test(`${title} ${sourceUrl}`)) return;
    const context = text($(element).closest("li,article,section,div").first().text() || $(element).parent().text());
    const deadline = context.match(/[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}/u)?.[0];
    const parsedDeadline = deadline ? deadline.replace(/[.-]/g, "/") : undefined;
    const id = `senai-${slug(sourceUrl)}`;
    if (items.some((item) => item.sourceUrl === sourceUrl)) return;
    items.push({ ...courseBase({ id, title, description: context, provider: "SENAI Sergipe", source: "SENAI_SE", sourceLabel: "SENAI Sergipe", sourceUrl, collectedAt, category: field(context, /[aá]rea\s*[:：]\s*([^|.;·]+)/iu) ?? "Formação profissional", tags: ["SENAI Sergipe"] }), location: { state: "SE", municipality: field(context, /(?:local|unidade|munic[ií]pio|cidade)\s*[:：]\s*([^|.;·]+)/iu) ?? "Não informado" }, deadline: parsedDeadline, status: senaiStatus(context, parsedDeadline), cost: /gratuit[oa]/iu.test(context) ? "Gratuito" : undefined, duration: senaiDuration(context) ?? field(context, /dura[cç][aã]o\s*[:：]\s*([^|.;·]+)/iu) });
  });
  return items;
}

export function parseFundacaoBradescoCourses(html: string, collectedAt = new Date().toISOString()): DiscoveryItem[] {
  const $ = cheerio.load(html); const items: DiscoveryItem[] = [];
  $("a").each((_, element) => {
    const title = text($(element).text()); const href = $(element).attr("href");
    const sourceUrl = href ? absolute(href, FUNDACAO_BRADESCO_URL, "https://www.ev.org.br") : undefined;
    if (!sourceUrl || !title || !/curso|trilha|formação|formacao/iu.test(`${title} ${sourceUrl}`)) return;
    if (items.some((item) => item.sourceUrl === sourceUrl)) return;
    const context = text($(element).closest("li,article,section,div").first().text() || $(element).parent().text());
    items.push({ ...courseBase({ id: `bradesco-${slug(sourceUrl)}`, title, description: context, provider: "Fundação Bradesco — Escola Virtual", source: "FUNDACAO_BRADESCO_EV", sourceLabel: "Fundação Bradesco — Escola Virtual", sourceUrl, collectedAt, category: "Educação e formação", tags: ["Fundação Bradesco", "Online"] }), cost: /gratuit[oa]/iu.test(context) ? "Gratuito" : undefined, duration: field(context, /(?:dura[cç][aã]o|carga hor[aá]ria)\s*[:：]\s*([^|.;]+)/iu), status: "Disponível no catálogo" });
  });
  return items;
}

export function parseEvgCourses(html: string, collectedAt = new Date().toISOString()): DiscoveryItem[] {
  const $ = cheerio.load(html); const items: DiscoveryItem[] = [];
  $("a").each((_, element) => {
    const title = text($(element).text()); const href = $(element).attr("href");
    const sourceUrl = href ? absolute(href, EVG_CATALOG_URL, "https://www.escolavirtual.gov.br") : undefined;
    if (!sourceUrl || !title || title.length < 5 || /cat[aá]logo|entrar|login|csv/iu.test(title)) return;
    if (items.some((item) => item.sourceUrl === sourceUrl)) return;
    const context = text($(element).closest("li,article,section,div").first().text() || $(element).parent().text());
    items.push({ ...courseBase({ id: `evg-${slug(sourceUrl)}`, title, description: context, provider: field(context, /conteudista\s*[:：]\s*([^|.;]+)/iu) ?? "Escola Virtual.Gov", source: "EVG", sourceLabel: "Escola Virtual.Gov", sourceUrl, collectedAt, category: "Formação pública", tags: ["EV.G", "Online"] }), duration: field(context, /(?:carga hor[aá]ria|dura[cç][aã]o)\s*[:：]\s*([^|.;]+)/iu), status: "Disponível no catálogo" });
  });
  return items;
}

export function parseEvgCsv(csv: string, collectedAt = new Date().toISOString()): DiscoveryItem[] {
  const items: Array<DiscoveryItem | null> = csv.split(/\r?\n/).slice(1).map((line) => line.split(",")).map((columns) => {
    const [title, provider, url, duration, theme] = columns.map((value) => value?.trim().replace(/^"|"$/g, ""));
    if (!title || !url || !/^https:\/\/www\.escolavirtual\.gov\.br\//u.test(url)) return null;
    return { ...courseBase({ id: `evg-${slug(url)}`, title, description: theme ?? "Curso disponível no catálogo público da Escola Virtual.Gov.", provider: provider || "Escola Virtual.Gov", source: "EVG", sourceLabel: "Escola Virtual.Gov", sourceUrl: url, collectedAt, category: theme || "Formação pública", tags: ["EV.G", "Online"] }), ...(duration ? { duration } : {}) };
  });
  return items.filter((item): item is DiscoveryItem => item !== null);
}

async function fetchCatalog(key: string, url: string, parser: (html: string, collectedAt: string) => DiscoveryItem[], source: DiscoverySource, options: { timeoutMs?: number } = {}) {
  const cached = cache.get(key); if (cached && cached.expiresAt > Date.now()) return { source, items: cached.items, collectedAt: cached.collectedAt, stale: false, transport: cached.transport };
  try { const { response, transport } = await fetchCatalogPage(url, options.timeoutMs ?? 8000); if (!response.ok) throw new Error(`${source} ${response.status}`); const collectedAt = new Date().toISOString(); const items = parser(await response.text(), collectedAt); cache.set(key, { expiresAt: Date.now() + 15 * 60 * 1000, items, collectedAt, transport }); return { source, items, collectedAt, stale: false, transport }; }
  catch (error) { const causeCode = errorCode(error); if (cached) return { source, items: cached.items, collectedAt: cached.collectedAt, stale: true, error: error instanceof Error ? error.message : `${source} indisponível`, causeCode }; return { source, items: [], collectedAt: new Date().toISOString(), stale: true, error: error instanceof Error ? error.message : `${source} indisponível`, causeCode }; }
}

export async function fetchTrainingSources(options: { timeoutMs?: number } = {}) {
  const results = await Promise.all([
    fetchCatalog("senai", SENAI_SE_COURSES_URL, parseSenaiCourses, "SENAI_SE", options),
    fetchCatalog("bradesco", FUNDACAO_BRADESCO_URL, parseFundacaoBradescoCourses, "FUNDACAO_BRADESCO_EV", options),
    fetchCatalog("evg", EVG_CATALOG_URL, parseEvgCourses, "EVG", options),
  ]);
  const items = Array.from(new Map(results.flatMap((result) => result.items).map((item) => [item.sourceUrl, item])).values());
  return { items, sources: results.map(({ items: sourceItems, ...health }) => ({ ...health, count: sourceItems.length })), stale: results.some((result) => result.stale) };
}
