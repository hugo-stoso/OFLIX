import { expect, test } from "@playwright/test";
import { calculateSalaryResearch } from "../lib/salary-research";
import type { DiscoveryItem } from "../lib/domain";

const item = (id: string, overrides: Partial<DiscoveryItem> = {}): DiscoveryItem => ({ id, kind: "external_job", title: "Eletricista", description: "", category: "Manutenção", provider: "Fonte", location: { state: "SE", municipality: "Aracaju" }, source: "GO_SERGIPE", sourceLabel: "GO Sergipe", tags: [], ...overrides });

test("salários ausentes não viram zero e a mediana usa somente mensal", () => {
  const result = calculateSalaryResearch([item("1", { salaryMin: 1000, salaryPeriod: "MONTHLY" }), item("2", { salaryMin: 3000, salaryPeriod: "MONTHLY" }), item("3"), item("4", { salaryMin: 20, salaryPeriod: "HOURLY" })]);
  expect(result.publications).toBe(4);
  expect(result.withPublishedRemuneration).toBe(3);
  expect(result.monthlyComparable).toBe(2);
  expect(result.medianMonthly).toBe(2000);
  expect(result.publishedCoverageRate).toBe(0.75);
});

test("ocupação e município filtram o recorte", () => {
  const result = calculateSalaryResearch([item("1", { title: "Assistente administrativo", occupationLabel: "Assistente administrativo", salaryMin: 2000, salaryPeriod: "MONTHLY" }), item("2", { title: "Eletricista", salaryMin: 2500, location: { state: "SE", municipality: "Lagarto" } })], { occupation: "Assistente administrativo", municipality: "Aracaju" });
  expect(result.publications).toBe(1);
  expect(result.medianMonthly).toBe(2000);
});

test("GO raw salary is published but unknown period stays out of monthly statistics", () => {
  const result = calculateSalaryResearch([item("1", { salary: "R$ 1.600,00" })]);
  expect(result.withPublishedRemuneration).toBe(1);
  expect(result.monthlyComparable).toBe(0);
  expect(result.medianMonthly).toBeNull();
});

test("specific occupation does not silently resolve a family or unknown query", () => {
  const items = [item("1", { title: "Assistente administrativo", occupationLabel: "Assistente administrativo" }), item("2", { title: "Auxiliar administrativo", occupationLabel: "Auxiliar administrativo" })];
  expect(calculateSalaryResearch(items, { occupation: "Administração" }).occupationResolution).toBe("not_found");
  expect(calculateSalaryResearch(items, { occupation: "Assistente administrativo" }).occupationResolution).toBe("resolved");
  expect(calculateSalaryResearch(items, { occupation: "Pessoa inexistente" }).occupationResolution).toBe("not_found");
});
