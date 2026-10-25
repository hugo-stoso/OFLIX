import { expect, test } from "@playwright/test";
import type { DiscoveryItem } from "../lib/domain";
import type { ExternalJobsResult } from "../lib/connectors/external-jobs";
import type { MunicipalityAggregate } from "../lib/territory";
import { aggregateObservedTerritory, buildTerritoryEmploymentMarket, normalizeMunicipalityKey, resolveTerritoryEmploymentSelection, territoryActivityCategoryOptions, territoryEmploymentValue } from "../lib/territory-market";

const baseMunicipalities: MunicipalityAggregate[] = [
  { municipality: "Aracaju", ibgeCode: "2800308", opportunities: 3, formal: 2, clt: 2, internship: 0, services: 1, volunteer: 0, interactions: 0, categories: [] },
  { municipality: "Lagarto", ibgeCode: "2803500", opportunities: 1, formal: 1, clt: 0, internship: 1, services: 0, volunteer: 0, interactions: 0, categories: [] },
];

const item = (source: "GO_SERGIPE" | "EMPREGAJU" | "IEL_SERGIPE", municipality: string, kind: DiscoveryItem["kind"] = "external_job", state = "SE", title = "Vaga pública de teste") => ({
  id: `${source}-${municipality}-${kind}`,
  kind,
  title,
  description: "Descrição pública",
  category: "Emprego",
  provider: "Fonte pública",
  location: { state, municipality },
  source,
  sourceLabel: source,
  tags: [],
} satisfies DiscoveryItem);

const external = {
  items: [item("GO_SERGIPE", "Aracaju", "external_job", "SE", "Motorista"), item("EMPREGAJU", " São  Cristóvão ", "external_job", "SE", "Vendedor"), item("IEL_SERGIPE", "Aracaju", "external_job", "SE", "Pedreiro"), item("GO_SERGIPE", "Salvador", "external_job", "BA"), item("GO_SERGIPE", "Lagarto", "formal")],
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

const municipalitiesWithOflixFronts: MunicipalityAggregate[] = [
  { ...baseMunicipalities[0], opportunities: 6, services: 2, volunteer: 1, interactions: 2, categories: [{ front: "formal", category: "Manutenção", total: 2, interactions: 3, clt: 2, internship: 0 }, { front: "service", category: "Manutenção", total: 2, interactions: 1, clt: 0, internship: 0 }, { front: "volunteer", category: "Apoio comunitário", total: 1, interactions: 1, clt: 0, internship: 0 }] },
  { ...baseMunicipalities[1], opportunities: 2, services: 1, volunteer: 0, interactions: 0, categories: [{ front: "formal", category: "Emprego", total: 1, interactions: 0, clt: 0, internship: 1 }, { front: "service", category: "Manutenção", total: 1, interactions: 0, clt: 0, internship: 0 }] },
];

const oflixFormal = { ...item("GO_SERGIPE", "Aracaju", "formal", "SE", "Oportunidade interna"), source: "OFLIX", sourceLabel: "OFLIX" } satisfies DiscoveryItem;

test.describe("mercado de empregos do Observatório", () => {
  test("normaliza município, restringe UF e conta publicações, não vagas nominais", () => {
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

  test("usa uma verdade territorial observada para frentes, fontes, município e ocupação", () => {
    const market = buildTerritoryEmploymentMarket(municipalitiesWithOflixFronts, external, [oflixFormal]);
    const all = aggregateObservedTerritory(municipalitiesWithOflixFronts, market);
    const externalOnly = aggregateObservedTerritory(municipalitiesWithOflixFronts, market, { employmentOrigin: "external" });
    const oflixOnly = aggregateObservedTerritory(municipalitiesWithOflixFronts, market, { employmentOrigin: "oflix" });
    const goOnly = aggregateObservedTerritory(municipalitiesWithOflixFronts, market, { employmentOrigin: "external", externalSource: "GO_SERGIPE" });
    const logistics = aggregateObservedTerritory(municipalitiesWithOflixFronts, market, { employmentOrigin: "external", occupationFamily: "LOGISTICS_TRANSPORT" });
    const saoCristovao = aggregateObservedTerritory(municipalitiesWithOflixFronts, market, { municipality: "São Cristóvão", employmentOrigin: "external" });

    expect(all.employment).toMatchObject({ oflix: 3, external: 3, total: 6 });
    expect(all.services).toBe(3);
    expect(all.volunteer).toBe(1);
    expect(all.opportunities).toBe(all.employment.total + all.services + all.volunteer);
    expect(externalOnly.employment.total).toBe(3);
    expect(externalOnly.services).toBe(all.services);
    expect(oflixOnly.employment).toMatchObject({ total: 3, external: 0 });
    expect(goOnly.employment.total).toBe(1);
    expect(logistics.employment.total).toBe(1);
    expect(logistics.services).toBe(all.services);
    expect(saoCristovao.municipalities).toEqual([expect.objectContaining({ municipality: "São Cristóvão", employment: 1, opportunities: 1 })]);
    expect(all.occupations.unclassified).toBeGreaterThan(0);
    expect(all.occupations.families.filter((family) => family.family !== "UNCLASSIFIED").some((family) => family.family === "LOGISTICS_TRANSPORT")).toBe(true);
    expect(all.municipalities.reduce((total, municipality) => total + municipality.opportunities, 0)).toBe(all.opportunities);
    expect(all.activeMunicipalities).toBe(3);
  });

  test("mantém atividade OFLIX restrita a serviços e voluntariado", () => {
    expect(territoryActivityCategoryOptions(municipalitiesWithOflixFronts)).toEqual(["Apoio comunitário", "Manutenção"]);
    expect(territoryActivityCategoryOptions([{ ...baseMunicipalities[0], categories: [{ front: "formal", category: "Emprego", total: 2, interactions: 2, clt: 2, internship: 0 }] }])).toEqual([]);

    const market = buildTerritoryEmploymentMarket(municipalitiesWithOflixFronts, external, [oflixFormal]);
    const all = aggregateObservedTerritory(municipalitiesWithOflixFronts, market);
    const maintenance = aggregateObservedTerritory(municipalitiesWithOflixFronts, market, { category: "Manutenção" });

    expect(all.interactions).toBe(5);
    expect(maintenance.interactions).toBe(1);
    expect(maintenance.municipalities.flatMap((municipality) => municipality.categories)).not.toContainEqual(expect.objectContaining({ front: "formal" }));
    expect(maintenance.employment).toEqual(all.employment);
    expect(maintenance.employment.total).toBe(6);
  });

  test("aplica occupationKey como filtro efetivo por município, origem e fonte", () => {
    const specificItems = [
      ...Array.from({ length: 4 }, () => item("GO_SERGIPE", "Aracaju", "external_job", "SE", "Assistente administrativo")),
      ...Array.from({ length: 1 }, () => item("EMPREGAJU", "Aracaju", "external_job", "SE", "Assistente administrativo")),
      ...Array.from({ length: 2 }, () => item("GO_SERGIPE", "Lagarto", "external_job", "SE", "Assistente administrativo")),
      ...Array.from({ length: 3 }, () => item("GO_SERGIPE", "Aracaju", "external_job", "SE", "Auxiliar administrativo")),
    ];
    const market = buildTerritoryEmploymentMarket(baseMunicipalities, { ...external, items: specificItems });
    const occupation = market.occupations.occupations.find((candidate) => candidate.label === "Assistente administrativo");
    expect(occupation).toBeTruthy();
    if (!occupation) return;
    expect(resolveTerritoryEmploymentSelection(market, "external", undefined, "ADMINISTRATION", occupation.key)).toMatchObject({ total: 7, external: 7 });
    expect(resolveTerritoryEmploymentSelection(market, "external", "GO_SERGIPE", undefined, occupation.key)).toMatchObject({ total: 6, external: 6 });
    expect(territoryEmploymentValue(market, "Aracaju", "external", undefined, undefined, occupation.key)).toBe(5);
    expect(aggregateObservedTerritory(baseMunicipalities, market, { employmentOrigin: "external", occupationKey: occupation.key }).municipalities.map((row) => [row.municipality, row.employment])).toEqual([["Aracaju", 5], ["Lagarto", 2]]);
  });
});
