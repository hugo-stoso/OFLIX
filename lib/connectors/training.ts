import * as cheerio from "cheerio";
import type { DiscoveryItem, DiscoverySource } from "@/lib/domain";

export const SENAI_SE_URL = "https://www.se.senai.br/";
export const SENAI_SE_COURSES_URL = "https://www.se.senai.br/cursos";
export const FUNDACAO_BRADESCO_URL = "https://www.ev.org.br/Cursos";
export const EVG_CATALOG_URL = "https://www.escolavirtual.gov.br/catalogo";

export type SourceHealth = { source: DiscoverySource; count: number; collectedAt: string; stale: boolean; partial?: boolean; error?: string };
type CacheEntry = { expiresAt: number; items: DiscoveryItem[]; collectedAt: string };
const cache = new Map<string, CacheEntry>();

function text(value: string) { return value.replace(/\s+/g, " ").trim(); }
function absolute(href: string, base: string, origin: string) { try { const url = new URL(href, base); return url.origin === origin ? url.toString() : undefined; } catch { return undefined; } }
function slug(value: string) { return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function field(textValue: string, pattern: RegExp) { return textValue.match(pattern)?.[1]?.trim(); }

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
      item.location = { state: "SE", municipality: "Sergipe" };
      item.modality = modality || item.modality;
      item.duration = field(context, /(?:carga hor[aá]ria|dura[cç][aã]o)\s*[:：]\s*([^|.;]+)/iu);
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
    const isOpen = /turma\s+aberta|inscri(?:ções|coes)\s+abertas|matr[ií]culas\s+abertas/iu.test(context);
    const parsedDeadline = deadline ? deadline.replace(/[.-]/g, "/") : undefined;
    const id = `senai-${slug(sourceUrl)}`;
    if (items.some((item) => item.sourceUrl === sourceUrl)) return;
    items.push({ ...courseBase({ id, title, description: context, provider: "SENAI Sergipe", source: "SENAI_SE", sourceLabel: "SENAI Sergipe", sourceUrl, collectedAt, category: field(context, /[aá]rea\s*[:：]\s*([^|.;·]+)/iu) ?? "Formação profissional", tags: ["SENAI Sergipe"] }), location: { state: "SE", municipality: field(context, /(?:local|unidade|munic[ií]pio)\s*[:：]\s*([^|.;·]+)/iu) ?? "Sergipe" }, deadline: parsedDeadline, status: parsedDeadline && new Date(parsedDeadline.split("/").reverse().join("-")) < new Date() ? "Inscrições encerradas" : isOpen ? "Inscrições abertas" : "Disponível no catálogo", cost: /gratuit[oa]/iu.test(context) ? "Gratuito" : undefined, duration: field(context, /(?:carga hor[aá]ria|dura[cç][aã]o)\s*[:：]\s*([^|.;·]+)/iu) });
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
  const cached = cache.get(key); if (cached && cached.expiresAt > Date.now()) return { source, items: cached.items, collectedAt: cached.collectedAt, stale: false };
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try { const response = await fetch(url, { headers: { accept: "text/html" }, signal: controller.signal, cache: "no-store" }); if (!response.ok) throw new Error(`${source} ${response.status}`); const collectedAt = new Date().toISOString(); const items = parser(await response.text(), collectedAt); cache.set(key, { expiresAt: Date.now() + 15 * 60 * 1000, items, collectedAt }); return { source, items, collectedAt, stale: false }; }
  catch (error) { if (cached) return { source, items: cached.items, collectedAt: cached.collectedAt, stale: true, error: error instanceof Error ? error.message : `${source} indisponível` }; return { source, items: [], collectedAt: new Date().toISOString(), stale: true, error: error instanceof Error ? error.message : `${source} indisponível` }; }
  finally { clearTimeout(timer); }
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
