import { expect, test } from "@playwright/test";
import type { DiscoveryItem } from "../lib/domain";
import type { ExternalJobsResult } from "../lib/connectors/external-jobs";
import type { TerritoryData, MunicipalityAggregate } from "../lib/territory";
import { analyzeTerritory, answerTerritoryQuestion, buildTerritoryAiContext, buildTerritoryAnalysisPrompt, createMockTerritoryAiProvider, executeTerritoryQuery, validateTerritoryQueryPlan } from "../lib/ai/territory";
import { buildTerritoryEmploymentMarket } from "../lib/territory-market";

const municipalities: MunicipalityAggregate[] = [
  { municipality: "Aracaju", ibgeCode: "2800308", opportunities: 3, formal: 2, clt: 2, internship: 0, services: 1, volunteer: 0, interactions: 0, categories: [{ front: "formal", category: "Emprego", total: 2, clt: 2, internship: 0, interactions: 0 }, { front: "service", category: "Serviço", total: 1, clt: 0, internship: 0, interactions: 2 }] },
  { municipality: "Lagarto", ibgeCode: "2803500", opportunities: 2, formal: 1, clt: 1, internship: 0, services: 1, volunteer: 0, interactions: 0, categories: [{ front: "formal", category: "Emprego", total: 1, clt: 1, internship: 0, interactions: 0 }, { front: "service", category: "Serviço", total: 1, clt: 0, internship: 0, interactions: 0 }] },
];

const item = (source: "GO_SERGIPE" | "EMPREGAJU" | "IEL_SERGIPE", municipality: string) => ({ id: `${source}-${municipality}`, kind: "external_job", title: "Anúncio público", description: "Descrição", category: "Emprego", provider: source, location: { state: "SE", municipality }, source, sourceLabel: source, tags: [] } satisfies DiscoveryItem);

const external: ExternalJobsResult = {
  items: [item("GO_SERGIPE", "Aracaju"), item("GO_SERGIPE", "Aracaju"), item("EMPREGAJU", "Lagarto"), item("IEL_SERGIPE", "Lagarto")],
  source: "ALL",
  provider: "Fontes externas",
  collectedAt: "2026-10-21T12:00:00.000Z",
  stale: true,
  partial: true,
  pages: 2,
  sources: [
    { source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, count: 2, stale: true, partial: false, pages: 1 },
    { source: "EMPREGAJU", provider: "EmpregAju", enabled: true, count: 1, stale: false, partial: true, pages: 1 },
    { source: "IEL_SERGIPE", provider: "IEL Sergipe", enabled: true, count: 1, stale: false, partial: false, pages: 1 },
  ],
};

function territoryData(): TerritoryData {
  return {
    scope: "general",
    fronts: [],
    totalOpportunities: 5,
    interactions: 2,
    activeMunicipalities: 2,
    territorial: [],
    categories: [],
    employmentByRegion: [],
    municipalities,
    employmentMarket: buildTerritoryEmploymentMarket(municipalities, external),
  };
}

test.describe("IA territorial determinística", () => {
  test("contexto GO externo usa exatamente o mesmo recorte do resolvedor", () => {
    const context = buildTerritoryAiContext(territoryData(), { metric: "employment", employmentOrigin: "external", externalSource: "GO_SERGIPE", municipality: "Aracaju" });
    expect(context.scope).toMatchObject({ state: "SE", municipality: "Aracaju" });
    expect(context.employment).toMatchObject({ totalObserved: 2, oflix: 0, external: 2, bySource: { GO_SERGIPE: 2, EMPREGAJU: 0, IEL_SERGIPE: 0 } });
    expect(context.selectedMetric.totalObserved).toBe(2);
    expect(context.quality.activeOrigin).toBe("external");
    expect(context.quality.activeSource).toBe("GO_SERGIPE");
  });

  test("prompt e análise usam facts determinísticos e caveat parcial/stale", async () => {
    const context = buildTerritoryAiContext(territoryData(), { metric: "employment", employmentOrigin: "external" });
    const prompt = buildTerritoryAnalysisPrompt(context);
    expect(prompt).toContain('"totalObserved": 4');
    expect(prompt).toContain('"oflix": 0');
    expect(prompt).toContain('"external": 4');
    const result = await analyzeTerritory(context, createMockTerritoryAiProvider([{ summary: "Os anúncios estão concentrados em poucos municípios.", highlights: ["Há concentração territorial observável."], caveats: [] }]));
    expect(result.facts.some((fact) => fact.includes("4"))).toBeTruthy();
    expect(result.caveats.some((caveat) => /parcial|desatualizada/i.test(caveat))).toBeTruthy();
  });

  test("executor limita fonte GO, ordena municípios e compara sem LLM", () => {
    const context = buildTerritoryAiContext(territoryData(), { metric: "employment", employmentOrigin: "external" });
    const validated = validateTerritoryQueryPlan({ metric: "employment", aggregation: "by_municipality", employmentOrigin: "external", externalSource: "GO_SERGIPE", order: "desc", limit: 1 }, context);
    expect(validated.success).toBeTruthy();
    if (!validated.success) return;
    expect(executeTerritoryQuery(validated.plan, context).result).toEqual([{ municipality: "Aracaju", count: 2 }]);
    const compare = executeTerritoryQuery({ metric: "employment", aggregation: "compare_municipalities", employmentOrigin: "external", compareMunicipalities: ["Aracaju", "Lagarto"], order: "desc", limit: 2 }, context);
    expect(compare.result).toEqual([{ municipality: "Aracaju", count: 2 }, { municipality: "Lagarto", count: 2 }]);
  });

  test("perguntas de crescimento e escassez são recusadas com segurança", async () => {
    const context = buildTerritoryAiContext(territoryData(), { metric: "employment", employmentOrigin: "external" });
    const result = await answerTerritoryQuestion(context, "qual município está crescendo mais?", createMockTerritoryAiProvider([]));
    expect(result.answer).toMatch(/não permitem medir.*crescimento/i);
    expect(result.plan).toBeNull();
  });
});

