import { expect, test } from "@playwright/test";

test("percurso principal: perfil, descoberta, detalhe e interação", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "O trabalho certo, no lugar certo." })).toBeVisible();
  await page.getByRole("link", { name: "Entrar na demonstração" }).click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Ana Ribeiro/ }).click();
  await expect(page.getByRole("heading", { name: "O que está se movendo perto de você." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Atividades que você quer acompanhar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Oportunidades relacionadas aos seus interesses" })).toBeVisible();
  await expect(page.getByRole("link", { name: /visão territorial geral/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "CLT", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Estágio", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Estágio", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Estágio em comunicação territorial" })).toBeVisible();
  await page.getByRole("button", { name: "CLT e estágio", exact: true }).click();
  await page.getByRole("link", { name: "Ver detalhe" }).first().click();
  await expect(page.getByRole("heading", { name: "Assistente de operações locais" })).toBeVisible();
  await page.getByRole("button", { name: "Candidatar-se" }).click();
  await expect(page.getByText(/candidatura foi registrada|já estava registrada/)).toBeVisible();
  await page.goto("/demo/analyst");
  await expect(page.getByRole("heading", { name: "Visão territorial geral restrita" })).toBeVisible();
  await page.goto("/demo");
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Observatório Território Aberto/ }).click();
  await page.waitForURL("**/demo/analyst");
  await expect(page.getByRole("heading", { name: "O que as conexões começam a revelar." })).toBeVisible();
  await expect(page.getByText("Distribuição por frente")).toBeVisible();
  await expect(page.getByText("Empregos na região")).toBeVisible();
});

test("API territorial entrega somente o escopo autorizado", async ({ request }) => {
  const missingProfile = await request.get("/api/territory");
  expect(missingProfile.status()).toBe(401);

  const scopedResponse = await request.get("/api/territory?profileId=profile-ana&activities=Comunicação");
  expect(scopedResponse.ok()).toBe(true);
  const scoped = await scopedResponse.json();
  expect(scoped.scope).toBe("interests");
  expect(scoped.matchedOpportunityCount).toBeGreaterThan(0);

  const generalResponse = await request.get("/api/territory?profileId=profile-analista");
  expect(generalResponse.ok()).toBe(true);
  const general = await generalResponse.json();
  expect(general.scope).toBe("general");
  expect(general.totalOpportunities).toBeGreaterThan(scoped.totalOpportunities);

  const opportunitiesResponse = await request.get("/api/opportunities");
  expect(opportunitiesResponse.ok()).toBe(true);
  const opportunities = await opportunitiesResponse.json();
  expect(opportunities.services.find((opportunity: { id: string }) => opportunity.id === "service-electrical").requiredActivities).toEqual(["Eletricista", "Manutenção"]);
});

test("organização publica demanda autônoma com múltiplas atividades", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await expect(page.getByRole("heading", { name: "Enviar oportunidade" })).toBeVisible();
  await page.getByRole("button", { name: "Nova oportunidade" }).click();
  await page.getByLabel("Frente", { exact: true }).selectOption("service");
  await expect(page.getByText("Tipos de trabalho autônomo demandados")).toBeVisible();
  await page.getByRole("checkbox", { name: "Eletricista" }).check();
  await page.getByRole("checkbox", { name: "Manutenção" }).check();
  await page.getByLabel("Título").fill("Eletricista para instalação de evento");
  await page.getByLabel("Descrição completa").fill("Demanda de instalação e manutenção para uma atividade comunitária.");
  await page.getByRole("button", { name: "Publicar na demonstração" }).click();
  await expect(page.getByText(/Oportunidade criada na demonstração/)).toBeVisible();
  await expect(page.getByText("Eletricista · Manutenção")).toBeVisible();
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Ana Ribeiro/ }).click();
  await page.getByRole("checkbox", { name: "Eletricista" }).check({ force: true });
  await expect(page.getByText(/nova\(s\) demanda\(s\) compatível\(is\)/)).toBeVisible();
});

test("mobile não cria overflow horizontal na landing", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
