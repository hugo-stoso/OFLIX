import type { DiscoveryItem } from "@/lib/domain";
import { fetchEmpregAjuOpportunities, isEmpregAjuEnabled, type EmpregAjuResult } from "@/lib/connectors/empregaju";
import { fetchGoSergipeOpportunities, isGoSergipeEnabled, type GoSergipeResult } from "@/lib/connectors/go-sergipe";
import { fetchIelSergipeOpportunities, isIelSergipeEnabled, type IelSergipeResult } from "@/lib/connectors/iel-sergipe";
import { deduplicateExternalItems, filterExternalItems, markExternalLifecycle } from "@/lib/connectors/external-utils";

export type ExternalJobSource = "GO_SERGIPE" | "EMPREGAJU" | "IEL_SERGIPE";
export type ExternalJobSourceParam = "go-sergipe" | "empregaju" | "iel-sergipe";
export type ExternalJobConnectorResult = GoSergipeResult | EmpregAjuResult | IelSergipeResult;

type SourceConfig = {
  source: ExternalJobSource;
  param: ExternalJobSourceParam;
  provider: string;
  isEnabled: () => boolean;
  fetch: () => Promise<ExternalJobConnectorResult>;
};

export type ExternalJobsSourceSummary = {
  source: ExternalJobSource;
  provider: string;
  enabled: boolean;
  count: number;
  stale: boolean;
  partial: boolean;
  pages: number;
  error?: string;
};

export type ExternalJobsResult = {
  items: DiscoveryItem[];
  source: ExternalJobSource | "ALL";
  provider: string;
  collectedAt: string;
  stale: boolean;
  partial: boolean;
  pages: number;
  sources: ExternalJobsSourceSummary[];
  error?: string;
};

export const EXTERNAL_SOURCE_PARAMS: ExternalJobSourceParam[] = ["go-sergipe", "empregaju", "iel-sergipe"];

function sourceConfigs(env: NodeJS.ProcessEnv): SourceConfig[] {
  return [
    { source: "GO_SERGIPE", param: "go-sergipe", provider: "GO Sergipe", isEnabled: () => isGoSergipeEnabled(env), fetch: fetchGoSergipeOpportunities },
    { source: "EMPREGAJU", param: "empregaju", provider: "EmpregAju", isEnabled: () => isEmpregAjuEnabled(env), fetch: fetchEmpregAjuOpportunities },
    { source: "IEL_SERGIPE", param: "iel-sergipe", provider: "IEL Sergipe", isEnabled: () => isIelSergipeEnabled(env), fetch: fetchIelSergipeOpportunities },
  ];
}

export function externalSourceFromParam(value: string | null | undefined): ExternalJobSourceParam | "all" | undefined {
  if (!value || value === "all") return value === "all" ? "all" : undefined;
  return EXTERNAL_SOURCE_PARAMS.includes(value as ExternalJobSourceParam) ? value as ExternalJobSourceParam : undefined;
}

function disabledResult(config: SourceConfig, collectedAt: string): ExternalJobConnectorResult {
  return { items: [], source: config.source, provider: config.provider, collectedAt, stale: true, partial: false, pages: 0 } as ExternalJobConnectorResult;
}

export async function fetchExternalJobs(options: { source?: ExternalJobSourceParam | "all"; q?: string; municipality?: string; env?: NodeJS.ProcessEnv } = {}): Promise<ExternalJobsResult> {
  const env = options.env ?? process.env;
  const allConfigs = sourceConfigs(env);
  const configs = options.source && options.source !== "all" ? allConfigs.filter((config) => config.param === options.source) : allConfigs;
  const collectedAt = new Date().toISOString();
  const results = await Promise.all(configs.map(async (config) => {
    if (!config.isEnabled()) return disabledResult(config, collectedAt);
    try {
      return await config.fetch();
    } catch (error) {
      return { items: [], source: config.source, provider: config.provider, collectedAt, stale: true, partial: true, pages: 0, error: error instanceof Error ? error.message : "Falha desconhecida na coleta" } as ExternalJobConnectorResult;
    }
  }));
  const enabledBySource = new Map(allConfigs.map((config) => [config.source, config.isEnabled()]));
  const summaries = results.map((result) => ({ source: result.source, provider: result.provider, enabled: enabledBySource.get(result.source) ?? false, count: result.items.length, stale: result.stale, partial: result.partial, pages: result.pages, ...(result.error ? { error: result.error } : {}) }));
  const items = deduplicateExternalItems(results.flatMap((result) => result.items.map((item) => markExternalLifecycle(item, result.collectedAt))));
  const filteredItems = filterExternalItems(items, { q: options.q, municipality: options.municipality });
  const errors = results.map((result) => result.error).filter(Boolean);
  return {
    items: filteredItems,
    source: configs.length === 1 ? configs[0].source : "ALL",
    provider: configs.length === 1 ? configs[0].provider : "Fontes externas",
    collectedAt: results.map((result) => result.collectedAt).sort().at(-1) ?? collectedAt,
    stale: results.length > 0 && results.every((result) => result.stale),
    partial: results.some((result) => result.partial || Boolean(result.error)),
    pages: results.reduce((total, result) => total + result.pages, 0),
    sources: summaries,
    ...(errors.length ? { error: "Uma ou mais fontes externas não puderam ser atualizadas agora." } : {}),
  };
}
