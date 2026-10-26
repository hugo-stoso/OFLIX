import * as cheerio from "cheerio";
import type { DiscoveryItem } from "@/lib/domain";

export const SEAD_CONTESTS_URL = "https://sead.se.gov.br/concursos/concursos-em-andamento/";
const cache = new Map<string, { expiresAt: number; items: DiscoveryItem[] }>();

function absoluteUrl(href: string) {
  try { const url = new URL(href, SEAD_CONTESTS_URL); return url.origin === "https://sead.se.gov.br" ? url.toString() : undefined; } catch { return undefined; }
}

function normalizeText(value: string) { return value.replace(/\s+/g, " ").trim(); }

export function parseSeadContests(html: string, collectedAt = new Date().toISOString()): DiscoveryItem[] {
  const $ = cheerio.load(html);
  const items: DiscoveryItem[] = [];
  $("h3, h4, p").each((_, element) => {
    const link = $(element).find("a").first();
    const title = normalizeText(link.text() || $(element).text());
    const href = link.attr("href");
    const sourceUrl = href ? absoluteUrl(href) : undefined;
    if (!sourceUrl || !title || /^concursos$/iu.test(title) || /legislações/iu.test(title) || !/(concurso|processo seletivo|credenciamento)/iu.test(title)) return;
    const kind = /processo seletivo/iu.test(title) ? "public_selection" : "public_exam";
    const sourceId = sourceUrl.replace(/\/$/u, "").split("/").pop() || title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/giu, "-");
    if (items.some((item) => item.sourceId === sourceId)) return;
    items.push({ id: `sead-${sourceId}`, kind, title, description: "Registro público listado pela SEAD Sergipe. Consulte o edital oficial para situação, requisitos e prazos.", category: "Administração pública", provider: "SEAD Sergipe", location: { state: "SE", municipality: "Sergipe" }, source: "SEAD_SERGIPE", sourceLabel: "SEAD Sergipe", sourceId, sourceUrl, collectedAt, status: "Em andamento", officialType: kind === "public_selection" ? "Processo seletivo" : "Concurso público", tags: [kind === "public_selection" ? "Processo seletivo" : "Concurso público", "SEAD Sergipe"] });
  });
  return items;
}

export async function fetchSeadContests(options: { timeoutMs?: number } = {}) {
  const cached = cache.get("sead");
  if (cached && cached.expiresAt > Date.now()) return { source: "SEAD_SERGIPE" as const, items: cached.items, collectedAt: new Date().toISOString(), stale: false };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);
  try {
    const response = await fetch(SEAD_CONTESTS_URL, { headers: { accept: "text/html" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`SEAD ${response.status}`);
    const collectedAt = new Date().toISOString();
    const items = parseSeadContests(await response.text(), collectedAt);
    cache.set("sead", { expiresAt: Date.now() + 10 * 60 * 1000, items });
    return { source: "SEAD_SERGIPE" as const, items, collectedAt, stale: false };
  } catch (error) {
    if (cached) return { source: "SEAD_SERGIPE" as const, items: cached.items, collectedAt: new Date().toISOString(), stale: true, error: error instanceof Error ? error.message : "SEAD indisponível" };
    throw error;
  } finally { clearTimeout(timer); }
}
