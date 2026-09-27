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
  expect(opportunities.services.find((opportunity: { id: string }) => opportunity.id === "service-electrical").ownerType).toBe("PERSON");
  expect(opportunities.formal.find((opportunity: { id: string }) => opportunity.id === "formal-operations").ownerType).toBe("ORGANIZATION");

  expect((await request.get("/api/talents")).status()).toBe(401);
  expect((await request.get("/api/talents?profileId=profile-ana")).status()).toBe(403);
  expect((await request.get("/api/talents?profileId=profile-coletivo")).ok()).toBe(true);
});

test("separa ofertas institucionais e demandas de autônomos", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Ana Ribeiro/ }).click();
  await page.getByRole("tab", { name: /Demandas de trabalho/ }).click();
  await expect(page.getByRole("button", { name: /Força de trabalho autônoma/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manutenção residencial" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Design e conteúdo local" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Ofertas de trabalho/ }).click();
  await expect(page.getByRole("heading", { name: "Assistente de operações locais" })).toBeVisible();
});

test("menu da conta abre perfil, configurações e saída", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Ana Ribeiro/ }).click();
  await page.getByRole("button", { name: "Abrir menu de Ana Ribeiro" }).click();
  await expect(page.getByRole("menu", { name: "Menu da conta" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Meu perfil" }).click();
  await page.waitForURL("**/profile");
  await expect(page.getByRole("heading", { name: "Ana Ribeiro" })).toBeVisible();
  await expect(page.getByText("Pessoa em busca de oportunidades e conexões locais.")).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu de Ana Ribeiro" }).click();
  await page.getByRole("menuitem", { name: "Configurações" }).click();
  await page.waitForURL("**/settings");
  await expect(page.getByRole("heading", { name: "Ajuste sua experiência." })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Receber avisos de oportunidades relacionadas" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu de Ana Ribeiro" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible();
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

test("autônomo divulga sua força de trabalho separadamente", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Rafael Santos/ }).click();
  await expect(page.getByRole("heading", { name: "Divulgar força de trabalho" })).toBeVisible();
  await page.getByRole("button", { name: "Nova divulgação" }).click();
  await page.locator("form").getByRole("checkbox", { name: "Eletricista" }).check();
  await page.getByLabel("Título").fill("Rafael · instalações e manutenção");
  await page.getByLabel("Descrição completa").fill("Disponibilidade para atendimentos residenciais e pequenos reparos.");
  await page.getByRole("button", { name: "Publicar divulgação" }).click();
  await expect(page.getByText(/Divulgação criada na demonstração/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rafael · instalações e manutenção" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Demandas de trabalho/ })).toHaveAttribute("aria-selected", "true");
});

test("pessoa opta por compartilhar perfil e organização consulta banco de talentos", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Ana Ribeiro/ }).click();
  await expect(page.getByRole("heading", { name: "Banco de talentos" })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "CLT", exact: true }).check({ force: true });
  await page.getByRole("checkbox", { name: "Voluntariado", exact: true }).check({ force: true });
  await page.getByRole("checkbox", { name: "Permitir que instituições encontrem meu perfil" }).check();
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await expect(page.getByRole("heading", { name: "Base de talentos" })).toBeVisible();
  await expect(page.getByText("Ana Ribeiro")).toBeVisible();
  const sharedProfile = page.locator("article").filter({ hasText: "Ana Ribeiro" }).first();
  await expect(sharedProfile.getByText("CLT", { exact: true }).last()).toBeVisible();
  await expect(sharedProfile.getByText("Voluntariado", { exact: true }).last()).toBeVisible();
  await page.getByLabel("Pesquisar talentos").fill("Ana");
  await expect(page.getByRole("button", { name: "Iniciar conversa" })).toBeVisible();
  await page.getByRole("button", { name: "Iniciar conversa" }).click();
  await expect(page.getByRole("button", { name: "Negociar remuneração" })).toBeVisible();
  await page.getByRole("button", { name: "Negociar remuneração" }).click();
  await expect(page.getByPlaceholder("Escreva uma mensagem sobre o próximo passo")).toHaveValue(/remuneração/);
});

test("mobile não cria overflow horizontal na landing", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
