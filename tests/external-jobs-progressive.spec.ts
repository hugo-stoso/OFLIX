import { expect, test, type Page } from "@playwright/test";

type SourceParam = "go-sergipe" | "empregaju" | "iel-sergipe";

const sourceLabel: Record<SourceParam, string> = {
  "go-sergipe": "GO Sergipe",
  empregaju: "EmpregAju",
  "iel-sergipe": "IEL Sergipe",
};

function item(source: SourceParam, id: string, title: string) {
  const sourceKey = source === "go-sergipe" ? "GO_SERGIPE" : source === "empregaju" ? "EMPREGAJU" : "IEL_SERGIPE";
  return {
    id: `${source}-${id}`,
    kind: "external_job",
    title,
    description: `Oportunidade pública de ${sourceLabel[source]}.`,
    category: "Emprego",
    provider: `Empresa ${sourceLabel[source]}`,
    location: { state: "SE", municipality: "Aracaju" },
    source: sourceKey,
    sourceLabel: sourceLabel[source],
    sourceId: id,
    sourceUrl: `https://example.com/${source}/${id}`,
    tags: [sourceLabel[source], "Vaga externa"],
  };
}

function response(source: SourceParam, items: ReturnType<typeof item>[], error?: string) {
  return { source: source.toUpperCase(), provider: sourceLabel[source], enabled: true, stale: Boolean(error), partial: Boolean(error), pages: 1, sources: [{ source: source.toUpperCase(), provider: sourceLabel[source], enabled: true, count: items.length, stale: Boolean(error), partial: Boolean(error) }], items, ...(error ? { error } : {}) };
}

async function delay(milliseconds: number) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function openEmploymentSearch(page: Page) {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("button", { name: /Empregos/ }).click();
}

function mockProgressiveSources(page: Page, delays: Partial<Record<SourceParam, number>>, failing: SourceParam[] = []) {
  const requests: SourceParam[] = [];
  void page.route("**/api/external-jobs**", async (route) => {
    const source = new URL(route.request().url()).searchParams.get("source") as SourceParam;
    if (!sourceLabel[source]) return route.fallback();
    requests.push(source);
    await delay(delays[source] ?? 0);
    if (failing.includes(source)) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: `${sourceLabel[source]} indisponível` }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response(source, [item(source, "1", `${sourceLabel[source]} primeira vaga`)])) });
  });
  return requests;
}

test.describe("carregamento progressivo de vagas externas", () => {
  test("GO Sergipe aparece antes das fontes mais lentas", async ({ page }) => {
    const requests = mockProgressiveSources(page, { "go-sergipe": 50, empregaju: 3_000, "iel-sergipe": 3_500 });
    await openEmploymentSearch(page);
    await expect(page.getByRole("heading", { name: "GO Sergipe primeira vaga", exact: true })).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("heading", { name: "EmpregAju primeira vaga", exact: true })).toHaveCount(0, { timeout: 500 });
    await expect(page.getByRole("heading", { name: "IEL Sergipe primeira vaga", exact: true })).toHaveCount(0, { timeout: 500 });
    await expect(page.getByRole("heading", { name: "IEL Sergipe primeira vaga", exact: true })).toBeVisible({ timeout: 7_000 });
    expect(requests).toHaveLength(3);
  });

  test("EmpregAju aparece primeiro quando GO e IEL estão lentos", async ({ page }) => {
    mockProgressiveSources(page, { "go-sergipe": 3_000, empregaju: 50, "iel-sergipe": 3_500 });
    await openEmploymentSearch(page);
    await expect(page.getByRole("heading", { name: "EmpregAju primeira vaga", exact: true })).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("heading", { name: "GO Sergipe primeira vaga", exact: true })).toHaveCount(0, { timeout: 500 });
  });

  test("falha do IEL não bloqueia GO Sergipe e EmpregAju", async ({ page }) => {
    mockProgressiveSources(page, { "go-sergipe": 50, empregaju: 100, "iel-sergipe": 150 }, ["iel-sergipe"]);
    await openEmploymentSearch(page);
    await expect(page.getByRole("heading", { name: "GO Sergipe primeira vaga", exact: true })).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("heading", { name: "EmpregAju primeira vaga", exact: true })).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole("status").filter({ hasText: "IEL Sergipe" })).toBeVisible({ timeout: 3_000 });
  });

  test("fonte lenta não bloqueia a interface nem duplica itens", async ({ page }) => {
    await page.route("**/api/external-jobs**", async (route) => {
      const source = new URL(route.request().url()).searchParams.get("source") as SourceParam;
      await delay(source === "go-sergipe" ? 50 : 1_500);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(response(source, [item("go-sergipe", "same", "Vaga compartilhada")])) });
    });
    await openEmploymentSearch(page);
    await expect(page.getByRole("heading", { name: "Vaga compartilhada", exact: true })).toHaveCount(1, { timeout: 3_000 });
  });

  test("troca de perfil cancela resultados obsoletos", async ({ page }) => {
    mockProgressiveSources(page, { "go-sergipe": 1_000, empregaju: 1_000, "iel-sergipe": 1_000 });
    await openEmploymentSearch(page);
    await page.getByRole("button", { name: /Trocar perfil/ }).first().click();
    await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
    await expect(page.getByRole("heading", { name: "Minhas oportunidades" })).toBeVisible();
    await delay(1_200);
    await expect(page.getByRole("heading", { name: /GO Sergipe primeira vaga|EmpregAju primeira vaga|IEL Sergipe primeira vaga/ })).toHaveCount(0);
  });
});
