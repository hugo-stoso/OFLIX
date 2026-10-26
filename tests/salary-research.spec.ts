import { expect, test } from "@playwright/test";
import { calculateSalaryResearch } from "../lib/salary-research";
import type { DiscoveryItem } from "../lib/domain";

const item = (id: string, overrides: Partial<DiscoveryItem> = {}): DiscoveryItem => ({ id, kind: "external_job", title: "Eletricista", description: "", category: "Manutenção", provider: "Fonte", location: { state: "SE", municipality: "Aracaju" }, source: "GO_SERGIPE", sourceLabel: "GO Sergipe", tags: [], ...overrides });

test("salários ausentes não viram zero e a mediana usa somente mensal", () => {
  const result = calculateSalaryResearch([item("1", { salaryMin: 1000, salaryPeriod: "MONTHLY" }), item("2", { salaryMin: 3000, salaryPeriod: "MONTHLY" }), item("3"), item("4", { salaryMin: 20, salaryPeriod: "HOURLY" })]);
  expect(result.publications).toBe(4);
  expect(result.withUsableSalary).toBe(2);
  expect(result.median).toBe(2000);
  expect(result.coverageRate).toBe(0.5);
});

test("ocupação e município filtram o recorte", () => {
  const result = calculateSalaryResearch([item("1", { title: "Assistente administrativo", salaryMin: 2000 }), item("2", { title: "Eletricista", salaryMin: 2500, location: { state: "SE", municipality: "Lagarto" } })], { occupation: "assistente", municipality: "Aracaju" });
  expect(result.publications).toBe(1);
  expect(result.median).toBe(2000);
});
