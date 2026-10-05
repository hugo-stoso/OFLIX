import { expect, test } from "@playwright/test";
import { calculateAnnouncedCompensationAverage, validateCompensation } from "../lib/compensation";
import { getAcademicArticles, normalizeOpenAlexWork } from "../lib/connectors/openalex";

test("média anunciada usa ponto médio e exclui remuneração ausente", async () => {
  const exact = validateCompensation({ min: "2000", kind: "SALARY" }).compensation;
  const range = validateCompensation({ min: "2000", max: "3000", kind: "SALARY" }).compensation;
  expect(exact).toBeDefined();
  expect(range).toBeDefined();
  const result = calculateAnnouncedCompensationAverage([exact!, range!]);
  expect(result.average).toBe(2250);
  expect(result.observations).toBe(2);
  expect(validateCompensation({ min: "0", kind: "SALARY" }).error).toBeTruthy();
  expect(validateCompensation({ min: "3000", max: "2000", kind: "SALARY" }).error).toBeTruthy();
});

test("estágio usa bolsa e o adapter OpenAlex normaliza metadata sem payload cru", async () => {
  const stipend = validateCompensation({ min: 1200, kind: "INTERNSHIP_STIPEND" }).compensation;
  expect(stipend?.kind).toBe("INTERNSHIP_STIPEND");
  const article = normalizeOpenAlexWork({ id: "https://openalex.org/W123", display_name: "Real work", publication_year: 2025, cited_by_count: 3, doi: "https://doi.org/10/example", open_access: { is_oa: true }, primary_location: { landing_page_url: "https://doi.org/10/example", source: { display_name: "Journal" } }, authorships: [{ author: { display_name: "Author" } }] }, "productivity");
  expect(article).toMatchObject({ openAlexId: "W123", title: "Real work", year: 2025, citedByCount: 3, openAccess: true });
  expect(article?.authors).toEqual(["Author"]);
});

test("Mercado & Conhecimento diferencia média anunciada e fonte oficial", async ({ page }) => {
  await page.goto("/market?tab=salary");
  await expect(page.getByRole("heading", { name: "Mercado & Conhecimento" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Remuneração média anunciada" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Salário médio de admissão" })).toBeVisible();
  await expect(page.getByText(/não carregou uma base salarial oficial/i)).toBeVisible();
  await page.getByRole("button", { name: "Legislação para trabalho e negócios" }).click();
  await expect(page.getByRole("heading", { name: "Legislação para trabalho e negócios" })).toBeVisible();
  await expect(page.getByText("Lei do Voluntariado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Artigos & evidências" }).click();
  await expect(page.getByRole("heading", { name: "Artigos & evidências" })).toBeVisible();
  await expect(page.getByText(/citações na base OpenAlex|Carregando metadata/).first()).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("comparar com o mercado preserva município e categoria OFLIX", async ({ page }) => {
  await page.goto("/opportunity/formal-operations?kind=formal&returnTo=/demo");
  const compare = page.getByRole("link", { name: "Comparar com o mercado" });
  await expect(compare).toHaveAttribute("href", /category=Opera%C3%A7%C3%B5es.*municipality=Aracaju/);
  await compare.click();
  await expect(page).toHaveURL(/tab=salary.*category=Opera%C3%A7%C3%B5es.*municipality=Aracaju/);
  await expect(page.getByLabel("Categoria da média anunciada")).toHaveValue("Operações");
  await expect(page.getByText("Categoria OFLIX: Operações", { exact: true })).toBeVisible();
  await expect(page.getByText(/Base OFLIX · Município: Aracaju · Categoria OFLIX: Operações/)).toBeVisible();
});

test("detalhes conectam estágio, licitação e voluntariado à legislação contextual", async ({ page }) => {
  await page.goto("/opportunity/formal-communications-intern?kind=formal&returnTo=/demo");
  await expect(page.getByText(/bolsa \/ remuneração de estágio/i)).toBeVisible();
  await page.getByRole("link", { name: "Conheça a Lei do Estágio" }).click();
  await expect(page.getByRole("heading", { name: "Lei nº 11.788/2008" })).toBeVisible();
  await page.goto("/discovery/demo-public-procurement-electrical");
  await page.getByRole("link", { name: /legislação de contratações públicas/i }).click();
  await expect(page.getByRole("heading", { name: "Lei nº 14.133/2021" })).toBeVisible();
});

test("busca livre de artigos envia q ao OpenAlex e atualiza a URL", async ({ page }) => {
  const queries: string[] = [];
  await page.route("**/api/knowledge?*", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q") ?? "";
    queries.push(query);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ source: "OPENALEX", fallback: false, items: [{ openAlexId: "W-query", title: "Project management productivity evidence", authors: ["Author"], year: 2026, source: "Journal", citedByCount: 2, openAccess: true, topics: ["Gestão"], reason: "Relacionado ao tema pesquisado na base OpenAlex." }] }) });
  });
  await page.goto("/market?tab=articles");
  await page.getByLabel("Pesquisar tema").fill("gestão de projetos");
  await page.getByRole("button", { name: "Pesquisar artigos" }).click();
  await expect(page.getByRole("heading", { name: "Project management productivity evidence" })).toBeVisible();
  expect(queries).toContain("gestão de projetos");
  await expect(page).toHaveURL(/tab=articles&q=gest%C3%A3o\+de\+projetos/);
});

test("fallback do snapshot não apresenta coleção inteira para query sem correspondência", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("simulated OpenAlex outage"); }) as typeof fetch;
  try {
    const related = await getAcademicArticles({ topic: "Gestão", query: "gestão de projetos" });
    const unrelated = await getAcademicArticles({ topic: "Produtividade", query: "digitalização" });
    expect(related.items.length).toBeGreaterThan(0);
    expect(unrelated.items).toEqual([]);
    expect(unrelated.fallback).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
