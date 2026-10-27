import * as cheerio from "cheerio";
import type { DiscoveryItem } from "@/lib/domain";

export const SEAD_CONTESTS_URL = "https://sead.se.gov.br/concursos/concursos-em-andamento/";
export const ARACAJU_EDITAIS_URL = "https://www.aracaju.se.gov.br/editais";
export const ARACAJU_EDITAIS_FALLBACK_URL = "http://transparencia.aracaju.se.gov.br/prefeitura/editais-de-concurso-e-pss/";
type CacheEntry = { expiresAt: number; items: DiscoveryItem[] };
const cache = new Map<string, CacheEntry>();

function normalizeText(value: string) { return value.replace(/\s+/g, " ").trim(); }

function absoluteUrl(href: string, base: string, origins: string | string[]) {
  try { const url = new URL(href, base); return (Array.isArray(origins) ? origins : [origins]).includes(url.origin) ? url.toString() : undefined; } catch { return undefined; }
}

function sourceIdFromUrl(sourceUrl: string, title: string) { return sourceUrl.replace(/\/$/u, "").split("/").pop() || title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/giu, "-"); }

function aracajuCertameId(title: string, sourceUrl: string) {
  const normalized = title.replace(/\.[a-z0-9]+$/iu, "").toLocaleUpperCase("pt-BR");
  const identity = normalized.match(/((?:CONCURSO|PSS)[A-Z0-9_]+)/u)?.[1];
  if (identity) {
    const base = identity.replace(/_(?:ABERTURA|CONVOCACAO|RETIFICACAO|ADITIVO|RES(?:ULTADO)?|FINAL|PROVISORIO|HETEROIDENTIFICACAO|INSCRITOS|RECURSO|CLASSIFICACAO|NOMEACAO).*$/u, "").replace(/_+/g, "_");
    return base === "CONCURSO_PGM" ? "CONCURSO_PGM_2024" : base;
  }
  return sourceIdFromUrl(sourceUrl, title).replace(/(?:EDITAL|ADITIVO)[A-Z0-9_-]*/iu, "").replace(/^[-_]+|[-_]+$/gu, "") || sourceIdFromUrl(sourceUrl, title);
}

function statusFromText(text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  if (/inscri(?:ções|coes)\s+(?:estão\s+)?abertas|abertura\s+das\s+inscri(?:ções|coes)/u.test(normalized)) return "Inscrições abertas";
  if (/inscri(?:ções|coes)\s+encerradas|prazo\s+encerrad[oa]/u.test(normalized)) return "Inscrições encerradas";
  if (/homologad[oa]/u.test(normalized)) return "Homologado";
  if (/convoca(?:ção|coes)/u.test(normalized)) return "Convocações";
  if (/resultado/u.test(normalized)) return "Resultado";
  if (/vigente/u.test(normalized)) return "Vigente";
  if (/encerrad[oa]/u.test(normalized)) return "Encerrado";
  return "Em andamento";
}

function parseContestLink(options: { title: string; sourceUrl: string; context: string; source: "SEAD_SERGIPE" | "ARACAJU_EDITAIS"; collectedAt: string; provider: string; municipality: string }) {
  const text = normalizeText(`${options.title} ${options.context}`);
  if (!/(concurso|processo seletivo|selec(?:ão|ao)\s+p(?:ú|u)blica|PSS)/iu.test(options.title)) return null;
  if (/credenciamento|pr(?:ê|e)mio|premia(?:ção|cao)|aviso\s+sem\s+identidade|cultura|leil(?:ão|ao)|compras?|conselho|participa(?:ção|cao)/iu.test(text)) return null;
  const kind = /processo seletivo|selec(?:ão|ao)\s+p(?:ú|u)blica|PSS/iu.test(options.title) ? "public_selection" : "public_exam";
  const sourceId = options.source === "ARACAJU_EDITAIS" ? aracajuCertameId(options.title, options.sourceUrl) : sourceIdFromUrl(options.sourceUrl, options.title);
  const title = options.source === "ARACAJU_EDITAIS" && /^(?:EDITAL|ADITIVO)_/iu.test(options.title) ? `${kind === "public_selection" ? "Processo seletivo" : "Concurso público"} ${sourceId.replace(/_/g, " ")}` : options.title;
  return { id: `${options.source.toLocaleLowerCase()}-${sourceId}`, kind, title, description: `Registro público listado por ${options.provider}. Consulte a publicação oficial para requisitos, prazos e alterações.`, category: "Administração pública", provider: options.provider, location: { state: "SE", municipality: options.municipality }, source: options.source, sourceLabel: options.source === "SEAD_SERGIPE" ? "SEAD Sergipe" : "Prefeitura de Aracaju / Editais", sourceId, sourceUrl: options.sourceUrl, collectedAt: options.collectedAt, status: statusFromText(text), officialType: kind === "public_selection" ? "Processo seletivo" : "Concurso público", tags: [kind === "public_selection" ? "Processo seletivo" : "Concurso público", options.provider] } satisfies DiscoveryItem;
}

function parseLinks(html: string, options: { base: string; origin: string | string[]; source: "SEAD_SERGIPE" | "ARACAJU_EDITAIS"; provider: string; municipality: string; collectedAt: string }) {
  const $ = cheerio.load(html); const items: DiscoveryItem[] = [];
  $("a").each((_, element) => {
    const title = normalizeText($(element).text()); const href = $(element).attr("href");
    const sourceUrl = href ? absoluteUrl(href, options.base, options.origin) : undefined;
    if (!sourceUrl || !title) return;
    const context = normalizeText($(element).closest("li,article,section,p,div").first().text());
    const item = parseContestLink({ ...options, title, sourceUrl, context });
    if (item && !items.some((current) => current.sourceId === item.sourceId)) items.push(item);
  });
  return items;
}

export function parseSeadContests(html: string, collectedAt = new Date().toISOString()): DiscoveryItem[] { return parseLinks(html, { base: SEAD_CONTESTS_URL, origin: "https://sead.se.gov.br", source: "SEAD_SERGIPE", provider: "SEAD Sergipe", municipality: "Sergipe", collectedAt }); }
export function parseAracajuEditais(html: string, collectedAt = new Date().toISOString(), base = ARACAJU_EDITAIS_URL): DiscoveryItem[] { return parseLinks(html, { base, origin: ["https://www.aracaju.se.gov.br", "https://transparencia.aracaju.se.gov.br", "http://transparencia.aracaju.se.gov.br"], source: "ARACAJU_EDITAIS", provider: "Prefeitura de Aracaju", municipality: "Aracaju", collectedAt }); }

async function fetchSource(key: string, url: string, parser: (html: string, collectedAt: string) => DiscoveryItem[], options: { timeoutMs?: number } = {}) {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { items: cached.items, collectedAt: new Date().toISOString(), stale: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 7000);
  try {
    const response = await fetch(url, { headers: { accept: "text/html" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`${key} ${response.status}`);
    const collectedAt = new Date().toISOString();
    const items = parser(await response.text(), collectedAt); cache.set(key, { expiresAt: Date.now() + 10 * 60 * 1000, items }); return { items, collectedAt, stale: false };
  } catch (error) {
    if (cached) return { items: cached.items, collectedAt: new Date().toISOString(), stale: true, error: error instanceof Error ? error.message : `${key} indisponível` };
    return { items: [], collectedAt: new Date().toISOString(), stale: true, error: error instanceof Error ? error.message : `${key} indisponível` };
  } finally { clearTimeout(timer); }
}

export async function fetchSeadContests(options: { timeoutMs?: number } = {}) { return { source: "SEAD_SERGIPE" as const, ...(await fetchSource("sead", SEAD_CONTESTS_URL, parseSeadContests, options)) }; }
export async function fetchAracajuEditais(options: { timeoutMs?: number } = {}) {
  const primary = await fetchSource("aracaju-editais", ARACAJU_EDITAIS_URL, parseAracajuEditais, options);
  if (primary.items.length > 0) return { source: "ARACAJU_EDITAIS" as const, ...primary };
  const fallback = await fetchSource("aracaju-transparencia-editais", ARACAJU_EDITAIS_FALLBACK_URL, (html, collectedAt) => parseAracajuEditais(html, collectedAt, ARACAJU_EDITAIS_FALLBACK_URL), options);
  return { source: "ARACAJU_EDITAIS" as const, ...fallback, partial: primary.stale || fallback.stale, metadata: { primaryUrl: ARACAJU_EDITAIS_URL, fallbackUrl: ARACAJU_EDITAIS_FALLBACK_URL } };
}
