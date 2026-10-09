import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  clearGoSergipeCache,
  fetchGoSergipeOpportunities,
  parseGoSergipeApiResponse,
  parseGoSergipePage,
} from "../lib/connectors/go-sergipe";

const fixture = (name: string) => readFileSync(resolve(__dirname, "fixtures", name), "utf8");
const jsonFixture = (name: string) => JSON.parse(fixture(name)) as unknown;

test.describe("connector do GO Sergipe", () => {
  test("normaliza fixture pública pequena sem HTML, script ou salário mensal inferido", () => {
    const parsed = parseGoSergipePage(fixture("go-sergipe-page-1.html"), { pageUrl: "https://gosergipe.se.gov.br/oportunidades" });
    const [withSalary, withoutSalary] = parsed.items;

    expect(parsed.items).toHaveLength(2);
    expect(withSalary).toMatchObject({
      kind: "external_job",
      source: "GO_SERGIPE",
      sourceLabel: "GO Sergipe",
      sourceId: "4511",
      sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/4511",
      location: { state: "SE", municipality: "Aracaju" },
      provider: "Empresa Exemplo",
      publishedAt: "2026-09-28",
      salary: "R$ 1.750,00",
      vacancies: "1 vaga",
      pcd: "also_available",
    });
    expect(withSalary.description).toBe("Apoiar rotinas administrativas. Organização e atendimento.");
    expect(withSalary.compensation).toBeUndefined();
    expect(withoutSalary).toMatchObject({ provider: "Empresa Confidencial", location: { municipality: "Lagarto" }, vacancies: "10 vagas" });
    expect(withoutSalary.salary).toBeUndefined();
    expect(withoutSalary.sourceId).toMatch(/^fingerprint-/);
    expect(withoutSalary.sourceUrl).toBe("https://gosergipe.se.gov.br/oportunidades");
  });

  test("normaliza somente campos públicos estruturados e preserva ID, CBO, contrato e PcD", () => {
    const parsed = parseGoSergipeApiResponse(jsonFixture("go-sergipe-api-page-1.json"), { collectedAt: "2026-10-09T12:00:00.000Z" });
    const [withSalary, withoutSalary] = parsed.items;

    expect(parsed.items).toHaveLength(2);
    expect(parsed.nextUrl).toBe("https://gosergipe.se.gov.br/api/oportunidades?code_uf=SE&page=2");
    expect(withSalary).toMatchObject({
      source: "GO_SERGIPE",
      sourceId: "4777",
      sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/4777",
      provider: "FIBRA RH",
      location: { municipality: "São Cristóvão", state: "SE" },
      vacancies: "4 vagas",
      salary: "2.052,88",
      contractType: "Trabalho permanente",
      education: "Superior completo",
      occupationCode: "8623-05",
      occupationLabel: "Operador de estação de tratamento de água",
      pcd: "also_available",
      publishedAt: "2026-10-08",
      deadline: "2026-10-31",
    });
    expect(withSalary.description).toBe("Operar a estação. Seguir procedimentos.");
    expect(withoutSalary).toMatchObject({ sourceId: "4778", sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/4778", pcd: "exclusive", vacancies: "1 vaga" });
    expect(withoutSalary.salary).toBeUndefined();

    const sourceWithoutId = jsonFixture("go-sergipe-api-page-1.json") as { results: Array<Record<string, unknown>> };
    delete sourceWithoutId.results[0].id;
    const fallback = parseGoSergipeApiResponse(sourceWithoutId).items[0];
    expect(fallback.sourceId).toMatch(/^fingerprint-/);
    expect(fallback.sourceUrl).toBe("https://gosergipe.se.gov.br/oportunidades");
  });

  test("deduplica por GO_SERGIPE + sourceId e segue apenas o next permitido", async () => {
    clearGoSergipeCache();
    let calls = 0;
    const result = await fetchGoSergipeOpportunities({
      fetcher: async () => {
        calls += 1;
        return new Response(JSON.stringify(calls === 1 ? jsonFixture("go-sergipe-api-page-1.json") : jsonFixture("go-sergipe-api-page-2.json")), { status: 200, headers: { "content-type": "application/json" } });
      },
      now: () => new Date("2026-10-08T12:00:00.000Z"),
    });

    expect(calls).toBe(2);
    expect(result).toMatchObject({ source: "GO_SERGIPE", stale: false, partial: false, pages: 2 });
    expect(result.items).toHaveLength(3);
    expect(new Set(result.items.map((item) => item.sourceId)).size).toBe(3);
  });

  test("não quebra com 500, timeout ou resposta que não é JSON estruturado", async () => {
    clearGoSergipeCache();
    const serverError = await fetchGoSergipeOpportunities({ fetcher: async () => new Response("erro", { status: 500 }), timeoutMs: 50 });
    expect(serverError).toMatchObject({ items: [], stale: true, partial: true });

    clearGoSergipeCache();
    const timeout = await fetchGoSergipeOpportunities({
      timeoutMs: 10,
      fetcher: async (_input, init) => new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    });
    expect(timeout).toMatchObject({ items: [], stale: true, partial: true });

    clearGoSergipeCache();
    const spa = await fetchGoSergipeOpportunities({ fetcher: async () => new Response("<html><body><div id='app'></div></body></html>", { status: 200 }) });
    expect(spa.error).toBeDefined();
    expect(spa.items).toEqual([]);
  });

  test("rejeita href de host arbitrário e mantém sourceUrl no domínio permitido", () => {
    const parsed = parseGoSergipePage(fixture("go-sergipe-page-1.html").replace("/detalheOportunidades/4511", "https://evil.example/vaga/4511"));
    expect(parsed.items[0].sourceUrl).toBe("https://gosergipe.se.gov.br/oportunidades");
    expect(parsed.items[0].sourceUrl).not.toContain("evil.example");
  });
});

const mockedExternalJobs = {
  source: "GO_SERGIPE",
  provider: "GO Sergipe",
  enabled: true,
  stale: false,
  partial: false,
  items: [
    { id: "go-sergipe-4511", kind: "external_job", title: "Assistente administrativo", description: "Rotinas administrativas.", category: "Emprego", provider: "Empresa Exemplo", location: { state: "SE", municipality: "Aracaju" }, source: "GO_SERGIPE", sourceLabel: "GO Sergipe", sourceId: "4511", sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/4511", tags: ["GO Sergipe", "Vaga externa"], salary: "R$ 1.750,00", vacancies: "1 vaga" },
    { id: "go-sergipe-4512", kind: "external_job", title: "Eletricista", description: "Manutenção.", category: "Emprego", provider: "Oficina Exemplo", location: { state: "SE", municipality: "Lagarto" }, source: "GO_SERGIPE", sourceLabel: "GO Sergipe", sourceId: "4512", sourceUrl: "https://gosergipe.se.gov.br/oportunidades", tags: ["GO Sergipe", "Vaga externa"], vacancies: "2 vagas" },
    { id: "go-sergipe-4513", kind: "external_job", title: "Motorista", description: "Entregas.", category: "Emprego", provider: "Transportes Exemplo", location: { state: "SE", municipality: "Nossa Senhora do Socorro" }, source: "GO_SERGIPE", sourceLabel: "GO Sergipe", sourceId: "4513", sourceUrl: "https://gosergipe.se.gov.br/oportunidades", tags: ["GO Sergipe", "Vaga externa"], vacancies: "3 vagas" },
  ],
};

test.describe("GO Sergipe na busca", () => {
  const mockExternalJobs = async (page: Page) => {
    await page.route("**/api/external-jobs**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockedExternalJobs) }));
  };

  test("pessoa vê proveniência, localidade, vaga e CTA externo em Empregos", async ({ page }) => {
    await mockExternalJobs(page);
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Hugo Silva/ }).click();
    await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
    await page.getByRole("button", { name: /Empregos/ }).click();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toBeVisible();
    await expect(page.getByText("Empresa Exemplo", { exact: true })).toBeVisible();
    await expect(page.getByText("Aracaju · SE", { exact: true })).toBeVisible();
    await expect(page.getByText("Fonte: GO Sergipe", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver vaga no GO Sergipe" }).first()).toBeVisible();
  });

  test("busca e filtro municipal operam sobre o dataset externo em cache", async ({ page }) => {
    await mockExternalJobs(page);
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Hugo Silva/ }).click();
    await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
    await page.getByRole("button", { name: /Empregos/ }).click();
    await page.getByPlaceholder("Buscar profissão, atividade ou oportunidade").fill("eletricista");
    await expect(page.getByRole("heading", { name: "Eletricista", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toHaveCount(0);
    await page.getByPlaceholder("Buscar profissão, atividade ou oportunidade").fill("");
    const filtersButton = page.getByRole("button", { name: "Filtros", exact: true });
    if (await filtersButton.isVisible()) await filtersButton.click();
    await page.getByLabel("Filtrar por município").selectOption({ label: "Lagarto" });
    await expect(page.getByRole("heading", { name: "Eletricista", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toHaveCount(0);
  });

  test("organização não requisita nem mistura vagas externas nas próprias oportunidades", async ({ page }) => {
    let externalRequests = 0;
    await page.route("**/api/external-jobs**", (route) => { externalRequests += 1; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockedExternalJobs) }); });
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
    await expect(page.getByRole("heading", { name: "Minhas oportunidades" })).toBeVisible();
    await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toHaveCount(0);
    expect(externalRequests).toBe(0);
  });

  test("falha externa não bloqueia as oportunidades internas", async ({ page }) => {
    await page.route("**/api/external-jobs**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "fonte indisponível" }) }));
    await page.goto("/demo");
    await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /Hugo Silva/ }).click();
    await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
    await expect(page.getByRole("status").filter({ hasText: "Não foi possível atualizar as vagas do GO Sergipe agora." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Instalações elétricas residenciais", exact: true })).toBeVisible();
  });
});
