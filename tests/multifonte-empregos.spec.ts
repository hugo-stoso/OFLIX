import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clearEmpregAjuCache, fetchEmpregAjuOpportunities, parseEmpregAjuPage } from "../lib/connectors/empregaju";
import { clearIelSergipeCache, fetchIelSergipeOpportunities, parseIelSergipePage } from "../lib/connectors/iel-sergipe";
import { clearExternalLifecycle, deduplicateExternalItems, markExternalLifecycle } from "../lib/connectors/external-utils";
import { discoveryItemMatchesFilter, type DiscoveryItem } from "../lib/domain";
import { rankDiscoveryItems } from "../lib/discovery";

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
    expect(clt.sourceUrl).toBe(internship.sourceUrl);
    expect(clt.sourceUrl).toBe("https://empregaju.aracaju.se.gov.br/cidadao/vagas");
  });

  test("mantém a listagem como fonte quando não há permalink e rejeita candidatura fora da allowlist", () => {
    const hostileHtml = fixture("empregaju-page-1.html").replace("https://empregaju.aracaju.se.gov.br/register", "https://evil.example/register");
    const parsed = parseEmpregAjuPage(hostileHtml);
    expect(parsed.items[0].sourceUrl).toBe("https://empregaju.aracaju.se.gov.br/cidadao/vagas");
    expect(parsed.items[0].applicationUrl).toBe("https://empregaju.aracaju.se.gov.br/register");
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
    { id: "go-sergipe-4782", kind: "external_job", title: "Técnico administrativo", description: "Atendimento e rotinas administrativas.", category: "Emprego", provider: "Empresa GO Sergipe", location: { state: "SE", municipality: "Aracaju" }, source: "GO_SERGIPE", sourceLabel: "GO Sergipe", sourceId: "4782", sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/4782", tags: ["GO Sergipe", "Vaga externa"], contractType: "CLT", modality: "Presencial", lastVerifiedAt: "2026-10-09T12:00:00.000Z" },
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
    await expect(page.getByRole("link", { name: "Ver detalhes" }).first()).toHaveAttribute("href", /\/external-jobs\/empregaju\/872/);
    await expect(page.getByRole("link", { name: "Abrir EmpregAju" }).first()).toHaveAttribute("href", "https://empregaju.aracaju.se.gov.br/cidadao/vagas");
    await expect(page.getByRole("link", { name: "Candidatar-se no EmpregAju" }).first()).toHaveAttribute("href", "https://empregaju.aracaju.se.gov.br/register");
    const filtersToggle = page.getByRole("button", { name: "Filtros", exact: true });
    if (await filtersToggle.isVisible()) await filtersToggle.click();
    await page.getByLabel("Filtrar por fonte").selectOption("IEL_SERGIPE");
    await expect(page.getByRole("heading", { name: "Estágio em administração", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toHaveCount(0);
    await page.getByLabel("Filtrar por fonte").selectOption("");
    await page.getByLabel("Filtrar por município").selectOption({ label: "Aracaju" });
    await expect(page.getByText("Fonte: EmpregAju", { exact: true })).toBeVisible();
    await expect(page.getByText("Fonte: IEL Sergipe", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Trocar perfil/ }).first().click();
    await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
    await expect(page.getByRole("heading", { name: "Minhas oportunidades" })).toBeVisible();
    expect(await page.locator("text=Assistente administrativo").count()).toBe(0);
  });

  test("separa origem e fonte, preserva a URL e combina busca com município", async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await mockExternalJobs(page);
    await page.goto("/demo");
    await page.getByRole("button", { name: /Hugo Silva/ }).click();
    await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
    await page.getByRole("button", { name: /Empregos/ }).click();
    const filtersToggle = page.getByRole("button", { name: "Filtros", exact: true });
    if (await filtersToggle.isVisible()) await filtersToggle.click();

    const origin = page.getByLabel("Filtrar por origem");
    const source = page.getByLabel("Filtrar por fonte");
    const optionTexts = await origin.locator("option").allTextContents();
    expect(optionTexts).toEqual(expect.arrayContaining([
      expect.stringMatching(/^Todas as vagas \(\d+\)$/),
      expect.stringMatching(/^Publicadas na OFLIX \(\d+\)$/),
      expect.stringMatching(/^Vagas externas \(\d+\)$/),
    ]));
    const optionCount = (label: string) => Number(optionTexts.find((text) => text.startsWith(label))?.match(/\((\d+)\)$/)?.[1] ?? -1);
    expect(optionCount("Todas as vagas")).toBeGreaterThan(optionCount("Publicadas na OFLIX"));
    expect(optionCount("Vagas externas")).toBe(3);
    await expect(page.locator("h3")).toHaveCount(optionCount("Todas as vagas"));
    expect(new URL(page.url()).searchParams.get("origin")).toBe("all");

    await expect(source.locator("option")).toContainText(["Todas as fontes", "GO Sergipe", "EmpregAju", "IEL"]);
    await origin.selectOption("oflix");
    await expect(source).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Assistente de operações locais", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("origin")).toBe("oflix");
    expect(new URL(page.url()).searchParams.has("source")).toBe(false);

    await origin.selectOption("external");
    await expect(page.getByRole("heading", { name: "Assistente de operações locais", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Técnico administrativo", exact: true })).toBeVisible();
    expect(new URL(page.url()).searchParams.get("origin")).toBe("external");
    await source.selectOption("GO_SERGIPE");
    await expect(page.getByRole("heading", { name: "Técnico administrativo", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("source")).toBe("GO_SERGIPE");
    expect(new URL(page.url()).searchParams.get("origin")).toBe("external");

    await source.selectOption("");
    await page.getByLabel("Filtrar por município").selectOption({ label: "Aracaju" });
    await page.getByLabel("Pesquisar oportunidade").fill("Assistente administrativo");
    await expect(page.getByRole("heading", { name: "Assistente administrativo", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Técnico administrativo", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Estágio em administração", exact: true })).toHaveCount(0);
    const filteredUrl = new URL(page.url());
    expect(filteredUrl.searchParams.get("origin")).toBe("external");
    expect(filteredUrl.searchParams.get("municipality")).toBe("Aracaju");
    expect(filteredUrl.searchParams.get("q")).toBe("Assistente administrativo");
  });
});

test.describe("semântica de emprego e prestação de serviços", () => {
  const item = (kind: DiscoveryItem["kind"], contractType?: string): DiscoveryItem => ({
    id: `${kind}-${contractType ?? "none"}`,
    kind,
    title: "Oportunidade de teste",
    description: "Registro sem dados pessoais.",
    category: kind === "service" ? "Manutenção" : "Emprego",
    provider: "Fonte de teste",
    location: { state: "SE", municipality: "Aracaju" },
    source: kind === "service" ? "OFLIX" : "GO_SERGIPE",
    sourceLabel: kind === "service" ? "OFLIX · publicação da demonstração" : "GO Sergipe",
    tags: [],
    contractType,
  });

  test("vaga externa Autônomo continua em Empregos e não vira prestação de serviços", () => {
    const autonomous = item("external_job", "Autônomo");
    expect(discoveryItemMatchesFilter(autonomous, "employment")).toBe(true);
    expect(discoveryItemMatchesFilter(autonomous, "service")).toBe(false);
  });

  test("vaga externa PJ continua em Empregos e não vira prestação de serviços", () => {
    const pj = item("external_job", "PJ");
    expect(discoveryItemMatchesFilter(pj, "employment")).toBe(true);
    expect(discoveryItemMatchesFilter(pj, "service")).toBe(false);
  });

  test("service aparece em Prestação de serviços, não em Empregos", () => {
    const service = item("service");
    expect(discoveryItemMatchesFilter(service, "service")).toBe(true);
    expect(discoveryItemMatchesFilter(service, "employment")).toBe(false);
  });

  test("preferência legada prioriza service sem dar boost a vaga Autônomo", () => {
    const service = item("service");
    const autonomous = item("external_job", "Autônomo");
    const ranked = rankDiscoveryItems([autonomous, service], { workPreferences: ["Serviços autônomos"] });
    expect(ranked[0].kind).toBe("service");
  });
});
