import { expect, test } from "@playwright/test";
import type { DiscoveryItem } from "../lib/domain";
import { createJobDetailProvenance, jobDetailCoverage, mergeJobDetailText, normalizeJobDetailText } from "../lib/job-details";

const item = (overrides: Partial<DiscoveryItem> = {}): DiscoveryItem => ({
  id: "detail-test",
  kind: "external_job",
  title: "Vaga pública de teste",
  description: "Descrição publicada.",
  category: "Emprego",
  provider: "Fonte de teste",
  location: { state: "SE", municipality: "Aracaju" },
  source: "GO_SERGIPE",
  sourceLabel: "GO Sergipe",
  tags: [],
  ...overrides,
});

test.describe("detalhes públicos de vagas", () => {
  test("normaliza HTML seguro sem manter script nem alterar o texto publicado", () => {
    expect(normalizeJobDetailText("<strong>CNH B</strong><br>-Disponibilidade<script>alert('x')</script>")).toBe("CNH B\n-Disponibilidade");
    expect(mergeJobDetailText("-Vale alimentação", "-Vale alimentação", "<p>Plano odontológico</p>")).toBe("-Vale alimentação\nPlano odontológico");
  });

  test("mantém ausência como undefined, sem converter em dispensa", () => {
    const publication = item({ requirements: undefined, experience: undefined, benefits: undefined });
    expect(publication.requirements).toBeUndefined();
    expect(publication.experience).toBeUndefined();
    expect(publication.benefits).toBeUndefined();
    expect(createJobDetailProvenance(publication, ["requirements", "experience", "benefits"])).toEqual([]);
  });

  test("calcula cobertura por fonte sem chamar isso de acurácia", () => {
    const coverage = jobDetailCoverage([
      item({ requirements: "CNH B", benefits: "Vale", education: "Médio", experience: "6 meses", workSchedule: "44 horas", contractType: "CLT", salary: "R$ 2.000", pcd: "also_available", jobDetailProvenance: [] }),
      item({ id: "second", source: "EMPREGAJU", sourceLabel: "EmpregAju", modality: "Presencial", contractType: "CLT" }),
      item({ id: "third", source: "EMPREGAJU", sourceLabel: "EmpregAju", modality: "Remoto" }),
    ]);
    expect(coverage).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: "GO_SERGIPE", total: 1, withRequirements: 1, withExperience: 1, withBenefits: 1, withWorkSchedule: 1, withSalary: 1, withPcd: 1 }),
      expect.objectContaining({ source: "EMPREGAJU", total: 2, withRequirements: 0, withExperience: 0, withWorkMode: 2, withContractType: 1, coverageRate: expect.objectContaining({ requirements: 0, workMode: 1 }) }),
    ]));
  });
});
