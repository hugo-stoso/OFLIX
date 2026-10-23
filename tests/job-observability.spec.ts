import { expect, test } from "@playwright/test";
import type { DiscoveryItem } from "../lib/domain";
import { createMemoryJobObservabilityStore } from "../lib/job-observability";

function item(id: string, overrides: Partial<DiscoveryItem> = {}): DiscoveryItem {
  return {
    id: `job-${id}`,
    kind: "external_job",
    title: `Vaga ${id}`,
    description: "Descrição pública",
    category: "Emprego",
    provider: "Fonte pública",
    location: { state: "SE", municipality: "Aracaju" },
    source: "GO_SERGIPE",
    sourceLabel: "GO Sergipe",
    sourceId: id,
    sourceUrl: `https://gosergipe.se.gov.br/detalheOportunidades/${id}`,
    publishedAt: "2026-01-01",
    tags: [],
    ...overrides,
  };
}

function fullCollection(collectedAt: string, sourceAvailableCount?: number) {
  return { startedAt: collectedAt, finishedAt: collectedAt, durationMs: 120, pagesRequested: 1, pagesSucceeded: 1, paginationComplete: true, sourceFetched: true, success: true, ...(sourceAvailableCount === undefined ? {} : { sourceAvailableCount }) };
}

test.describe("observabilidade de cobertura e frescor", () => {
  test("preserva firstSeen, detecta novo/atualizado/inalterado e aplica grace de desaparecimento", () => {
    const store = createMemoryJobObservabilityStore();
    const first = "2026-01-01T10:00:00.000Z";
    const second = "2026-01-01T11:00:00.000Z";
    const firstRun = store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a"), item("b"), item("c")], collectedAt: first, collection: fullCollection(first), now: new Date(first) });
    expect(firstRun).toMatchObject({ newCount: 3, updatedCount: 0, unchangedCount: 0 });
    const firstSeen = store.snapshot(new Date(first)).sources[0].latestRun?.collectedAt;
    const secondRun = store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a"), item("b", { title: "Vaga b atualizada" }), item("c"), item("d")], collectedAt: second, collection: fullCollection(second), now: new Date(second) });
    expect(secondRun).toMatchObject({ newCount: 1, updatedCount: 1, unchangedCount: 2, disappearedCount: 0 });
    expect(store.snapshot(new Date(second)).sources[0].latestRun?.collectedAt).toBe(second);
    expect(firstSeen).toBe(first);

    const third = "2026-01-01T12:00:00.000Z";
    const missingOnce = store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a"), item("b", { title: "Vaga b atualizada" }), item("d")], collectedAt: third, collection: fullCollection(third), now: new Date(third) });
    expect(missingOnce?.disappearedCount).toBe(0);
    const fourth = "2026-01-01T13:00:00.000Z";
    const missingTwice = store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a"), item("b", { title: "Vaga b atualizada" }), item("d")], collectedAt: fourth, collection: fullCollection(fourth), now: new Date(fourth) });
    expect(missingTwice?.disappearedCount).toBe(1);
    expect(store.snapshot(new Date(fourth)).sources[0].activeCount).toBe(3);
  });

  test("não marca ausência em partial, erro ou fallback stale", () => {
    const store = createMemoryJobObservabilityStore();
    const first = "2026-01-01T10:00:00.000Z";
    store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a")], collectedAt: first, collection: fullCollection(first), now: new Date(first) });
    const partial = store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [], collectedAt: "2026-01-01T11:00:00.000Z", partial: true, collection: { startedAt: "2026-01-01T11:00:00.000Z", finishedAt: "2026-01-01T11:00:00.000Z", sourceFetched: true, success: true, paginationComplete: false }, now: new Date("2026-01-01T11:00:00.000Z") });
    expect(partial?.disappearedCount).toBe(0);
    const failed = store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a")], collectedAt: "2026-01-01T12:00:00.000Z", stale: true, partial: true, error: "failed", collection: { startedAt: "2026-01-01T12:00:00.000Z", finishedAt: "2026-01-01T12:00:00.000Z", sourceFetched: true, servedFromStale: true, success: false }, now: new Date("2026-01-01T12:00:00.000Z") });
    expect(failed).toMatchObject({ success: false, servedFromStale: true, disappearedCount: 0 });
    expect(store.snapshot(new Date("2026-01-01T12:00:00.000Z")).sources[0].currentCount).toBe(1);
  });

  test("diferencia cache hit, calcula cobertura conhecida e mantém IEL parcial", () => {
    const store = createMemoryJobObservabilityStore();
    const at = "2026-01-01T10:00:00.000Z";
    store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a")], collectedAt: at, collection: fullCollection(at, 100), now: new Date(at) });
    const cache = store.recordCollection({ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, items: [item("a")], collectedAt: at, collection: { ...fullCollection(at, 100), servedFromCache: true, sourceFetched: false }, now: new Date(at) });
    expect(cache).toBeUndefined();
    const go = store.snapshot(new Date(at)).sources.find((source) => source.source === "GO_SERGIPE");
    expect(go).toMatchObject({ currentCount: 1, sourceAvailableCount: 100, coverageRate: 0.01 });

    store.recordCollection({ source: "IEL_SERGIPE", provider: "IEL Sergipe", enabled: true, items: [item("iel", { source: "IEL_SERGIPE", sourceLabel: "IEL Sergipe" })], collectedAt: at, collection: { startedAt: at, finishedAt: at, sourceFetched: true, success: true, paginationComplete: false }, now: new Date(at) });
    const iel = store.snapshot(new Date(at)).sources.find((source) => source.source === "IEL_SERGIPE");
    expect(iel).toMatchObject({ coverageMode: "PARTIAL", freshness: "FRESH" });
    expect(iel?.coverageRate).toBeUndefined();
  });

  test("calcula somente latência DATETIME e ignora data-only/futuro", () => {
    const store = createMemoryJobObservabilityStore();
    const collectedAt = "2026-01-01T10:12:00.000Z";
    store.recordCollection({ source: "EMPREGAJU", provider: "EmpregAju", enabled: true, items: [item("datetime", { source: "EMPREGAJU", sourceLabel: "EmpregAju", publishedAt: "2026-01-01T10:00:00.000Z" }), item("date", { source: "EMPREGAJU", sourceLabel: "EmpregAju", publishedAt: "2026-01-01" }), item("future", { source: "EMPREGAJU", sourceLabel: "EmpregAju", publishedAt: "2027-01-01T10:00:00.000Z" })], collectedAt, collection: { ...fullCollection(collectedAt), paginationComplete: true }, now: new Date(collectedAt) });
    const latency = store.snapshot(new Date(collectedAt)).sources[0].discoveryLatency;
    expect(latency.available).toBe(true);
    expect(latency.sampleSize).toBe(1);
    expect(latency.medianMs).toBe(12 * 60 * 1000);
  });
});
