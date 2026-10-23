const baseUrl = process.env.OFLIX_AUDIT_BASE_URL ?? "https://oflix-six.vercel.app";
const endpoint = new URL("/api/observability/jobs", baseUrl);
endpoint.searchParams.set("profileId", "profile-analista");

try {
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  const payload = await response.json();
  if (response.status < 200 || response.status >= 300 || !payload?.overview || !Array.isArray(payload.sources)) throw new Error(`status=${response.status} ou resumo de observabilidade ausente`);
  console.log(JSON.stringify({
    endpoint: endpoint.toString(),
    status: response.status,
    historyAvailable: payload.historyAvailable === true,
    overview: payload.overview,
    sources: payload.sources.map((source) => ({
      source: source.source,
      provider: source.provider,
      enabled: source.enabled,
      currentCount: source.currentCount,
      activeCount: source.activeCount,
      sourceAvailableCount: source.sourceAvailableCount ?? null,
      coverageRate: source.coverageRate ?? null,
      coverageMode: source.coverageMode,
      freshness: source.freshness,
      stale: source.stale,
      partial: source.partial,
      lastSuccessfulCollectedAt: source.lastSuccessfulCollectedAt ?? null,
      latestRun: source.latestRun ? {
        success: source.latestRun.success,
        pages: source.latestRun.pages,
        durationMs: source.latestRun.durationMs,
        collectedCount: source.latestRun.collectedCount,
        uniqueCount: source.latestRun.uniqueCount,
        newCount: source.latestRun.newCount,
        updatedCount: source.latestRun.updatedCount,
        unchangedCount: source.latestRun.unchangedCount,
        disappearedCount: source.latestRun.disappearedCount,
        servedFromCache: source.latestRun.servedFromCache,
        servedFromStale: source.latestRun.servedFromStale,
        errorCode: source.latestRun.errorCode ?? null,
      } : null,
      discoveryLatency: source.discoveryLatency,
    })),
    policy: "resumo agregado; sem itens, descrições, cookies, tokens, dumps de resposta ou stack traces",
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ endpoint: endpoint.toString(), error: error instanceof Error ? error.message : "falha desconhecida" }, null, 2));
  process.exitCode = 2;
}
