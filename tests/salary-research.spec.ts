import { expect, test } from "@playwright/test";
import { calculateSalaryResearch } from "../lib/salary-research";
import type { DiscoveryItem } from "../lib/domain";
import { findOccupationReference } from "../lib/occupation-catalog";
import { SERGIPE_MUNICIPALITIES } from "../lib/sergipe-municipalities";

const item = (
  id: string,
  overrides: Partial<DiscoveryItem> = {},
): DiscoveryItem => ({
  id,
  kind: "external_job",
  title: "Eletricista",
  description: "",
  category: "Manutenção",
  provider: "Fonte",
  location: { state: "SE", municipality: "Aracaju" },
  source: "GO_SERGIPE",
  sourceLabel: "GO Sergipe",
  tags: [],
  ...overrides,
});

test("salários ausentes não viram zero e a mediana usa somente mensal", () => {
  const result = calculateSalaryResearch([
    item("1", { salaryMin: 1000, salaryPeriod: "MONTHLY" }),
    item("2", { salaryMin: 3000, salaryPeriod: "MONTHLY" }),
    item("3"),
    item("4", { salaryMin: 20, salaryPeriod: "HOURLY" }),
  ]);
  expect(result.publications).toBe(4);
  expect(result.withPublishedRemuneration).toBe(3);
  expect(result.monthlyComparable).toBe(2);
  expect(result.medianMonthly).toBe(2000);
  expect(result.publishedCoverageRate).toBe(0.75);
});

test("publicações DEMO não entram nas estatísticas salariais", () => {
  const result = calculateSalaryResearch([
    item("demo", { demo: true, salaryMin: 2400, salaryPeriod: "MONTHLY" }),
    item("real", { salaryMin: 1800, salaryPeriod: "MONTHLY" }),
  ]);
  expect(result.publications).toBe(1);
  expect(result.medianMonthly).toBe(1800);
});

test("ocupação e município filtram o recorte", () => {
  const result = calculateSalaryResearch(
    [
      item("1", {
        title: "Assistente administrativo",
        occupationLabel: "Assistente administrativo",
        salaryMin: 2000,
        salaryPeriod: "MONTHLY",
      }),
      item("2", {
        title: "Eletricista",
        salaryMin: 2500,
        location: { state: "SE", municipality: "Lagarto" },
      }),
    ],
    { occupation: "Assistente administrativo", municipality: "Aracaju" },
  );
  expect(result.publications).toBe(1);
  expect(result.medianMonthly).toBe(2000);
});

test("salário GO sem prefixo monetário é publicado, mas periodicidade desconhecida fica fora da mediana mensal", () => {
  const result = calculateSalaryResearch([
    item("1", { salary: "1.600,00" }),
  ]);
  expect(result.withPublishedRemuneration).toBe(1);
  expect(result.monthlyComparable).toBe(0);
  expect(result.medianMonthly).toBeNull();
  expect(result.observations[0]).toMatchObject({ raw: "1.600,00", period: "UNKNOWN" });
});

test("observações preservam fonte e link oficial das vagas com remuneração", () => {
  const result = calculateSalaryResearch([
    item("go-1", {
      title: "Ajudante de obras",
      salary: "1.621,00",
      salaryMin: 1621,
      salaryCurrency: "BRL",
      salaryPeriod: "UNKNOWN",
      sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/4909",
    }),
  ], {}, [{ source: "GO_SERGIPE", provider: "GO Sergipe", count: 188, withPublishedRemuneration: 0, monthlyComparable: 0, stale: false, partial: false, status: "FULL" }]);
  expect(result.consultedPublications).toBe(188);
  expect(result.withPublishedRemuneration).toBe(1);
  expect(result.observations[0].sourceUrl).toContain("/4909");
  expect(result.sourceHealth[0]).toMatchObject({ count: 188, withPublishedRemuneration: 1 });
});

test("specific occupation does not silently resolve a family or unknown query", () => {
  const items = [
    item("1", {
      title: "Assistente administrativo",
      occupationLabel: "Assistente administrativo",
    }),
    item("2", {
      title: "Auxiliar administrativo",
      occupationLabel: "Auxiliar administrativo",
    }),
  ];
  expect(
    calculateSalaryResearch(items, { occupation: "Administração" })
      .occupationResolution,
  ).toBe("not_found");
  expect(
    calculateSalaryResearch(items, { occupation: "Assistente administrativo" })
      .occupationResolution,
  ).toBe("resolved");
  expect(
    calculateSalaryResearch(items, { occupation: "Pessoa inexistente" })
      .occupationResolution,
  ).toBe("not_found");
});

test("CBO, estado e município são filtros independentes", () => {
  const items = [
    item("se", {
      occupationCode: "411010",
      salaryMin: 2200,
      salaryPeriod: "MONTHLY",
    }),
    item("br", {
      occupationCode: "411010",
      salaryMin: 3000,
      salaryPeriod: "MONTHLY",
      location: { state: "SP", municipality: "São Paulo" },
    }),
  ];
  const result = calculateSalaryResearch(items, {
    occupationCode: "411010",
    state: "SE",
    municipality: "Aracaju",
  });
  expect(result.publications).toBe(1);
  expect(result.medianMonthly).toBe(2200);
});

test("catálogo CBO resolve nome, sinônimo e código sem depender de vagas", () => {
  expect(findOccupationReference("assistente de escritório")?.cbo).toBe(
    "411010",
  );
  expect(findOccupationReference(undefined, "4110-10")?.label).toBe(
    "Assistente administrativo",
  );
  expect(
    calculateSalaryResearch([], {
      occupation: "Eletricista",
      municipality: "Canindé de São Francisco",
    }),
  ).toMatchObject({
    publications: 0,
    occupationResolution: "resolved",
    query: {
      occupation: "Eletricista",
      municipality: "Canindé de São Francisco",
    },
  });
});

test("catálogo IBGE mantém os 75 municípios de Sergipe selecionáveis sem vagas", () => {
  expect(SERGIPE_MUNICIPALITIES).toHaveLength(75);
  expect(SERGIPE_MUNICIPALITIES).toEqual(
    expect.arrayContaining([
      { ibgeCode: "2800100", name: "Amparo do São Francisco" },
      { ibgeCode: "2807600", name: "Umbaúba" },
    ]),
  );
});
