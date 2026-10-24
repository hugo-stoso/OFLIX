import { expect, test } from "@playwright/test";

test.describe("UI da inteligência territorial", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("oflix-demo-profile", "profile-analista"));
  });

  test("renderiza análise, fatos, pergunta e leitura aplicada com provider mockado", async ({ page }) => {
    await page.route("**/api/territory/ai/status**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: true }) }));
    await page.route("**/api/territory/ai/analyze", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summary: "Os dados disponíveis mostram concentração descritiva no recorte.", highlights: ["Há um município no topo do recorte."], facts: ["Empregos: 2 OFLIX e 3 externos."], caveats: ["As contagens representam publicações de vagas disponíveis nas fontes integradas."], generatedAt: new Date().toISOString(), filters: { metric: "employment", metricLabel: "Empregos", employmentOrigin: "external" } }) }));
    await page.route("**/api/territory/ai/ask", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ answer: "Aracaju aparece no topo neste recorte.", facts: ["Aracaju: 3 publicações de vagas observadas."], caveat: "As contagens representam publicações de vagas disponíveis nas fontes integradas.", interpretedQuery: "Empregos · Vagas externas · Todos os municípios", plan: { metric: "employment", aggregation: "by_municipality", employmentOrigin: "external", order: "desc", limit: 1 } }) }));
    await page.goto("/demo/analyst");
    await expect(page.getByRole("heading", { name: "Leitura assistida por IA" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Gerar análise" }).click();
    await expect(page.getByText("Os dados disponíveis mostram concentração descritiva no recorte.")).toBeVisible();
    await expect(page.getByText("As contagens representam publicações de vagas disponíveis nas fontes integradas.")).toBeVisible();
    await expect(page.getByLabel("Pergunta ao território")).toHaveAttribute("placeholder", "Ex.: qual município tem mais vagas publicadas pelo GO Sergipe?");
    await page.getByLabel("Pergunta ao território").fill("qual município tem mais anúncios?");
    await page.getByRole("button", { name: "Perguntar" }).click();
    await expect(page.getByText("Aracaju aparece no topo neste recorte.")).toBeVisible();
    await expect(page.getByText("Aracaju: 3 publicações de vagas observadas.")).toBeVisible();
    await expect(page.getByText("Empregos · Vagas externas · Todos os municípios")).toBeVisible();
  });

  test("feature flag desligada mantém o Observatório disponível sem o painel", async ({ page }) => {
    await page.route("**/api/territory/ai/status**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: false }) }));
    await page.goto("/demo/analyst");
    await expect(page.getByRole("heading", { name: "Comece pelo território" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leitura assistida por IA" })).toHaveCount(0);
  });

  test("filtro ocupacional atualiza mapa, ranking e resumo no recorte de empregos", async ({ page }) => {
    await page.route("**/api/territory/ai/status**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: false }) }));
    await page.goto("/demo/analyst");
    await page.getByRole("button", { name: "Empregos", exact: true }).click();
    await page.getByLabel("Área ocupacional").selectOption("LOGISTICS_TRANSPORT");
    await expect(page.getByText("Área ocupacional: Logística e transporte").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Lagarto.*1.*Empregos/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Municípios com maior atividade observada" })).toBeVisible();
  });

  test("exibe saúde agregada das fontes sem depender do painel de IA", async ({ page }) => {
    await page.route("**/api/territory/ai/status**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: false }) }));
    await page.route("**/api/observability/jobs**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ historyAvailable: false, historyReason: "Histórico de teste indisponível.", overview: { currentCount: 3, activeCount: 3, sourceCount: 3, freshSourceCount: 2, staleSourceCount: 0, partialSourceCount: 1, newCount: 3 }, sources: [{ source: "GO_SERGIPE", provider: "GO Sergipe", enabled: true, currentCount: 2, activeCount: 2, coverageMode: "FULL", sourceAvailableCount: 2, coverageRate: 1, freshness: "FRESH", stale: false, partial: false, latestRun: { newCount: 2, updatedCount: 0, unchangedCount: 0, disappearedCount: 0, pages: 1, durationMs: 20, servedFromStale: false }, discoveryLatency: { available: false, sampleSize: 0 } }, { source: "EMPREGAJU", provider: "EmpregAju", enabled: true, currentCount: 1, activeCount: 1, coverageMode: "FULL", freshness: "FRESH", stale: false, partial: false, latestRun: { newCount: 1, updatedCount: 0, unchangedCount: 0, disappearedCount: 0, pages: 1, durationMs: 20, servedFromStale: false }, discoveryLatency: { available: false, sampleSize: 0 } }, { source: "IEL_SERGIPE", provider: "IEL Sergipe", enabled: true, currentCount: 0, activeCount: 0, coverageMode: "PARTIAL", freshness: "FRESH", stale: false, partial: true, latestRun: { newCount: 0, updatedCount: 0, unchangedCount: 0, disappearedCount: 0, pages: 1, durationMs: 20, servedFromStale: false }, discoveryLatency: { available: false, sampleSize: 0 } }], methodology: { identity: "identity", disappearance: "absence", latency: "latency", cache: "cache" } }) }));
    await page.goto("/demo/analyst");
    await expect(page.getByRole("heading", { name: "Cobertura e atualização" })).toBeVisible();
    await expect(page.getByText("Publicações de vagas", { exact: true })).toBeVisible();
    await expect(page.getByText("Histórico ainda não disponível para calcular latência de descoberta.")).toBeVisible();
    await expect(page.getByRole("article", { name: "Saúde da fonte GO Sergipe" })).toBeVisible();
  });
});

