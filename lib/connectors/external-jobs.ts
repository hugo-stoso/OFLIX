import { randomUUID } from "node:crypto";
import { getCache, type RuntimeCache } from "@vercel/functions";
import type { DiscoveryItem } from "@/lib/domain";
import { fetchEmpregAjuOpportunities, isEmpregAjuEnabled, type EmpregAjuResult } from "@/lib/connectors/empregaju";
import { fetchGoSergipeOpportunities, isGoSergipeEnabled, type GoSergipeResult } from "@/lib/connectors/go-sergipe";
import { fetchIelSergipeOpportunities, isIelSergipeEnabled, type IelSergipeResult } from "@/lib/connectors/iel-sergipe";
import { deduplicateExternalItems, filterExternalItems, markExternalLifecycle } from "@/lib/connectors/external-utils";
import { recordSourceCollection } from "@/lib/job-observability";

export type ExternalJobSource = "GO_SERGIPE" | "EMPREGAJU" | "IEL_SERGIPE";
export type ExternalJobSourceParam = "go-sergipe" | "empregaju" | "iel-sergipe";
export type ExternalJobConnectorResult = GoSergipeResult | EmpregAjuResult | IelSergipeResult;

type ConnectorFetchOptions = { mode: "fast" | "full"; bypassCache: boolean };
type SourceConfig = {
  source: ExternalJobSource;
  param: ExternalJobSourceParam;
  provider: string;
  isEnabled: () => boolean;
  fetch: (options: ConnectorFetchOptions) => Promise<ExternalJobConnectorResult>;
};

export type ExternalJobsSourceSummary = {
  source: ExternalJobSource;
  provider: string;
  enabled: boolean;
  count: number;
  stale: boolean;
  partial: boolean;
  pages: number;
  servedFromCache?: boolean;
  servedFromStale?: boolean;
  error?: string;
};

export type ExternalJobsCacheState = "fresh" | "stale" | "cold";

export type ExternalJobsResult = {
  items: DiscoveryItem[];
  source: ExternalJobSource | "ALL";
  provider: string;
  collectedAt: string;
  stale: boolean;
  partial: boolean;
  pages: number;
  sources: ExternalJobsSourceSummary[];
  cacheState?: ExternalJobsCacheState;
  refreshSuggested?: boolean;
  error?: string;
};

export const EXTERNAL_SOURCE_PARAMS: ExternalJobSourceParam[] = ["go-sergipe", "empregaju", "iel-sergipe"];

const PROCESS_CACHE_TTL_MS = 30_000;
const SHARED_CACHE_NAMESPACE = "oflix-external-jobs-v1";
const SHARED_CACHE_FRESH_TTL_SECONDS = 4 * 60 * 60;
const SHARED_CACHE_STALE_TTL_SECONDS = 24 * 60 * 60;
const SHARED_REFRESH_LOCK_TTL_SECONDS = 90;
const SHARED_CACHE_TAG = "oflix-external-jobs";
const SHARED_CACHE_VERSION = 1;

const processCache = new Map<string, { expiresAt: number; result: ExternalJobsResult }>();
const processInFlight = new Map<string, Promise<ExternalJobsResult>>();
const refreshInFlight = new Map<string, Promise<void>>();
const sharedCache: RuntimeCache = getCache({ namespace: SHARED_CACHE_NAMESPACE });

type SharedSourceCacheEntry = {
  version: number;
  result: ExternalJobConnectorResult;
  freshUntil: number;
  staleUntil: number;
};

type SharedSourceState = "fresh" | "stale";
type SharedSourceSnapshot = { state: SharedSourceState; result: ExternalJobConnectorResult };

function sourceCacheKey(param: ExternalJobSourceParam) {
  return `source:${param}`;
}

function sourceLockKey(param: ExternalJobSourceParam) {
  return `refresh-lock:${param}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isConnectorResult(value: unknown): value is ExternalJobConnectorResult {
  return isRecord(value) && Array.isArray(value.items) && typeof value.source === "string" && typeof value.provider === "string" && typeof value.collectedAt === "string";
}

async function readSharedSource(param: ExternalJobSourceParam): Promise<SharedSourceSnapshot | undefined> {
  try {
    const value = await sharedCache.get(sourceCacheKey(param));
    if (!isRecord(value) || value.version !== SHARED_CACHE_VERSION || !isConnectorResult(value.result)) return undefined;
    const entry = value as unknown as SharedSourceCacheEntry;
    const now = Date.now();
    if (entry.staleUntil <= now) return undefined;
    return { state: entry.freshUntil > now && !entry.result.partial ? "fresh" : "stale", result: entry.result };
  } catch (error) {
    console.warn(`[external-jobs] cache read unavailable: ${error instanceof Error ? error.name : "unknown"}`);
    return undefined;
  }
}

async function writeSharedSource(param: ExternalJobSourceParam, result: ExternalJobConnectorResult) {
  const existing = await readSharedSource(param);
  if (result.partial && existing && !existing.result.partial) return;
  const now = Date.now();
  const entry: SharedSourceCacheEntry = {
    version: SHARED_CACHE_VERSION,
    result,
    freshUntil: now + SHARED_CACHE_FRESH_TTL_SECONDS * 1000,
    staleUntil: now + SHARED_CACHE_STALE_TTL_SECONDS * 1000,
  };
  try {
    await sharedCache.set(sourceCacheKey(param), entry, { ttl: SHARED_CACHE_STALE_TTL_SECONDS, tags: [SHARED_CACHE_TAG, `oflix-external-jobs:${param}`] });
  } catch (error) {
    console.warn(`[external-jobs] cache write unavailable: ${error instanceof Error ? error.name : "unknown"}`);
  }
}

async function acquireRefreshLease(param: ExternalJobSourceParam) {
  const key = sourceLockKey(param);
  const token = `${Date.now()}-${randomUUID()}`;
  try {
    if (await sharedCache.get(key)) return undefined;
    await sharedCache.set(key, token, { ttl: SHARED_REFRESH_LOCK_TTL_SECONDS, tags: [SHARED_CACHE_TAG] });
    return (await sharedCache.get(key)) === token ? { key, token } : undefined;
  } catch (error) {
    console.warn(`[external-jobs] refresh lease unavailable: ${error instanceof Error ? error.name : "unknown"}`);
    return { key, token: undefined };
  }
}

async function releaseRefreshLease(lease: { key: string; token?: string }) {
  if (!lease.token) return;
  try {
    if ((await sharedCache.get(lease.key)) === lease.token) await sharedCache.delete(lease.key);
  } catch {
    // The short TTL remains the safety net if lease cleanup is unavailable.
  }
}

function sourceConfigs(env: NodeJS.ProcessEnv): SourceConfig[] {
  return [
    {
      source: "GO_SERGIPE",
      param: "go-sergipe",
      provider: "GO Sergipe",
      isEnabled: () => isGoSergipeEnabled(env),
      fetch: (options) => fetchGoSergipeOpportunities({ maxPages: options.mode === "fast" ? 1 : undefined, bypassCache: options.bypassCache }),
    },
    {
      source: "EMPREGAJU",
      param: "empregaju",
      provider: "EmpregAju",
      isEnabled: () => isEmpregAjuEnabled(env),
      fetch: (options) => fetchEmpregAjuOpportunities({ maxPages: options.mode === "fast" ? 1 : undefined, bypassCache: options.bypassCache }),
    },
    {
      source: "IEL_SERGIPE",
      param: "iel-sergipe",
      provider: "IEL Sergipe",
      isEnabled: () => isIelSergipeEnabled(env),
      fetch: (options) => fetchIelSergipeOpportunities({ bypassCache: options.bypassCache }),
    },
  ];
}

export function externalSourceFromParam(value: string | null | undefined): ExternalJobSourceParam | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return EXTERNAL_SOURCE_PARAMS.includes(value as ExternalJobSourceParam) ? value as ExternalJobSourceParam : undefined;
}

function disabledResult(config: SourceConfig, collectedAt: string): ExternalJobConnectorResult {
  return { items: [], source: config.source, provider: config.provider, collectedAt, stale: true, partial: false, pages: 0, collection: { startedAt: collectedAt, finishedAt: collectedAt, durationMs: 0, sourceFetched: false, servedFromCache: false, servedFromStale: false, success: false } } as ExternalJobConnectorResult;
}

function selectedConfigs(configs: SourceConfig[], source?: ExternalJobSourceParam | "all", sourceParams?: ExternalJobSourceParam[]) {
  if (sourceParams) return configs.filter((config) => sourceParams.includes(config.param));
  return source && source !== "all" ? configs.filter((config) => config.param === source) : configs;
}

function decorateCachedResult(result: ExternalJobConnectorResult, state: SharedSourceState): ExternalJobConnectorResult {
  return {
    ...result,
    stale: result.stale || state === "stale",
    collection: {
      ...result.collection,
      servedFromCache: true,
      servedFromStale: state === "stale",
      sourceFetched: false,
      durationMs: 0,
    },
  } as ExternalJobConnectorResult;
}

function aggregateExternalJobs(results: ExternalJobConnectorResult[], configs: SourceConfig[], options: { q?: string; municipality?: string; cacheState: ExternalJobsCacheState; refreshSuggested: boolean }): ExternalJobsResult {
  const enabledBySource = new Map(configs.map((config) => [config.source, config.isEnabled()]));
  const summaries = results.map((result) => ({
    source: result.source,
    provider: result.provider,
    enabled: enabledBySource.get(result.source) ?? false,
    count: result.items.length,
    stale: result.stale,
    partial: result.partial,
    pages: result.pages,
    servedFromCache: result.collection?.servedFromCache,
    servedFromStale: result.collection?.servedFromStale,
    ...(result.error ? { error: result.error } : {}),
  }));
  const items = deduplicateExternalItems(results.flatMap((result) => result.items.map((item) => markExternalLifecycle(item, result.collectedAt))));
  const filteredItems = filterExternalItems(items, { q: options.q, municipality: options.municipality });
  const errors = results.map((result) => result.error).filter(Boolean);
  return {
    items: filteredItems,
    source: configs.length === 1 ? configs[0].source : "ALL",
    provider: configs.length === 1 ? configs[0].provider : "Fontes externas",
    collectedAt: results.map((result) => result.collectedAt).sort().at(-1) ?? new Date().toISOString(),
    stale: results.length > 0 && results.every((result) => result.stale),
    partial: results.some((result) => result.partial || Boolean(result.error)),
    pages: results.reduce((total, result) => total + result.pages, 0),
    sources: summaries,
    cacheState: options.cacheState,
    refreshSuggested: options.refreshSuggested,
    ...(errors.length ? { error: "Uma ou mais fontes externas não puderam ser atualizadas agora." } : {}),
  };
}

async function collectConfigs(configs: SourceConfig[], allConfigs: SourceConfig[], options: { mode: "fast" | "full"; bypassCache: boolean }) {
  const collectedAt = new Date().toISOString();
  const results = await Promise.all(configs.map(async (config) => {
    if (!config.isEnabled()) return disabledResult(config, collectedAt);
    try {
      return await config.fetch({ mode: options.mode, bypassCache: options.bypassCache });
    } catch (error) {
      return { items: [], source: config.source, provider: config.provider, collectedAt, stale: true, partial: true, pages: 0, collection: { startedAt: collectedAt, finishedAt: new Date().toISOString(), durationMs: 0, sourceFetched: true, servedFromCache: false, servedFromStale: false, success: false }, error: error instanceof Error ? error.message : "Falha desconhecida na coleta" } as ExternalJobConnectorResult;
    }
  }));
  const enabledBySource = new Map(allConfigs.map((config) => [config.source, config.isEnabled()]));
  results.forEach((result) => recordSourceCollection({ source: result.source, provider: result.provider, enabled: enabledBySource.get(result.source) ?? false, items: result.items, collectedAt: result.collectedAt, error: result.error, stale: result.stale, partial: result.partial, collection: result.collection }));
  return results;
}

async function refreshSource(config: SourceConfig, allConfigs: SourceConfig[]) {
  if (!config.isEnabled()) return;
  const key = config.param;
  const active = refreshInFlight.get(key);
  if (active) return active;
  const request = (async () => {
    const existing = await readSharedSource(key);
    if (existing?.state === "fresh") return;
    const lease = await acquireRefreshLease(key);
    if (!lease) return;
    try {
      const [result] = await collectConfigs([config], allConfigs, { mode: "full", bypassCache: true });
      await writeSharedSource(key, result);
      processCache.clear();
      console.info(`[external-jobs] atualização concluída source=${key} pages=${result.pages} items=${result.items.length} partial=${result.partial}`);
    } finally {
      await releaseRefreshLease(lease);
    }
  })().finally(() => refreshInFlight.delete(key));
  refreshInFlight.set(key, request);
  return request;
}

export async function refreshExternalJobs(options: { source?: ExternalJobSourceParam | "all"; env?: NodeJS.ProcessEnv } = {}) {
  const env = options.env ?? process.env;
  const configs = sourceConfigs(env);
  const selected = selectedConfigs(configs, options.source);
  await Promise.all(selected.map((config) => refreshSource(config, configs)));
}

export async function fetchExternalJobs(options: { source?: ExternalJobSourceParam | "all"; q?: string; municipality?: string; env?: NodeJS.ProcessEnv } = {}): Promise<ExternalJobsResult> {
  const cacheKey = `${options.source ?? "all"}|${options.q ?? ""}|${options.municipality ?? ""}`;
  const cached = processCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const active = processInFlight.get(cacheKey);
  if (active) return active;

  const request = (async () => {
    const env = options.env ?? process.env;
    const allConfigs = sourceConfigs(env);
    const configs = selectedConfigs(allConfigs, options.source);
    const useSharedCache = !options.env || options.env === process.env;
    const enabledConfigs = configs.filter((config) => config.isEnabled());
    const disabledConfigs = configs.filter((config) => !config.isEnabled());
    const snapshots = useSharedCache ? await Promise.all(enabledConfigs.map(async (config) => ({ config, snapshot: await readSharedSource(config.param) }))) : enabledConfigs.map((config) => ({ config, snapshot: undefined }));
    const fetchedConfigs = snapshots.filter(({ snapshot }) => !snapshot).map(({ config }) => config);
    const fetched = fetchedConfigs.length ? await collectConfigs(fetchedConfigs, allConfigs, { mode: "fast", bypassCache: true }) : [];
    const cachedResults = snapshots.flatMap(({ snapshot }) => snapshot ? [decorateCachedResult(snapshot.result, snapshot.state)] : []);
    const results = [
      ...disabledConfigs.map((config) => disabledResult(config, new Date().toISOString())),
      ...cachedResults,
      ...fetched,
    ];
    const hasStale = snapshots.some(({ snapshot }) => snapshot?.state === "stale");
    const refreshSuggested = fetchedConfigs.length > 0 || hasStale || fetched.some((result) => result.partial || result.stale);
    const cacheState: ExternalJobsCacheState = fetchedConfigs.length > 0 ? (hasStale ? "stale" : "cold") : hasStale ? "stale" : "fresh";
    const result = aggregateExternalJobs(results, configs, { q: options.q, municipality: options.municipality, cacheState, refreshSuggested });
    processCache.set(cacheKey, { expiresAt: Date.now() + PROCESS_CACHE_TTL_MS, result });
    if (refreshSuggested) console.info(`[external-jobs] cache=${cacheState} refreshSuggested=true sources=${configs.map((config) => config.param).join(",")}`);
    return result;
  })().finally(() => processInFlight.delete(cacheKey));
  processInFlight.set(cacheKey, request);
  return request;
}
