import { expect, test } from "@playwright/test";

test.describe("UI da inteligência territorial", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("oflix-demo-profile", "profile-analista"));
  });

  test("renderiza análise, fatos, pergunta e leitura aplicada com provider mockado", async ({ page }) => {
    await page.route("**/api/territory/ai/status**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: true }) }));
    await page.route("**/api/territory/ai/analyze", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summary: "Os dados disponíveis mostram concentração descritiva no recorte.", highlights: ["Há um município no topo do recorte."], facts: ["Empregos: 2 OFLIX e 3 externos."], caveats: ["Contagens representam anúncios observados."], generatedAt: new Date().toISOString(), filters: { metric: "employment", metricLabel: "Empregos", employmentOrigin: "external" } }) }));
    await page.route("**/api/territory/ai/ask", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ answer: "Aracaju aparece no topo neste recorte.", facts: ["Aracaju: 3 anúncios observados."], caveat: "Contagens representam anúncios observados.", interpretedQuery: "Empregos · Vagas externas · Todos os municípios", plan: { metric: "employment", aggregation: "by_municipality", employmentOrigin: "external", order: "desc", limit: 1 } }) }));
    await page.goto("/demo/analyst");
    await expect(page.getByRole("heading", { name: "Leitura assistida por IA" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Gerar análise" }).click();
    await expect(page.getByText("Os dados disponíveis mostram concentração descritiva no recorte.")).toBeVisible();
    await page.getByLabel("Pergunta ao território").fill("qual município tem mais anúncios?");
    await page.getByRole("button", { name: "Perguntar" }).click();
    await expect(page.getByText("Aracaju aparece no topo neste recorte.")).toBeVisible();
    await expect(page.getByText("Empregos · Vagas externas · Todos os municípios")).toBeVisible();
  });

  test("feature flag desligada mantém o Observatório disponível sem o painel", async ({ page }) => {
    await page.route("**/api/territory/ai/status**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ enabled: false }) }));
    await page.goto("/demo/analyst");
    await expect(page.getByRole("heading", { name: "Comece pelo território" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leitura assistida por IA" })).toHaveCount(0);
  });
});

