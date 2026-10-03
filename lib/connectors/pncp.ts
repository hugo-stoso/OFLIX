import { deduplicateDiscoveryItems, normalizePncpRecord } from "@/lib/discovery";
import type { DiscoveryItem } from "@/lib/domain";

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; items: DiscoveryItem[] }>();

export type PncpQuery = { state?: string; municipality?: string; text?: string; page?: number; pageSize?: number };
export type PncpResult = { items: DiscoveryItem[]; source: "PNCP"; collectedAt: string; stale: boolean };

function dateParam(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function cacheKey(query: PncpQuery) {
  return JSON.stringify({ ...query, state: query.state ?? "SE" });
}

export async function fetchPncpOpportunities(query: PncpQuery = {}, options: { timeoutMs?: number } = {}): Promise<PncpResult> {
  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { items: cached.items, source: "PNCP", collectedAt: new Date().toISOString(), stale: false };

  const today = new Date();
  const finalDate = new Date(today);
  finalDate.setDate(finalDate.getDate() + 30);
  const params = new URLSearchParams({ dataFinal: dateParam(finalDate), pagina: String(query.page ?? 1), tamanhoPagina: String(Math.min(query.pageSize ?? 12, 50)) });
  if (query.state) params.set("uf", query.state);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 3500);
  try {
    const response = await fetch(`${PNCP_BASE_URL}/contratacoes/proposta?${params.toString()}`, { headers: { accept: "application/json" }, signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`PNCP ${response.status}`);
    const payload = await response.json() as unknown;
    const records = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : [];
    const normalized = deduplicateDiscoveryItems(records.filter((record): record is Record<string, unknown> => Boolean(record && typeof record === "object")).map(normalizePncpRecord).filter((record): record is DiscoveryItem => Boolean(record)));
    const filtered = normalized.filter((item) => {
      const matchesMunicipality = !query.municipality || item.location.municipality.toLocaleLowerCase("pt-BR") === query.municipality.toLocaleLowerCase("pt-BR");
      const matchesText = !query.text?.trim() || `${item.title} ${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query.text.trim().toLocaleLowerCase("pt-BR"));
      return matchesMunicipality && matchesText;
    });
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, items: filtered });
    return { items: filtered, source: "PNCP", collectedAt: new Date().toISOString(), stale: false };
  } finally {
    clearTimeout(timeout);
  }
}

export function pncpEndpoint() {
  return `${PNCP_BASE_URL}/contratacoes/proposta`;
}
