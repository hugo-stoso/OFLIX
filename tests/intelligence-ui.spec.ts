import { expect, Page, test } from "@playwright/test";

test.describe.configure({ timeout: 90_000 });

const verifiedJob = {
  id: "go-ui-1",
  kind: "external_job",
  title: "Analista de tecnologia",
  description: "Atuação com suporte e organização de processos.",
  category: "Tecnologia",
  provider: "Fonte pública",
  location: { state: "SE", municipality: "Aracaju" },
  source: "GO_SERGIPE",
  sourceLabel: "GO Sergipe",
  sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/go-ui-1",
  publishedAt: "2026-10-20T10:00:00Z",
  modality: "CLT",
  education: "Ensino médio",
  tags: ["Tecnologia", "Suporte"],
};

function recommendationPayload() {
  return {
    recommendations: [{ item: verifiedJob, compatibility: { score: 80, level: "Alta", matchedSignals: ["Tecnologia", "CLT", "Município: Aracaju"], gaps: [], unknowns: ["A fonte não informou requisitos detalhados suficientes para uma análise completa."], basis: "Comparação determinística." }, reasons: ["Fonte verificável: GO Sergipe."] }],
    limitations: ["Cursos reais ainda não têm um conector oficial ativo; por isso cursos DEMO DATA não são recomendados.", "Concursos e processos seletivos reais ainda não têm uma fonte oficial integrada; por isso registros DEMO DATA não são recomendados."],
    sources: [{ source: "GO_SERGIPE", provider: "GO Sergipe", count: 1, stale: false, partial: false }],
    collectedAt: "2026-10-27T10:00:00Z",
    stale: false,
    partial: false,
  };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/intelligence/recommendations**", (route) => route.fulfill({ json: recommendationPayload() }));
  await page.route("**/api/intelligence/status", (route) => route.fulfill({ json: { deterministic: true, gemini: { available: false, consentRequired: true } } }));
  await page.route("**/api/external-jobs**", (route) => route.fulfill({ json: { items: [verifiedJob], sources: [{ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, count: 1, stale: false, partial: false, pages: 1 }], stale: false, partial: false, collectedAt: "2026-10-27T10:00:00Z", source: "GO_SERGIPE", provider: "GO Sergipe", count: 1, enabled: true } }));
});

async function openPersonHome(page: Page) {
  await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const picker = page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." });
  const personHome = page.getByRole("heading", { name: "Olá, Hugo." });
  await expect(picker.or(personHome)).toBeVisible({ timeout: 60_000 });
  if (await picker.isVisible()) await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await expect(personHome).toBeVisible({ timeout: 30_000 });
}

test("pessoa recebe recomendação verificável, compatibilidade e assistente sem Gemini", async ({ page }) => {
  test.setTimeout(90_000);
  await openPersonHome(page);
  await expect(page.getByRole("heading", { name: "Recomendado com fonte verificável" })).toBeVisible();
  await expect(page.getByTestId("compatibility-result")).toContainText("Compatibilidade indicativa: Alta");
  await expect(page.getByText("DEMO DATA excluído", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Navegação principal" }).locator('button:visible', { hasText: "Assistente IA" }).click();
  await expect(page.getByRole("heading", { name: "Pergunte sobre oportunidades e carreira" })).toBeVisible();
  const geminiConsent = page.getByRole("checkbox").first();
  await expect(geminiConsent).toBeDisabled();
  await page.route("**/api/intelligence/assistant", (route) => route.fulfill({ json: { answer: "Encontrei uma oportunidade verificável.", interpretedQuery: { query: "tecnologia", terms: ["tecnologia"], kinds: ["external_job"], summary: "tema/profissão: tecnologia" }, matches: [verifiedJob], facts: ["Analista de tecnologia · Aracaju · GO Sergipe."], limitations: ["DEMO DATA não entra."], mode: "deterministic", gemini: { requested: false, available: false, used: false, reason: "not_requested" }, sources: [], stale: false, partial: false } }));
  await page.getByLabel("Pergunta para o Assistente OFLIX").fill("há vagas de tecnologia em Aracaju?");
  await page.getByRole("button", { name: "Perguntar" }).click();
  await expect(page.getByText("Resposta determinística", { exact: true })).toBeVisible();
  await expect(page.getByText("Encontrei uma oportunidade verificável.", { exact: true })).toBeVisible();
});

test("menu abre a área do Assistente IA e mantém o menu horizontal no mobile", async ({ page }) => {
  await openPersonHome(page);
  const navigation = page.getByRole("navigation", { name: "Navegação principal" });
  const assistantButton = navigation.locator('button:visible', { hasText: "Assistente IA" });
  await expect(assistantButton).toBeVisible();
  await assistantButton.click();
  await expect(page.getByRole("heading", { name: "O próximo passo começa com uma pergunta." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pergunte sobre oportunidades e carreira" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recomendado com fonte verificável" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation.locator('button:visible', { hasText: "Assistente IA" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("consentimento mostra Gemini e identifica a redação usada", async ({ page }) => {
  await page.route("**/api/intelligence/status", (route) => route.fulfill({ json: { deterministic: true, gemini: { available: true, consentRequired: true } } }));
  await page.route("**/api/intelligence/assistant", (route) => route.fulfill({ json: { answer: "Resposta contextualizada com base nas oportunidades verificadas.", interpretedQuery: { query: "vagas de tecnologia em Aracaju", terms: ["tecnologia"], kinds: ["external_job"], summary: "tema/profissão: tecnologia · município: Aracaju" }, matches: [verifiedJob], facts: ["Analista de tecnologia · Aracaju · GO Sergipe."], limitations: ["Os fatos e cartões permanecem determinísticos."], mode: "gemini", gemini: { requested: true, available: true, used: true, reason: "used" }, sources: [], stale: false, partial: false } }));
  await openPersonHome(page);
  await page.getByRole("navigation", { name: "Navegação principal" }).locator('button:visible', { hasText: "Assistente IA" }).click();
  const consent = page.getByRole("checkbox").first();
  await expect(consent).toBeEnabled();
  await consent.check();
  await page.getByLabel("Pergunta para o Assistente OFLIX").fill("há vagas de tecnologia em Aracaju?");
  await page.getByRole("button", { name: "Perguntar" }).click();
  await expect(page.getByText("Redação com Gemini", { exact: true })).toBeVisible();
  await expect(page.getByText("Resposta contextualizada com base nas oportunidades verificadas.", { exact: true })).toBeVisible();
});

test("mostra o motivo técnico do fallback e preserva o resultado salarial verificável", async ({ page }) => {
  await page.route("**/api/intelligence/status", (route) => route.fulfill({ json: { deterministic: true, gemini: { available: true, consentRequired: true } } }));
  await page.route("**/api/intelligence/assistant", (route) => route.fulfill({ json: {
    answer: "A vaga com maior remuneração mensal comparável é “Contador”, com R$ 3.500,00 por mês, em Aracaju.",
    interpretedQuery: { query: "Qual vaga possui maior salário?", terms: [], kinds: ["external_job"], summary: "universo: empregos" },
    matches: [{ ...verifiedJob, id: "contador", title: "Contador", salary: "R$ 3.500,00 por mês", salaryMin: 3500, salaryCurrency: "BRL", salaryPeriod: "MONTHLY" }],
    facts: ["Contador · Aracaju · remuneração mensal comparável: R$ 3.500,00 por mês · Fonte: GO Sergipe."],
    limitations: ["Valores sem periodicidade mensal explícita não entram na comparação."],
    mode: "fallback",
    gemini: { requested: true, available: true, used: false, reason: "invalid_output", reasonLabel: "Gemini respondeu fora do formato seguro; fallback determinístico usado." },
    sources: [], stale: false, partial: false,
  } }));
  await openPersonHome(page);
  await page.getByRole("navigation", { name: "Navegação principal" }).locator('button:visible', { hasText: "Assistente IA" }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByLabel("Pergunta para o Assistente OFLIX").fill("Qual vaga possui maior salário?");
  await page.getByRole("button", { name: "Perguntar" }).click();
  await expect(page.getByText("Fallback determinístico", { exact: true })).toBeVisible();
  await expect(page.getByText("Gemini respondeu fora do formato seguro; fallback determinístico usado.", { exact: true })).toBeVisible();
  await expect(page.getByText("Contador", { exact: true })).toBeVisible();
  await expect(page.getByText("Remuneração publicada: R$ 3.500,00 por mês", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Abrir fonte oficial/ })).toHaveAttribute("href", verifiedJob.sourceUrl);
});

test("busca natural mostra o recorte interpretado em desktop e mobile", async ({ page }) => {
  await openPersonHome(page);
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByPlaceholder("Buscar profissão, atividade ou oportunidade").fill("vaga de tecnologia em Aracaju");
  await expect(page.getByText(/Busca interpretada:/)).toBeVisible();
  await expect(page.getByText(/município: Aracaju/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Analista de tecnologia" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("sem oportunidades verificáveis informa o estado vazio sem inventar resultados", async ({ page }) => {
  await page.route("**/api/intelligence/recommendations**", (route) => route.fulfill({ json: {
    recommendations: [],
    limitations: ["Nenhuma fonte pública verificável retornou oportunidades neste momento."],
    sources: [{ source: "GO_SERGIPE", provider: "GO Sergipe", count: 0, stale: false, partial: false }],
    collectedAt: "2026-10-27T10:00:00Z",
    stale: false,
    partial: false,
  } }));
  await openPersonHome(page);
  await expect(page.getByText("Nenhuma oportunidade verificável disponível agora.", { exact: true })).toBeVisible();
  await expect(page.getByText("Nenhuma fonte pública verificável retornou oportunidades neste momento.", { exact: true })).toBeVisible();
});
