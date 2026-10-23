import { expect, test } from "@playwright/test";
import type { DiscoveryItem } from "../lib/domain";
import { buildOccupationAggregates, harmonizeOccupation, normalizeOccupationText, selectOccupationAggregates } from "../lib/occupations";

function item(input: Partial<DiscoveryItem> & Pick<DiscoveryItem, "title" | "kind" | "source">): DiscoveryItem {
  const { title, kind, source, ...rest } = input;
  return {
    id: `${source}-${title}`,
    kind,
    title,
    description: "Descrição pública",
    category: "Emprego",
    provider: "Fonte pública",
    location: { state: "SE", municipality: rest.location?.municipality ?? "Aracaju" },
    source,
    sourceLabel: source,
    tags: [],
    ...rest,
  };
}

test.describe("harmonização ocupacional OFLIX", () => {
  test("normaliza títulos equivalentes e preserva CBO/label explícitos", () => {
    expect(normalizeOccupationText("Auxiliar Administrativo")).toBe("auxiliar administrativo");
    expect(normalizeOccupationText("auxiliar administrativo ")).toBe("auxiliar administrativo");
    const cbo = harmonizeOccupation(item({ kind: "external_job", source: "GO_SERGIPE", title: "Operador de estação", occupationCode: "8623-05", occupationLabel: "Operador de estação de tratamento de água" }));
    expect(cbo).toMatchObject({ key: "cbo:8623 05", occupationCode: "8623-05", occupationLabel: "Operador de estação de tratamento de água", source: "SOURCE_CBO", confidence: "explicit" });
  });

  test("aplica regra conservadora de título e deixa ambiguidade não classificada", () => {
    const administrative = harmonizeOccupation(item({ kind: "formal", source: "OFLIX", title: "Auxiliar Administrativo" }));
    const sameTitle = harmonizeOccupation(item({ kind: "formal", source: "OFLIX", title: "auxiliar administrativo " }));
    const ambiguous = harmonizeOccupation(item({ kind: "external_job", source: "EMPREGAJU", title: "Auxiliar II" }));
    expect(administrative).toMatchObject({ key: "auxiliar administrativo", family: "ADMINISTRATION", source: "TITLE_RULE", confidence: "deterministic" });
    expect(sameTitle.key).toBe(administrative.key);
    expect(ambiguous).toMatchObject({ family: "UNCLASSIFIED", source: "UNCLASSIFIED" });
  });

  test("não reclassifica Autônomo/PJ fora de Empregos", () => {
    const autonomous = item({ kind: "external_job", source: "GO_SERGIPE", title: "Eletricista", contractType: "Autônomo" });
    const pj = item({ kind: "external_job", source: "EMPREGAJU", title: "Eletricista", contractType: "PJ" });
    expect(autonomous.kind).toBe("external_job");
    expect(pj.kind).toBe("external_job");
    expect(harmonizeOccupation(autonomous).family).toBe("CONSTRUCTION_MAINTENANCE");
    expect(harmonizeOccupation(pj).family).toBe("CONSTRUCTION_MAINTENANCE");
  });

  test("cobre títulos observados no diagnóstico sem forçar rótulos ambíguos", () => {
    const expectedFamilies = [
      ["Servente (construção civil)", "CONSTRUCTION_MAINTENANCE"],
      ["Carpinteiro", "CONSTRUCTION_MAINTENANCE"],
      ["ESTÁGIO EM ADMINISTRAÇÃO", "ADMINISTRATION"],
      ["Armador de ferragens na construção civil", "CONSTRUCTION_MAINTENANCE"],
      ["Ajudante de cozinha", "FOOD_HOSPITALITY"],
      ["Operador de empilhadeira", "LOGISTICS_TRANSPORT"],
      ["AUXILIAR DE ENFERMAGEM", "HEALTH"],
      ["Agente de Portaria", "SECURITY"],
      ["Analista de mídias sociais", "COMMUNICATION_DESIGN"],
      ["Analista de cobrança", "FINANCE_ACCOUNTING"],
      ["Operador de betoneira", "CONSTRUCTION_MAINTENANCE"],
      ["Técnico de edificações", "CONSTRUCTION_MAINTENANCE"],
      ["Operador de caldeira a vapor", "INDUSTRY_PRODUCTION"],
    ] as const;
    for (const [title, family] of expectedFamilies) expect(harmonizeOccupation(item({ kind: "external_job", source: "GO_SERGIPE", title })).family).toBe(family);
    expect(harmonizeOccupation(item({ kind: "external_job", source: "GO_SERGIPE", title: "Comprador" })).family).toBe("UNCLASSIFIED");
    expect(harmonizeOccupation(item({ kind: "external_job", source: "GO_SERGIPE", title: "Técnico em segurança do trabalho" })).family).toBe("UNCLASSIFIED");
  });

  test("agrega famílias, municípios, fontes e cobertura sem transformar vagas em postos", () => {
    const items = [
      ...Array.from({ length: 5 }, (_, index) => item({ kind: "external_job", source: "GO_SERGIPE", title: `Logística ${index + 1}`, location: { state: "SE", municipality: "Aracaju" } })),
      ...Array.from({ length: 3 }, (_, index) => item({ kind: "external_job", source: "GO_SERGIPE", title: `Auxiliar administrativo ${index + 1}`, location: { state: "SE", municipality: "Aracaju" } })),
      ...Array.from({ length: 2 }, (_, index) => item({ kind: "external_job", source: "EMPREGAJU", title: `Logística Lagarto ${index + 1}`, location: { state: "SE", municipality: "Lagarto" } })),
      ...Array.from({ length: 6 }, (_, index) => item({ kind: "external_job", source: "IEL_SERGIPE", title: `Administrativo Lagarto ${index + 1}`, location: { state: "SE", municipality: "Lagarto" } })),
    ];
    const aggregate = buildOccupationAggregates(items);
    const logistics = aggregate.families.find((family) => family.family === "LOGISTICS_TRANSPORT");
    const administration = aggregate.families.find((family) => family.family === "ADMINISTRATION");
    expect(aggregate.total).toBe(16);
    expect(aggregate.classified).toBe(16);
    expect(aggregate.unclassified).toBe(0);
    expect(aggregate.coverageRate).toBe(1);
    expect(logistics).toMatchObject({ total: 7, bySource: { GO_SERGIPE: 5, EMPREGAJU: 2 } });
    expect(logistics?.byMunicipality).toEqual([{ municipality: "Aracaju", count: 5, bySource: { OFLIX: 0, GO_SERGIPE: 5, EMPREGAJU: 0, IEL_SERGIPE: 0 } }, { municipality: "Lagarto", count: 2, bySource: { OFLIX: 0, GO_SERGIPE: 0, EMPREGAJU: 2, IEL_SERGIPE: 0 } }]);
    expect(administration).toMatchObject({ total: 9, bySource: { GO_SERGIPE: 3, IEL_SERGIPE: 6 } });
    const goOnly = selectOccupationAggregates(aggregate, { origin: "external", source: "GO_SERGIPE" });
    expect(goOnly.families.find((family) => family.family === "LOGISTICS_TRANSPORT")?.total).toBe(5);
  });
});
