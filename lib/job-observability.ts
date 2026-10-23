import { createHash } from "node:crypto";
import type { DiscoveryItem } from "@/lib/domain";
import type { SourceCollectionMetadata } from "@/lib/connectors/collection";

export type SourceCoverageMode = "FULL" | "PARTIAL" | "UNKNOWN";
export type SourceFreshnessState = "FRESH" | "STALE" | "ERROR" | "DISABLED";
export type TimestampPrecision = "DATETIME" | "DATE" | "UNKNOWN";

export type ExternalJobObservation = {
  source: string;
  sourceJobId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  firstCollectedAt: string;
  lastCollectedAt: string;
  sourcePublishedAt?: string;
  sourceUpdatedAt?: string;
  sourcePublishedAtPrecision?: TimestampPrecision;
  sourceUpdatedAtPrecision?: TimestampPrecision;
  contentFingerprint: string;
  active: boolean;
  missingRuns: number;
};

export type SourceCollectionRun = {
  id: string;
  source: string;
  provider: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  success: boolean;
  coverageMode: SourceCoverageMode;
  pages: number;
  pagesRequested: number;
  pagesSucceeded: number;
  paginationComplete: boolean;
  sourceAvailableCount?: number;
  collectedCount: number;
  uniqueCount: number;
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  disappearedCount: number;
  stale: boolean;
  partial: boolean;
  servedFromCache: boolean;
  servedFromStale: boolean;
  errorCode?: string;
  collectedAt: string;
};

export type DiscoveryLatencySummary = {
  available: boolean;
  sampleSize: number;
  medianMs?: number;
  p95Ms?: number;
  maxMs?: number;
  precision?: "DATETIME" | "DATE" | "MIXED";
};

export type JobObservabilitySourceSummary = {
  source: string;
  provider: string;
  enabled: boolean;
  currentCount: number;
  activeCount: number;
  sourceAvailableCount?: number;
  coverageRate?: number;
  coverageMode: SourceCoverageMode;
  freshness: SourceFreshnessState;
  stale: boolean;
  partial: boolean;
  errorCode?: string;
  lastSuccessfulCollectedAt?: string;
  lastAttemptAt?: string;
  latestRun?: SourceCollectionRun;
  discoveryLatency: DiscoveryLatencySummary;
};

export type JobObservabilitySnapshot = {
  generatedAt: string;
  historyAvailable: boolean;
  historyReason: string;
  overview: {
    currentCount: number;
    activeCount: number;
    sourceCount: number;
    freshSourceCount: number;
    staleSourceCount: number;
    partialSourceCount: number;
    lastSuccessfulCollectedAt?: string;
    newCount: number;
  };
  sources: JobObservabilitySourceSummary[];
  methodology: {
    identity: string;
    disappearance: string;
    latency: string;
    cache: string;
  };
};

type SourceState = {
  source: string;
  provider: string;
  enabled: boolean;
  currentCount: number;
  activeCount: number;
  coverageMode: SourceCoverageMode;
  sourceAvailableCount?: number;
  freshness: SourceFreshnessState;
  stale: boolean;
  partial: boolean;
  lastSuccessfulCollectedAt?: string;
  lastAttemptAt?: string;
  latestRun?: SourceCollectionRun;
};

export type JobObservabilityStore = {
  historyAvailable: boolean;
  historyReason: string;
  recordCollection(input: RecordCollectionInput): SourceCollectionRun | undefined;
  snapshot(now?: Date): JobObservabilitySnapshot;
  clear(): void;
};

export type RecordCollectionInput = {
  source: string;
  provider: string;
  enabled: boolean;
  items: DiscoveryItem[];
  collectedAt: string;
  error?: string;
  stale?: boolean;
  partial?: boolean;
  collection?: SourceCollectionMetadata;
  coverageMode?: SourceCoverageMode;
  sourceAvailableCount?: number;
  now?: Date;
};

const DEFAULT_HISTORY_REASON = "Histórico entre deployments requer armazenamento durável; esta execução mantém apenas métricas de request e memória do processo.";
const MISSING_GRACE_RUNS = 2;
const MAX_RUNS = 100;
const GLOBAL_KEY = Symbol.for("oflix.job-observability.store");

type GlobalWithStore = typeof globalThis & { [GLOBAL_KEY]?: JobObservabilityStore };

function finiteNonNegative(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function identityForItem(item: DiscoveryItem) {
  const value = item.sourceJobId ?? item.sourceId ?? item.id;
  return `${item.source}:${String(value).trim()}`;
}

function sourceJobIdForItem(item: DiscoveryItem) {
  return String(item.sourceJobId ?? item.sourceId ?? item.id).trim();
}

function fingerprintForItem(item: DiscoveryItem) {
  const publicFields = {
    title: item.title,
    provider: item.provider,
    company: item.company,
    municipality: item.location.municipality,
    state: item.location.state,
    sourceUrl: item.sourceUrl,
    applicationUrl: item.applicationUrl,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
    category: item.category,
    contractType: item.contractType,
    modality: item.modality,
    salary: item.salary,
    salaryMin: item.salaryMin,
    salaryMax: item.salaryMax,
    vacancies: item.vacancies,
    vacanciesCount: item.vacanciesCount,
    status: item.status,
  };
  return createHash("sha256").update(JSON.stringify(publicFields)).digest("hex");
}

function parseTimestamp(value: string | undefined, nowMs: number): { value?: string; precision: TimestampPrecision } {
  if (!value) return { precision: "UNKNOWN" };
  const normalized = value.trim();
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/u.test(normalized);
  const timestamp = isDateOnly ? Date.parse(`${normalized}T00:00:00.000Z`) : Date.parse(normalized);
  if (!Number.isFinite(timestamp) || timestamp > nowMs || timestamp < Date.UTC(2000, 0, 1)) return { precision: "UNKNOWN" };
  return { value: normalized, precision: isDateOnly ? "DATE" : "DATETIME" };
}

function validSourceTimestamps(item: DiscoveryItem, nowMs: number) {
  const published = parseTimestamp(item.publishedAt, nowMs);
  const updated = parseTimestamp(item.updatedAt, nowMs);
  const publishedMs = published.value ? Date.parse(published.value.length === 10 ? `${published.value}T00:00:00.000Z` : published.value) : undefined;
  const updatedMs = updated.value ? Date.parse(updated.value.length === 10 ? `${updated.value}T00:00:00.000Z` : updated.value) : undefined;
  if (publishedMs !== undefined && updatedMs !== undefined && updatedMs < publishedMs) return { published, updated: { precision: "UNKNOWN" as const } };
  return { published, updated };
}

function coverageModeFor(input: RecordCollectionInput, success: boolean): SourceCoverageMode {
  if (input.coverageMode) return input.coverageMode;
  if (input.source === "IEL_SERGIPE") return "PARTIAL";
  if (success && input.collection?.paginationComplete === true) return "FULL";
  return success ? "PARTIAL" : "UNKNOWN";
}

function freshnessFor(input: RecordCollectionInput, success: boolean) {
  if (!input.enabled) return "DISABLED" as const;
  if (input.collection?.servedFromStale || input.stale) return "STALE" as const;
  if (!success) return "ERROR" as const;
  return "FRESH" as const;
}

function percentile(values: number[], fraction: number) {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index];
}

function latencyForObservations(observations: Iterable<ExternalJobObservation>, nowMs: number): DiscoveryLatencySummary {
  const values: number[] = [];
  let dateCount = 0;
  for (const observation of observations) {
    if (!observation.sourcePublishedAt) continue;
    if (observation.sourcePublishedAtPrecision === "DATE") { dateCount += 1; continue; }
    if (observation.sourcePublishedAtPrecision !== "DATETIME") continue;
    const publishedAt = Date.parse(observation.sourcePublishedAt);
    const firstSeenAt = Date.parse(observation.firstSeenAt);
    const latency = firstSeenAt - publishedAt;
    if (Number.isFinite(latency) && latency >= 0 && publishedAt <= nowMs) values.push(latency);
  }
  const precision = values.length && dateCount ? "MIXED" : values.length ? "DATETIME" : dateCount ? "DATE" : undefined;
  return {
    available: values.length > 0,
    sampleSize: values.length,
    ...(values.length ? { medianMs: percentile(values, 0.5), p95Ms: percentile(values, 0.95), maxMs: Math.max(...values) } : {}),
    ...(precision ? { precision } : {}),
  };
}

class MemoryJobObservabilityStore implements JobObservabilityStore {
  readonly historyAvailable: boolean;
  readonly historyReason: string;
  private observations = new Map<string, ExternalJobObservation>();
  private runs: SourceCollectionRun[] = [];
  private states = new Map<string, SourceState>();

  constructor(options: { historyAvailable?: boolean; historyReason?: string } = {}) {
    this.historyAvailable = options.historyAvailable ?? false;
    this.historyReason = options.historyReason ?? DEFAULT_HISTORY_REASON;
  }

  recordCollection(input: RecordCollectionInput) {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const metadata = input.collection ?? {};
    const success = input.enabled && (metadata.success ?? (!input.error && !input.stale));
    const servedFromCache = metadata.servedFromCache === true;
    if (servedFromCache && input.enabled) return undefined;

    const startedAt = metadata.startedAt ?? input.collectedAt;
    const finishedAt = metadata.finishedAt ?? nowIso;
    const durationMs = finiteNonNegative(metadata.durationMs, Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)));
    const sourceItems = success ? input.items : [];
    const seen = new Set<string>();
    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let disappearedCount = 0;

    if (success) {
      for (const item of sourceItems) {
        const identity = identityForItem(item);
        if (seen.has(identity)) continue;
        seen.add(identity);
        const existing = this.observations.get(identity);
        const timestamps = validSourceTimestamps(item, now.getTime());
        const fingerprint = fingerprintForItem(item);
        if (!existing || !existing.active) {
          newCount += 1;
          this.observations.set(identity, {
            source: item.source,
            sourceJobId: sourceJobIdForItem(item),
            firstSeenAt: existing?.firstSeenAt ?? nowIso,
            lastSeenAt: nowIso,
            firstCollectedAt: existing?.firstCollectedAt ?? input.collectedAt,
            lastCollectedAt: input.collectedAt,
            ...(timestamps.published.value ? { sourcePublishedAt: timestamps.published.value, sourcePublishedAtPrecision: timestamps.published.precision } : {}),
            ...(timestamps.updated.value ? { sourceUpdatedAt: timestamps.updated.value, sourceUpdatedAtPrecision: timestamps.updated.precision } : {}),
            contentFingerprint: fingerprint,
            active: true,
            missingRuns: 0,
          });
        } else {
          if (existing.contentFingerprint === fingerprint) unchangedCount += 1;
          else updatedCount += 1;
          this.observations.set(identity, {
            ...existing,
            lastSeenAt: nowIso,
            lastCollectedAt: input.collectedAt,
            ...(timestamps.published.value ? { sourcePublishedAt: timestamps.published.value, sourcePublishedAtPrecision: timestamps.published.precision } : {}),
            ...(timestamps.updated.value ? { sourceUpdatedAt: timestamps.updated.value, sourceUpdatedAtPrecision: timestamps.updated.precision } : {}),
            contentFingerprint: fingerprint,
            active: true,
            missingRuns: 0,
          });
        }
      }

      const canMarkMissing = coverageModeFor(input, true) === "FULL" && metadata.paginationComplete === true && !input.partial;
      if (canMarkMissing) {
        for (const [identity, observation] of this.observations) {
          if (observation.source !== input.source || seen.has(identity) || !observation.active) continue;
          const missingRuns = observation.missingRuns + 1;
          const active = missingRuns < MISSING_GRACE_RUNS;
          if (!active) disappearedCount += 1;
          this.observations.set(identity, { ...observation, missingRuns, active });
        }
      }
    }

    const coverageMode = coverageModeFor(input, success);
    const previous = this.states.get(input.source);
    const sourceAvailableCount = input.sourceAvailableCount ?? metadata.sourceAvailableCount ?? (coverageMode === "FULL" ? new Set(sourceItems.map(identityForItem)).size : undefined);
    const run: SourceCollectionRun = {
      id: `${input.source}:${nowIso}:${this.runs.length + 1}`,
      source: input.source,
      provider: input.provider,
      startedAt,
      finishedAt,
      durationMs,
      success,
      coverageMode,
      pages: Math.trunc(finiteNonNegative(metadata.pagesRequested, 0)),
      pagesRequested: Math.trunc(finiteNonNegative(metadata.pagesRequested, 0)),
      pagesSucceeded: Math.trunc(finiteNonNegative(metadata.pagesSucceeded, 0)),
      paginationComplete: metadata.paginationComplete === true,
      ...(sourceAvailableCount !== undefined ? { sourceAvailableCount } : {}),
      collectedCount: success ? input.items.length : 0,
      uniqueCount: new Set(sourceItems.map(identityForItem)).size,
      newCount,
      updatedCount,
      unchangedCount,
      disappearedCount,
      stale: input.stale === true,
      partial: input.partial === true,
      servedFromCache,
      servedFromStale: metadata.servedFromStale === true,
      ...(input.error ? { errorCode: "SOURCE_COLLECTION_FAILED" } : {}),
      collectedAt: input.collectedAt,
    };
    this.runs = [...this.runs, run].slice(-MAX_RUNS);

    const activeCount = Array.from(this.observations.values()).filter((observation) => observation.source === input.source && observation.active).length;
    this.states.set(input.source, {
      source: input.source,
      provider: input.provider,
      enabled: input.enabled,
      currentCount: success && (coverageMode === "FULL" || !previous) ? new Set(sourceItems.map(identityForItem)).size : (previous?.currentCount ?? 0),
      activeCount,
      coverageMode: success ? coverageMode : (previous?.coverageMode ?? coverageMode),
      ...((sourceAvailableCount !== undefined || previous?.sourceAvailableCount !== undefined) ? { sourceAvailableCount: sourceAvailableCount ?? previous?.sourceAvailableCount } : {}),
      freshness: freshnessFor(input, success),
      stale: input.stale === true || metadata.servedFromStale === true,
      partial: input.partial === true,
      ...(success ? { lastSuccessfulCollectedAt: input.collectedAt } : {}),
      lastAttemptAt: finishedAt,
      latestRun: run,
    });
    return run;
  }

  snapshot(now = new Date()): JobObservabilitySnapshot {
    const states = Array.from(this.states.values()).sort((a, b) => a.source.localeCompare(b.source));
    const sources = states.map((state) => {
      const observations = Array.from(this.observations.values()).filter((observation) => observation.source === state.source);
      const discoveryLatency = latencyForObservations(observations, now.getTime());
      const sourceAvailableCount = state.sourceAvailableCount;
      return {
        source: state.source,
        provider: state.provider,
        enabled: state.enabled,
        currentCount: state.currentCount,
        activeCount: state.activeCount,
        ...(sourceAvailableCount !== undefined ? { sourceAvailableCount, coverageRate: sourceAvailableCount > 0 ? state.currentCount / sourceAvailableCount : 0 } : {}),
        coverageMode: state.coverageMode,
        freshness: state.freshness,
        stale: state.stale,
        partial: state.partial,
        ...(state.latestRun?.errorCode ? { errorCode: state.latestRun.errorCode } : {}),
        ...(state.lastSuccessfulCollectedAt ? { lastSuccessfulCollectedAt: state.lastSuccessfulCollectedAt } : {}),
        ...(state.lastAttemptAt ? { lastAttemptAt: state.lastAttemptAt } : {}),
        ...(state.latestRun ? { latestRun: state.latestRun } : {}),
        discoveryLatency,
      } satisfies JobObservabilitySourceSummary;
    });
    const latestRuns = sources.map((source) => source.latestRun).filter((run): run is SourceCollectionRun => Boolean(run));
    const successfulRuns = latestRuns.filter((run) => run.success);
    const lastSuccessfulCollectedAt = successfulRuns.map((run) => run.collectedAt).sort().at(-1);
    return {
      generatedAt: now.toISOString(),
      historyAvailable: this.historyAvailable,
      historyReason: this.historyReason,
      overview: {
        currentCount: sources.reduce((total, source) => total + source.currentCount, 0),
        activeCount: sources.reduce((total, source) => total + source.activeCount, 0),
        sourceCount: sources.filter((source) => source.enabled).length,
        freshSourceCount: sources.filter((source) => source.freshness === "FRESH").length,
        staleSourceCount: sources.filter((source) => source.freshness === "STALE").length,
        partialSourceCount: sources.filter((source) => source.partial || source.coverageMode === "PARTIAL").length,
        ...(lastSuccessfulCollectedAt ? { lastSuccessfulCollectedAt } : {}),
        newCount: latestRuns.reduce((total, run) => total + run.newCount, 0),
      },
      sources,
      methodology: {
        identity: "Identidade por source + sourceJobId (com fallback para sourceId/id); fingerprints usam campos públicos e estáveis do anúncio.",
        disappearance: `Ausência só é marcada em coleta FULL bem-sucedida com paginação completa, após ${MISSING_GRACE_RUNS} coletas consecutivas; não significa encerramento da vaga.`,
        latency: "Discovery latency só usa timestamp publicado confiável com precisão DATETIME; datas sem horário são preservadas como DATE sem latência exata.",
        cache: "Cache hit não cria uma nova coleta; fallback stale registra tentativa falha sem alterar o lifecycle dos anúncios.",
      },
    };
  }

  clear() {
    this.observations.clear();
    this.runs = [];
    this.states.clear();
  }
}

export function createMemoryJobObservabilityStore(options: { historyAvailable?: boolean; historyReason?: string } = {}): JobObservabilityStore {
  return new MemoryJobObservabilityStore(options);
}

export function getJobObservabilityStore() {
  const globalStore = globalThis as GlobalWithStore;
  if (!globalStore[GLOBAL_KEY]) globalStore[GLOBAL_KEY] = createMemoryJobObservabilityStore();
  return globalStore[GLOBAL_KEY];
}

export function resetJobObservabilityStore() {
  getJobObservabilityStore().clear();
}

export function recordSourceCollection(input: RecordCollectionInput) {
  return getJobObservabilityStore().recordCollection(input);
}

export function getJobObservabilitySnapshot(now?: Date) {
  return getJobObservabilityStore().snapshot(now);
}
