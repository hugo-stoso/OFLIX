import { deduplicateDiscoveryItems, normalizePncpRecord } from "@/lib/discovery";
import type { DiscoveryItem } from "@/lib/domain";

const PNCP_BASE_URL = "https://pncp.gov.br/api/consulta/v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
const PNCP_MAX_PAGE_SIZE = 50;
const cache = new Map<string, { expiresAt: number; items: DiscoveryItem[]; collectedAt: string; page: number; pageSize: number; total?: number; totalPages?: number }>();

export type PncpQuery = { state?: string; municipality?: string; text?: string; page?: number; pageSize?: number };
export type PncpResult = { items: DiscoveryItem[]; source: "PNCP"; collectedAt: string; stale: boolean; page: number; pageSize: number; total?: number; totalPages?: number; hasMore?: boolean; error?: string };

function dateParam(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function cacheKey(query: PncpQuery) {
  return JSON.stringify({ ...query, state: query.state ?? "SE" });
}

function pageNumber(value: number | undefined) { return Number.isFinite(value) ? Math.max(1, Math.floor(value as number)) : 1; }
function pageSize(value: number | undefined) { return Number.isFinite(value) ? Math.max(10, Math.min(Math.floor(value as number), PNCP_MAX_PAGE_SIZE)) : 12; }
function metadata(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const total = [record.totalRegistros, record.totalRecords, record.total].find((value) => typeof value === "number");
  const totalPages = [record.totalPaginas, record.totalPages].find((value) => typeof value === "number");
  return { total: total as number | undefined, totalPages: totalPages as number | undefined };
}
async function requestPncp(url: string, timeoutMs: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal, cache: "no-store" });
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 150));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("PNCP request failed");
}

export async function fetchPncpOpportunities(query: PncpQuery = {}, options: { timeoutMs?: number } = {}): Promise<PncpResult> {
  const key = cacheKey(query);
  const cached = cache.get(key);
  const currentPage = pageNumber(query.page);
  const currentPageSize = pageSize(query.pageSize);
  if (cached && cached.expiresAt > Date.now()) return { items: cached.items, source: "PNCP", collectedAt: cached.collectedAt, stale: false, page: cached.page, pageSize: cached.pageSize, total: cached.total, totalPages: cached.totalPages, hasMore: cached.totalPages ? cached.page < cached.totalPages : undefined };

  const today = new Date();
  const finalDate = new Date(today);
  finalDate.setDate(finalDate.getDate() + 30);
  const params = new URLSearchParams({ dataInicial: dateParam(today), dataFinal: dateParam(finalDate), pagina: String(currentPage), tamanhoPagina: String(currentPageSize) });
  if (query.state) params.set("uf", query.state);
  try {
    const response = await requestPncp(`${PNCP_BASE_URL}/contratacoes/proposta?${params.toString()}`, options.timeoutMs ?? 8000);
    if (response.status === 204) {
      const collectedAt = new Date().toISOString();
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, items: [], collectedAt, page: currentPage, pageSize: currentPageSize });
      return { items: [], source: "PNCP", collectedAt, stale: false, page: currentPage, pageSize: currentPageSize, hasMore: false };
    }
    if (!response.ok) throw new Error(`PNCP ${response.status}`);
    const payload = await response.json() as unknown;
    const records = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data) ? (payload as { data: unknown[] }).data : [];
    const { total, totalPages } = metadata(payload);
    const normalized = deduplicateDiscoveryItems(records.filter((record): record is Record<string, unknown> => Boolean(record && typeof record === "object")).map(normalizePncpRecord).filter((record): record is DiscoveryItem => Boolean(record)));
    const filtered = normalized.filter((item) => {
      const matchesMunicipality = !query.municipality || item.location.municipality.toLocaleLowerCase("pt-BR") === query.municipality.toLocaleLowerCase("pt-BR");
      const matchesText = !query.text?.trim() || `${item.title} ${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query.text.trim().toLocaleLowerCase("pt-BR"));
      return matchesMunicipality && matchesText;
    });
    const collectedAt = new Date().toISOString();
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, items: filtered, collectedAt, page: currentPage, pageSize: currentPageSize, total, totalPages });
    return { items: filtered, source: "PNCP", collectedAt, stale: false, page: currentPage, pageSize: currentPageSize, total, totalPages, hasMore: totalPages ? currentPage < totalPages : filtered.length === currentPageSize };
  } catch (error) {
    if (cached) return { items: cached.items, source: "PNCP", collectedAt: cached.collectedAt, stale: true, page: cached.page, pageSize: cached.pageSize, total: cached.total, totalPages: cached.totalPages, hasMore: cached.totalPages ? cached.page < cached.totalPages : undefined, error: error instanceof Error ? error.message : "PNCP indisponível" };
    throw error;
  }
}

export function pncpEndpoint() {
  return `${PNCP_BASE_URL}/contratacoes/proposta`;
}
