import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clearEmpregAjuCache, fetchEmpregAjuOpportunities, parseEmpregAjuPage } from "../lib/connectors/empregaju";
import { clearIelSergipeCache, fetchIelSergipeOpportunities, parseIelSergipePage } from "../lib/connectors/iel-sergipe";
import { clearExternalLifecycle, deduplicateExternalItems, markExternalLifecycle } from "../lib/connectors/external-utils";

const fixture = (name: string) => readFileSync(resolve(__dirname, "fixtures", name), "utf8");

test.describe("fontes externas de empregos em Sergipe", () => {
  test("normaliza EmpregAju sem coletar o rodapé ou dados pessoais", () => {
    const parsed = parseEmpregAjuPage(fixture("empregaju-page-1.html"), { collectedAt: "2026-10-09T12:00:00.000Z" });
    const [clt, internship] = parsed.items;
    expect(parsed.items).toHaveLength(2);
    expect(clt).toMatchObject({ source: "EMPREGAJU", sourceJobId: "872", sourceId: "872", sourceUrl: "https://empregaju.aracaju.se.gov.br/cidadao/vagas", applicationUrl: "https://empregaju.aracaju.se.gov.br/register", company: "Empresa Parceira", city: "Aracaju", state: "SE", workMode: "Presencial", contractType: "CLT", publishedAt: "2026-10-09", vacanciesCount: 1, salaryMin: 1750, salaryIsEstimated: true });
    expect(clt.description).toBe("Rotinas administrativas e atendimento.");
    expect(clt.tags).not.toContain("empregaju@aracaju.se.gov.br");
    expect(internship).toMatchObject({ sourceJobId: "873", contractType: "Estágio", workMode: "Remoto", location: { municipality: "São Cristóvão" } });
    expect(internship.salary).toBeUndefined();
  });

  test("normaliza IEL Sergipe somente a listagem HTML pública e mantém o link individual", () => {
    const parsed = parseIelSergipePage(fixture("iel-sergipe-page.html"), { collectedAt: "2026-10-09T12:00:00.000Z" });
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]).toMatchObject({ source: "IEL_SERGIPE", sourceJobId: "32115", provider: "LOCMAQ - MATRIZ", sourceUrl: "https://carreiras.iel.org.br/SE/vaga/estagio-nao-obrigatorio/32115/estagio-em-ensino-medio", applicationUrl: "https://carreiras.iel.org.br/SE/vaga/estagio-nao-obrigatorio/32115/estagio-em-ensino-medio", publishedAt: "2026-10-09", contractType: "Estágio", modality: "Presencial", salaryMin: 500, salaryCurrency: "BRL" });
    expect(parsed.items[0].description).not.toContain("Acesso Candidato");
  });

  test("percorre apenas paginação allowlisted e deduplica IDs repetidos", async () => {
    clearEmpregAjuCache();
    let calls = 0;
    const result = await fetchEmpregAjuOpportunities({
      now: () => new Date("2026-10-09T12:00:00.000Z"),
      fetcher: async (input) => {
        void input;
        calls += 1;
        return new Response(calls === 1 ? fixture("empregaju-page-1.html") : fixture("empregaju-page-2.html"), { status: 200, headers: { "content-type": "text/html" } });
      },
    });
    expect(calls).toBe(2);
    expect(result).toMatchObject({ source: "EMPREGAJU", pages: 2, stale: false, partial: false });
    expect(result.items.map((item) => item.sourceJobId)).toEqual(["872", "873", "874"]);
  });

  test("não chama paginação proibida do IEL e preserva fallback após indisponibilidade", async () => {
    clearIelSergipeCache();
    const first = await fetchIelSergipeOpportunities({ fetcher: async () => new Response(fixture("iel-sergipe-page.html"), { status: 200 }), now: () => new Date("2026-10-09T12:00:00.000Z") });
    expect(first).toMatchObject({ pages: 1, stale: false, partial: false });
    const failed = await fetchIelSergipeOpportunities({ fetcher: async () => new Response("erro", { status: 503 }), now: () => new Date("2026-10-09T17:00:00.000Z") });
    expect(failed).toMatchObject({ pages: 1, stale: true, partial: true });
    expect(failed.items).toHaveLength(2);
  });

  test("deduplicação só mescla a mesma fonte; fontes diferentes permanecem preservadas", () => {
    const base = parseEmpregAjuPage(fixture("empregaju-page-1.html")).items[0];
    const other = { ...base, id: "iel-sergipe-872", source: "IEL_SERGIPE" as const, sourceLabel: "IEL Sergipe" };
    expect(deduplicateExternalItems([base, base, other])).toHaveLength(2);
  });

  test("idempotência mantém firstSeenAt e atualiza a última verificação", () => {
    clearExternalLifecycle();
    const item = parseEmpregAjuPage(fixture("empregaju-page-1.html")).items[0];
    const first = markExternalLifecycle(item, "2026-10-09T12:00:00.000Z");
    const second = markExternalLifecycle(item, "2026-10-10T12:00:00.000Z");
    expect(first.firstSeenAt).toBe("2026-10-09T12:00:00.000Z");
    expect(second.firstSeenAt).toBe(first.firstSeenAt);
    expect(second.lastVerifiedAt).toBe("2026-10-10T12:00:00.000Z");
  });
});

const externalPayload = {
  source: "ALL",
  provider: "Fontes externas",
  enabled: true,
  stale: false,
  partial: false,
  items: [
    { id: "empregaju-872", kind: "external_job", title: "Assistente administrativo", description: "Rotinas administrativas.", category: "Emprego", provider: "Empresa Parceira", location: { state: "SE", municipality: "Aracaju" }, source: "EMPREGAJU", sourceLabel: "EmpregAju", sourceId: "872", sourceUrl: "https://empregaju.aracaju.se.gov.br/cidadao/vagas", applicationUrl: "https://empregaju.aracaju.se.gov.br/register", tags: ["EmpregAju", "Vaga externa"], contractType: "CLT", modality: "Presencial", lastVerifiedAt: "2026-10-09T12:00:00.000Z" },
    { id: "iel-sergipe-32115", kind: "external_job", title: "Estágio em administração", description: "Consulte a fonte.", category: "Emprego", provider: "Empresa IEL", location: { state: "SE", municipality: "Aracaju" }, source: "IEL_SERGIPE", sourceLabel: "IEL Sergipe", sourceId: "32115", sourceUrl: "https://carreiras.iel.org.br/SE/vaga/estagio-nao-obrigatorio/32115/estagio-em-administracao", tags: ["IEL Sergipe", "Vaga externa"], contractType: "Estágio", modality: "Presencial", lastVerifiedAt: "2026-10-09T12:00:00.000Z" },
  ],
};

test.describe("filtros multifonte na busca", () => {
  const mockExternalJobs = async (page: Page) => {
    await page.route("**/api/external-jobs**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(externalPayload) }));
  };

  test("pessoa filtra por fonte e por município sem expor a fonte para organização", async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await mockExternalJobs(page);
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Hugo Silva/ }).click();
    await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
    await page.getByRole("button", { name: /Empregos/ }).click();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Estágio em administração", exact: true })).toBeVisible();
    const filtersToggle = page.getByRole("button", { name: "Filtros", exact: true });
    if (await filtersToggle.isVisible()) await filtersToggle.click();
    await page.getByLabel("Filtrar por fonte").selectOption({ label: "IEL Sergipe" });
    await expect(page.getByRole("heading", { name: "Estágio em administração", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toHaveCount(0);
    await page.getByLabel("Filtrar por fonte").selectOption({ label: "Fontes externas" });
    await page.getByLabel("Filtrar por município").selectOption({ label: "Aracaju" });
    await expect(page.getByText("Fonte: EmpregAju", { exact: true })).toBeVisible();
    await expect(page.getByText("Fonte: IEL Sergipe", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Trocar perfil/ }).first().click();
    await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
    await expect(page.getByRole("heading", { name: "Minhas oportunidades" })).toBeVisible();
    expect(await page.locator("text=Assistente administrativo").count()).toBe(0);
  });
});
