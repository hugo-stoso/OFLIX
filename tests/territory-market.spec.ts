import { expect, test } from "@playwright/test";
import type { DiscoveryItem } from "../lib/domain";
import type { ExternalJobsResult } from "../lib/connectors/external-jobs";
import type { MunicipalityAggregate } from "../lib/territory";
import { buildTerritoryEmploymentMarket, normalizeMunicipalityKey, resolveTerritoryEmploymentSelection, territoryEmploymentValue } from "../lib/territory-market";

const baseMunicipalities: MunicipalityAggregate[] = [
  { municipality: "Aracaju", ibgeCode: "2800308", opportunities: 3, formal: 2, clt: 2, internship: 0, services: 1, volunteer: 0, interactions: 0, categories: [] },
  { municipality: "Lagarto", ibgeCode: "2803500", opportunities: 1, formal: 1, clt: 0, internship: 1, services: 0, volunteer: 0, interactions: 0, categories: [] },
];

const item = (source: "GO_SERGIPE" | "EMPREGAJU" | "IEL_SERGIPE", municipality: string, kind: DiscoveryItem["kind"] = "external_job", state = "SE") => ({
  id: `${source}-${municipality}-${kind}`,
  kind,
  title: "Vaga pública de teste",
  description: "Descrição pública",
  category: "Emprego",
  provider: "Fonte pública",
  location: { state, municipality },
  source,
  sourceLabel: source,
  tags: [],
} satisfies DiscoveryItem);

const external = {
  items: [item("GO_SERGIPE", "Aracaju"), item("EMPREGAJU", " São  Cristóvão "), item("IEL_SERGIPE", "Aracaju"), item("GO_SERGIPE", "Salvador", "external_job", "BA"), item("GO_SERGIPE", "Lagarto", "formal")],
  source: "ALL",
  provider: "Fontes externas",
  collectedAt: "2026-10-21T12:00:00.000Z",
  stale: false,
  partial: true,
  pages: 3,
  sources: [
    { source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, count: 2, stale: false, partial: false, pages: 1 },
    { source: "EMPREGAJU", provider: "EmpregAju", enabled: true, count: 1, stale: false, partial: false, pages: 1 },
    { source: "IEL_SERGIPE", provider: "IEL Sergipe", enabled: true, count: 1, stale: false, partial: false, pages: 1 },
  ],
} satisfies ExternalJobsResult;

test.describe("mercado de empregos do Observatório", () => {
  test("normaliza município, restringe UF e conta anúncios, não vagas nominais", () => {
    expect(normalizeMunicipalityKey("  São  Cristóvão ")).toBe("sao cristovao");
    const market = buildTerritoryEmploymentMarket(baseMunicipalities, external);
    expect(market).toMatchObject({ total: 6, oflix: 3, external: 3, partial: true, stale: false });
    expect(market.municipalities.find((municipality) => municipality.municipality === "São Cristóvão")).toMatchObject({ external: 1, total: 1, bySource: { EMPREGAJU: 1 } });
    expect(market.municipalities.find((municipality) => municipality.municipality === "Lagarto")).toMatchObject({ oflix: 1, external: 0, total: 1 });
    expect(market.sources.find((source) => source.source === "GO_SERGIPE")?.count).toBe(1);
  });

  test("mantém origem e fonte subordinada com contagens e isolamento", () => {
    const market = buildTerritoryEmploymentMarket(baseMunicipalities, external);
    expect(resolveTerritoryEmploymentSelection(market, "all")).toMatchObject({ oflix: 3, external: 3, total: 6 });
    expect(resolveTerritoryEmploymentSelection(market, "oflix")).toMatchObject({ oflix: 3, external: 0, total: 3 });
    expect(resolveTerritoryEmploymentSelection(market, "external")).toMatchObject({ oflix: 0, external: 3, total: 3 });
    expect(resolveTerritoryEmploymentSelection(market, "external", "GO_SERGIPE")).toMatchObject({ oflix: 0, external: 1, total: 1 });
    expect(resolveTerritoryEmploymentSelection(market, "all", "EMPREGAJU")).toMatchObject({ oflix: 0, external: 1, total: 1 });
    expect(territoryEmploymentValue(market, "sao cristovao", "external", "EMPREGAJU")).toBe(1);
  });
});
