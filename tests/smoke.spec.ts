import path from "node:path";
import { expect, test } from "@playwright/test";

test("percurso principal: perfil, descoberta, detalhe e interação", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "O trabalho certo, no lugar certo." })).toBeVisible();
  await page.getByRole("link", { name: "Entrar na demonstração" }).click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await expect(page.getByRole("heading", { name: "Olá, Hugo." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Serviço hoje", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preferências", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preferências", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Diga o que combina com você." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Atividades que você quer acompanhar" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Atividades de trabalho autônomo" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Interesses em voluntariado" })).toBeVisible();
  await page.getByRole("checkbox", { name: "Educação e leitura", exact: true }).check({ force: true });
  await page.getByRole("group", { name: "Interesses em voluntariado" }).getByRole("checkbox", { name: "Meio ambiente", exact: true }).check({ force: true });
  await expect(page.getByRole("heading", { name: "Oportunidades relacionadas aos seus interesses" })).toBeVisible();
  await expect(page.getByRole("link", { name: /visão territorial geral/i })).toHaveCount(0);
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("tab", { name: /Demandas/ }).click();
  const filtersButton = page.getByRole("button", { name: /Filtros/ });
  if (await filtersButton.isVisible()) await filtersButton.click();
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

test("chamado de serviço é entregue por atividade e aceito uma única vez", async ({ request }) => {
  const serviceDay = new Date().toISOString().slice(0, 10);
  const createResponse = await request.post("/api/service-calls", { data: { requesterProfileId: "profile-coletivo", activity: "Eletricista", title: `Chamado de teste ${Date.now()}`, description: "Instalação de uma luminária no espaço comunitário.", serviceDay, timeWindow: "Hoje · tarde" } });
  expect(createResponse.status()).toBe(201);
  const call = await createResponse.json();
  const compatibleResponse = await request.get("/api/service-calls?profileId=profile-rafael&activities=Eletricista");
  expect((await compatibleResponse.json()).some((item: { id: string }) => item.id === call.id)).toBe(true);
  const firstAccept = await request.post(`/api/service-calls/${call.id}/accept`, { data: { workerProfileId: "profile-rafael" } });
  expect(firstAccept.ok()).toBe(true);
  const secondAccept = await request.post(`/api/service-calls/${call.id}/accept`, { data: { workerProfileId: "profile-ana" } });
  expect(secondAccept.status()).toBe(409);
});

test("separa ofertas de pessoas e demandas de contratantes", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("tab", { name: /Demandas/ }).click();
  await expect(page.getByRole("heading", { name: "Assistente de operações locais" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estágio em projetos educativos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manutenção residencial" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Ofertas/ }).click();
  await page.getByRole("button", { name: /Serviços autônomos/ }).click();
  await expect(page.getByRole("heading", { name: "Manutenção residencial" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Design e conteúdo local" })).toHaveCount(0);
});

test("organização não acessa demandas publicadas por outra organização", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("tab", { name: /Demandas/ }).click();
  await expect(page.getByRole("heading", { name: "Assistente de operações locais" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estágio em projetos educativos" })).toHaveCount(0);
});

test("menu da conta abre perfil, configurações e saída", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Abrir menu de Hugo Silva" }).click();
  await expect(page.getByRole("menu", { name: "Menu da conta" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Meu perfil" }).click();
  await page.waitForURL("**/profile");
  await expect(page.getByRole("heading", { name: "Hugo Silva" })).toBeVisible();
  await expect(page.getByText("Pessoa em busca de oportunidades e conexões locais.")).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu de Hugo Silva" }).click();
  await page.getByRole("menuitem", { name: "Configurações" }).click();
  await page.waitForURL("**/settings");
  await expect(page.getByRole("heading", { name: "Ajuste sua experiência." })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Receber avisos de oportunidades relacionadas" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir menu de Hugo Silva" }).click();
  await page.getByRole("menuitem", { name: "Sair" }).click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible();
});

test("organização publica demanda autônoma com múltiplas atividades", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await expect(page.getByRole("heading", { name: "Publicar demanda de trabalho" })).toBeVisible();
  await page.getByRole("button", { name: "Nova demanda" }).click();
  await page.getByLabel("Frente", { exact: true }).selectOption("service");
  await expect(page.getByText("Tipos de trabalho autônomo demandados")).toBeVisible();
  await page.getByRole("checkbox", { name: "Eletricista" }).check();
  await page.getByRole("checkbox", { name: "Manutenção" }).check();
  await page.getByLabel("Título").fill("Eletricista para instalação de evento");
  await page.getByLabel("Descrição completa").fill("Demanda de instalação e manutenção para uma atividade comunitária.");
  await page.getByRole("button", { name: "Publicar demanda" }).click();
  await expect(page.getByText(/Demanda criada na demonstração/)).toBeVisible();
  await expect(page.getByText("Eletricista · Manutenção")).toBeVisible();
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).first().click();
  await page.getByRole("checkbox", { name: "Eletricista" }).check({ force: true });
  await expect(page.getByText(/nova\(s\) demanda\(s\) compatível\(is\)/)).toBeVisible();
});

test("autônomo divulga sua força de trabalho separadamente", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Amanda Figueiredo/ }).click();
  await page.getByRole("button", { name: "Oferecer meu trabalho" }).click();
  await expect(page.getByRole("heading", { name: "Ofertar força de trabalho" })).toBeVisible();
  await page.getByRole("button", { name: "Nova oferta" }).click();
  await page.locator("form").getByRole("checkbox", { name: "Eletricista" }).check();
  await page.getByLabel("Título").fill("Rafael · instalações e manutenção");
  await page.getByLabel("Descrição completa").fill("Disponibilidade para atendimentos residenciais e pequenos reparos.");
  await page.getByRole("button", { name: "Publicar oferta" }).click();
  await expect(page.getByText(/Oferta criada na demonstração/)).toBeVisible();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("tab", { name: /Ofertas/ }).click();
  await page.getByRole("button", { name: /Serviços autônomos/ }).click();
  await expect(page.getByRole("tab", { name: /Ofertas/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Rafael · instalações e manutenção" })).toBeVisible();
});

test("pessoa ou instituição abre chamado e autônomo aceita primeiro", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await page.getByRole("button", { name: "Serviço hoje", exact: true }).first().click();
  await page.getByRole("button", { name: "Chamar autônomo agora" }).click();
  await page.getByLabel("Tipo de serviço").selectOption("Manutenção");
  await page.getByLabel("O que precisa ser feito?").fill("Verificar um vazamento e trocar a conexão da pia.");
  await page.getByRole("button", { name: "Notificar autônomos" }).click();
  await expect(page.getByText(/Chamado aberto/)).toBeVisible();
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Amanda Figueiredo/ }).click();
  await page.getByRole("button", { name: "Serviço hoje", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Chamados compatíveis hoje" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aceitar primeiro" })).toBeVisible();
  await page.getByRole("button", { name: "Aceitar primeiro" }).click();
  await expect(page.getByText(/Chamado aceito/)).toBeVisible();
});

test("pessoa opta por compartilhar perfil e organização consulta banco de talentos", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Banco de talentos" })).toHaveCount(0);
  await expect(page.getByLabel("Município onde você mora")).toHaveValue("Aracaju");
  await expect(page.getByLabel("Estado onde você mora")).toHaveValue("SE");
  await page.getByLabel("Município onde você mora").fill("Lagarto");
  await page.getByRole("checkbox", { name: "CLT", exact: true }).check({ force: true });
  await page.getByRole("checkbox", { name: "Voluntariado", exact: true }).check({ force: true });
  await page.getByLabel("Nível de escolaridade").selectOption("Graduação");
  await page.getByRole("checkbox", { name: "Tipo de curso: Comunicação" }).check();
  await page.getByLabel("Nome do curso").fill("Comunicação social");
  await page.getByLabel("Especialização ou pós-graduação").fill("Comunicação comunitária");
  await page.getByLabel("Currículo no modelo OFLIX").setInputFiles(path.resolve("public/Modelo_Curriculo.docx"));
  await expect(page.getByText(/Arquivo anexado: Modelo_Curriculo.docx/)).toBeVisible();
  await page.getByRole("checkbox", { name: "Confirmo que estou usando o modelo de currículo OFLIX" }).check();
  await page.getByRole("checkbox", { name: "Permitir que instituições encontrem meu perfil" }).check();
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await page.getByRole("button", { name: "Talentos", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Base de talentos" })).toBeVisible();
  await expect(page.getByText("Hugo Silva")).toBeVisible();
  const sharedProfile = page.locator("article").filter({ hasText: "Hugo Silva" }).first();
  await expect(sharedProfile.getByText("CLT", { exact: true }).last()).toBeVisible();
  await expect(sharedProfile.getByText("Voluntariado", { exact: true }).last()).toBeVisible();
  await expect(sharedProfile.getByText("Município: Lagarto · Estado: SE")).toBeVisible();
  await expect(sharedProfile.getByText(/Escolaridade:\s*Graduação/)).toBeVisible();
  await expect(sharedProfile.getByText(/Tipo de curso:\s*Comunicação/)).toBeVisible();
  await expect(sharedProfile.getByRole("link", { name: /Baixar currículo/ })).toBeVisible();
  await expect(page.getByLabel("Filtrar escolaridade")).toBeVisible();
  await expect(page.getByLabel("Filtrar tipo de curso")).toBeVisible();
  await page.getByLabel("Pesquisar talentos").fill("Hugo");
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
