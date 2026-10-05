import { expect, test } from "@playwright/test";
import { demoDiscoveryItems } from "../lib/discovery";
import { formatWorkOpportunityCount } from "../lib/ui-copy";

test("percurso principal: perfil, descoberta, detalhe e interação", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OFLIX é um hub territorial de oportunidades." })).toBeVisible();
  await page.getByRole("link", { name: "Entrar na demonstração" }).first().click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await expect(page.getByRole("heading", { name: "Olá, Hugo." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Buscar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Serviço hoje", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preferências", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preferências", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Escolha o que você quer acompanhar.", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /Oportunidades de trabalho/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Desenvolvimento profissional/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Áreas e atividades/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Interesses em voluntariado/ })).toBeVisible();
  await expect(page.getByLabel("Nível de escolaridade")).toHaveCount(0);
  await page.getByRole("button", { name: /Interesses em voluntariado/ }).click();
  await page.locator("label").filter({ hasText: "Educação e leitura" }).first().click({ force: true });
  await expect(page.getByRole("link", { name: /Território de referência/ })).toBeVisible();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Descubra oportunidades" })).toBeVisible();
  await expect(page.getByPlaceholder("Buscar profissão, atividade ou oportunidade")).toBeVisible();
  await expect(page.getByRole("button", { name: /Concursos/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Capacitação/ })).toBeVisible();
  await page.getByRole("button", { name: /Empregos/ }).click();
  const filtersButton = page.getByRole("button", { name: /Filtros/ });
  if (await filtersButton.isVisible()) await filtersButton.click();
  await expect(page.getByRole("heading", { name: "Estágio em comunicação territorial" })).toBeVisible();
  await page.getByRole("link", { name: "Ver detalhe" }).first().click();
  await expect(page.getByRole("heading", { name: "Assistente de operações locais" })).toBeVisible();
  await page.getByRole("button", { name: "Candidatar-se" }).click();
  await expect(page.getByText(/candidatura foi registrada|já estava registrada/)).toBeVisible({ timeout: 15_000 });
  await page.goto("/demo/analyst");
  await expect(page.getByRole("heading", { name: "Visão territorial geral restrita" })).toBeVisible();
  await page.goto("/demo");
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Observatório Território Aberto/ }).click();
  await page.waitForURL("**/demo/analyst");
  await expect(page.getByRole("heading", { name: "Entenda como oportunidades e conexões se distribuem pelo território." })).toBeVisible();
  await expect(page.getByText("Distribuição por frente")).toBeVisible();
  await expect(page.getByText("Empregos no território")).toBeVisible();
  await expect(page.getByText("Mapa coroplético municipal")).toBeVisible();
  await page.goto("/demo");
  await page.waitForURL("**/demo/analyst");
  await expect(page.getByRole("heading", { name: "Entenda como oportunidades e conexões se distribuem pelo território." })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Trocar perfil" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Trocar perfil" }).first().click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible();
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

test("API territorial agrega municípios e preserva as métricas operacionais", async ({ request }) => {
  const response = await request.get("/api/territory?profileId=profile-analista");
  expect(response.ok()).toBe(true);
  const territory = await response.json();
  expect(territory.municipalities).toEqual(expect.arrayContaining([
    expect.objectContaining({ municipality: "Aracaju", ibgeCode: "2800308" }),
    expect.objectContaining({ municipality: "Lagarto", ibgeCode: "2803500" }),
    expect.objectContaining({ municipality: "Nossa Senhora do Socorro", ibgeCode: "2804805" }),
  ]));
  expect(territory.municipalities.reduce((total: number, municipality: { opportunities: number }) => total + municipality.opportunities, 0)).toBe(territory.totalOpportunities);
  expect(territory.municipalities.reduce((total: number, municipality: { interactions: number }) => total + municipality.interactions, 0)).toBe(territory.interactions);
  expect(territory.municipalities.find((municipality: { municipality: string }) => municipality.municipality === "Lagarto")).toMatchObject({ formal: 2, clt: 1, internship: 1, services: 1, volunteer: 2, interactions: 1 });
  expect(territory.activeMunicipalities).toBe(3);
});

test("Observatório explora município, métrica e município sem registros", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Observatório Território Aberto/ }).click();
  await page.waitForURL("**/demo/analyst");
  await expect(page.getByRole("heading", { name: "Entenda como oportunidades e conexões se distribuem pelo território." })).toBeVisible();
  await expect(page.locator(".territory-map-path")).toHaveCount(75);
  await page.getByLabel("Território", { exact: true }).selectOption({ label: "Lagarto" });
  await expect(page.getByRole("heading", { name: "Lagarto", exact: true })).toBeVisible();
  await expect(page.getByText("Este recorte atualiza os indicadores")).toBeVisible();
  await expect(page.getByText("Empregos formais")).toBeVisible();
  await page.getByLabel(/Lagarto, Oportunidades/).focus();
  await page.getByLabel(/Lagarto, Oportunidades/).press("Enter");
  await expect(page.getByRole("button", { name: /Voltar para Sergipe/ })).toBeVisible();
  await page.getByRole("button", { name: "Empregos", exact: true }).click();
  await expect(page.getByText("métrica: Empregos")).toBeVisible();
  await page.getByLabel("Território", { exact: true }).selectOption({ label: "Amparo do São Francisco" });
  await expect(page.getByText("Este município ainda não possui registros na base desta demonstração.")).toBeVisible();
  await page.getByLabel("Território", { exact: true }).selectOption({ label: "Sergipe" });
  await expect(page.getByRole("heading", { name: "Sergipe", exact: true })).toBeVisible();
  await expect(page.getByText("Dados da demonstração").first()).toBeVisible();
});

test("malha local contém somente os municípios oficiais de Sergipe", async ({ request }) => {
  const response = await request.get("/geo/sergipe-municipalities-2024.geojson");
  expect(response.ok()).toBe(true);
  const geometry = await response.json();
  expect(geometry.properties).toMatchObject({ source: "IBGE Malha Municipal Digital", year: 2024, state: "SE" });
  expect(geometry.features).toHaveLength(75);
  expect(geometry.features.map((feature: { properties: { municipality: string } }) => feature.properties.municipality)).toEqual(expect.arrayContaining(["Aracaju", "Lagarto", "Nossa Senhora do Socorro"]));
  expect(geometry.features.every((feature: { properties: { state: string } }) => feature.properties.state === "SE")).toBe(true);
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
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("button", { name: /Empregos/ }).click();
  await page.getByRole("tab", { name: /Demandas/ }).click();
  await expect(page.getByRole("heading", { name: "Assistente de operações locais" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Estágio em projetos educativos" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Manutenção residencial" })).toHaveCount(0);
  await page.getByRole("tab", { name: /Ofertas/ }).click();
  await page.getByRole("button", { name: /Serviços/ }).click();
  await expect(page.getByRole("heading", { name: "Manutenção residencial" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Design e conteúdo local" })).toHaveCount(0);
});

test("organização não acessa demandas publicadas por outra organização", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("button", { name: /Empregos/ }).click();
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
  await expect(page.getByRole("region", { name: "Identidade profissional" }).getByText("Pessoa em busca de oportunidades e conexões locais.")).toBeVisible();
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
  await page.getByRole("button", { name: /Publicar oportunidade/ }).click();
  await expect(page.getByRole("heading", { name: "Publicar uma oportunidade" })).toBeVisible();
  await page.getByRole("button", { name: "Nova publicação" }).click();
  await page.getByLabel("Frente", { exact: true }).selectOption("service");
  await expect(page.getByText("Tipos de trabalho autônomo demandados")).toBeVisible();
  await page.getByRole("checkbox", { name: "Eletricista" }).check();
  await page.getByRole("checkbox", { name: "Manutenção" }).check();
  await page.getByLabel("Título").fill("Eletricista para instalação de evento");
  await page.getByLabel("Descrição completa").fill("Demanda de instalação e manutenção para uma atividade comunitária.");
  await page.locator("form").getByRole("button", { name: "Publicar oportunidade" }).click();
  await expect(page.getByText(/Publicação criada na demonstração/)).toBeVisible();
  await expect(page.getByText("Eletricista · Manutenção").first()).toBeVisible();
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).first().click();
  await page.getByRole("button", { name: /Áreas e atividades/ }).click();
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
  await expect(page.getByText(/Publicação criada na demonstração/)).toBeVisible();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("button", { name: /Serviços/ }).click();
  await page.getByRole("tab", { name: /Ofertas/ }).click();
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
  await page.getByRole("button", { name: /Oportunidades de trabalho/ }).click();
  await page.getByRole("checkbox", { name: "CLT", exact: true }).check({ force: true });
  await page.getByRole("checkbox", { name: "Voluntariado", exact: true }).check({ force: true });
  await page.getByRole("link", { name: "Perfil", exact: true }).click();
  await page.waitForURL("**/profile");
  await expect(page.getByRole("heading", { name: "Banco de talentos" })).toHaveCount(0);
  await page.getByRole("button", { name: /Território/ }).click();
  await expect(page.getByLabel("Município onde você mora")).toHaveValue("Aracaju");
  await expect(page.getByLabel("Estado onde você mora")).toHaveValue("SE");
  await page.getByLabel("Município onde você mora").fill("Lagarto");
  await page.getByRole("button", { name: /Formação/ }).click();
  await page.getByLabel("Nível de escolaridade").selectOption("Graduação");
  await page.getByRole("checkbox", { name: "Tipo de curso: Comunicação" }).check();
  await page.getByLabel("Nome do curso").fill("Comunicação social");
  await page.getByLabel("Especialização ou pós-graduação").fill("Comunicação comunitária");
  await page.getByRole("button", { name: /Currículo/ }).click();
  await page.getByLabel("Currículo em PDF ou DOCX").setInputFiles({ name: "curriculo-hugo.pdf", mimeType: "application/pdf", buffer: Buffer.from("DEMO DATA") });
  await expect(page.getByText(/Arquivo atual: curriculo-hugo.pdf/)).toBeVisible();
  await page.getByRole("button", { name: /Banco de talentos/ }).click();
  await page.getByRole("checkbox", { name: "Permitir que organizações encontrem meu perfil" }).check();
  await page.goto("/demo");
  await page.getByRole("button", { name: "Trocar perfil" }).click();
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await page.getByRole("button", { name: "Pessoas", exact: true }).first().click();
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

test("landing apresenta o hub territorial sem a definição antiga", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "OFLIX é um hub territorial de oportunidades." })).toBeVisible();
  await expect(page.getByRole("region", { name: "Exemplo da experiência OFLIX" })).toBeVisible();
  await expect(page.getByText("eletricista", { exact: true })).toBeVisible();
  await expect(page.getByText("Eletricista de manutenção", { exact: true })).toBeVisible();
  await expect(page.getByText("Eletricista instalador", { exact: true })).toBeVisible();
  await expect(page.getByText("Técnico de manutenção", { exact: true })).toBeVisible();
  await expect(page.getByText("Instalação elétrica residencial", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Uma descoberta ampla, com caminhos claros." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Negócios e poder público" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Profissionais autônomos e empresas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Da descoberta à inteligência territorial." })).toBeVisible();
  await expect(page.getByText("As entidades continuam separadas; a descoberta acontece em um só lugar.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("OFLIX conecta trabalho, serviços e voluntariado em Sergipe.", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Entrar na demonstração" }).first().click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
});

test("Home da pessoa compacta atalhos no mobile e preserva a navegação", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  const shortcuts = page.locator(".hub-shortcut");
  await expect(shortcuts).toHaveCount(5);
  const firstBox = await shortcuts.nth(0).boundingBox();
  const secondBox = await shortcuts.nth(1).boundingBox();
  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  if (page.viewportSize()?.width === 390) expect(Math.abs((firstBox?.y ?? 0) - (secondBox?.y ?? 0))).toBeLessThan(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
});

test("helper de contagem territorial trata zero, singular e plural", async () => {
  expect(formatWorkOpportunityCount(0)).toBe("Nenhuma oportunidade de trabalho");
  expect(formatWorkOpportunityCount(1)).toBe("1 oportunidade de trabalho");
  expect(formatWorkOpportunityCount(2)).toBe("2 oportunidades de trabalho");
});

test("Serviço para hoje usa a linguagem do papel de cada pessoa", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Amanda Figueiredo/ }).click();
  await expect(page.getByRole("heading", { name: "Nenhum chamado compatível agora" })).toBeVisible();
  await expect(page.getByText("Precisa de alguém hoje?", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Trocar perfil/ }).first().click();
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await expect(page.getByRole("heading", { name: "Precisa de um profissional hoje?" })).toBeVisible();
});

test("Home da organização mostra suas oportunidades antes do composer", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await expect(page.getByRole("heading", { name: "Minhas oportunidades" })).toBeVisible();
  await expect(page.getByText(/oportunidades publicadas/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Publicar demanda de trabalho" })).toHaveCount(0);
  await page.getByRole("button", { name: /Publicar oportunidade/ }).click();
  await expect(page.getByRole("heading", { name: "Publicar uma oportunidade" })).toBeVisible();
});

test("Ofertas e Demandas aparecem somente nos universos de mercado", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await expect(page.getByRole("tab", { name: /Ofertas/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Concursos/ }).click();
  await expect(page.getByRole("tab", { name: /Ofertas/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Capacitação/ }).click();
  await expect(page.getByRole("tab", { name: /Demandas/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Todos/ }).click();
  await expect(page.getByRole("heading", { name: "Curso DEMO de eletricista instalador" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Concurso DEMO para técnico de manutenção" })).toBeVisible();
  await page.getByRole("button", { name: /Serviços/ }).click();
  await expect(page.getByRole("tab", { name: /Ofertas/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Demandas/ })).toBeVisible();
});

test("Home da pessoa busca no hub, mostra território e abre atalhos", async ({ page, request }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await expect(page.getByText("Descubra oportunidades para trabalhar, aprender e crescer em Aracaju.")).toBeVisible();
  const apiResponse = await request.get("/api/opportunities");
  const payload = await apiResponse.json();
  const internalFormalInAracaju = payload.formal.filter((item: { location: { municipality: string } }) => item.location.municipality === "Aracaju").length;
  const externalJobsInAracaju = demoDiscoveryItems.filter((item) => item.kind === "external_job" && item.location.municipality === "Aracaju").length;
  const territory = page.getByRole("region", { name: "Na demonstração em Aracaju" });
  await expect(territory.getByText(formatWorkOpportunityCount(internalFormalInAracaju + externalJobsInAracaju), { exact: true })).toBeVisible();
  await page.getByLabel("O que você está procurando?").fill("eletricista");
  await page.getByRole("form", { name: "Buscar oportunidades" }).getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/\/demo\?view=discover&q=eletricista/);
  await expect(page.getByPlaceholder("Buscar profissão, atividade ou oportunidade")).toHaveValue("eletricista");
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await page.getByRole("button", { name: /Concursos/ }).click();
  await expect(page).toHaveURL(/\/demo\?view=discover&type=public_exam/);
  await expect(page.getByRole("heading", { name: "Descubra oportunidades" })).toBeVisible();
});

test("Preferências edita áreas progressivamente sem expor identidade profissional", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).first().click();
  await expect(page.getByLabel("Nível de escolaridade")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Avisos e notificações/ })).toBeVisible();
  await page.getByRole("button", { name: /Áreas e atividades/ }).click();
  await page.getByLabel("Buscar área ou profissão").fill("Eletricista");
  await page.locator("label").filter({ hasText: "Eletricista" }).first().click({ force: true });
  await expect(page.getByRole("button", { name: /Áreas e atividades.*Eletricista/ })).toBeVisible();
});

test("Buscar reúne profissão, capacitação e concurso sem expor poder público comum", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Descubra oportunidades" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Empregos/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Serviços/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Concursos/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Capacitação/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Poder público/ })).toHaveCount(0);
  await page.getByPlaceholder("Buscar profissão, atividade ou oportunidade").fill("eletricista");
  await expect(page.getByRole("heading", { name: "Instalações elétricas residenciais" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curso DEMO de eletricista instalador" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Concurso DEMO para técnico de manutenção" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Contratação DEMO de manutenção elétrica" })).toHaveCount(0);
});

test("pessoa autônoma ativa oportunidades públicas de forma explícita", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Amanda Figueiredo/ }).click();
  await page.getByRole("button", { name: "Preferências", exact: true }).first().click();
  await page.getByRole("button", { name: /Oportunidades de negócio/ }).click();
  const publicPreference = page.getByRole("checkbox", { name: "Quero acompanhar oportunidades com o poder público" });
  await expect(publicPreference).not.toBeChecked();
  await publicPreference.check();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await expect(page.getByRole("button", { name: /Poder público/ })).toBeVisible();
  await page.getByRole("button", { name: /Poder público/ }).click();
  await expect(page.getByRole("heading", { name: "Contratação DEMO de manutenção elétrica" })).toBeVisible();
});

test("detalhe preserva o contexto completo da busca", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await page.getByRole("button", { name: /Capacitação/ }).click();
  await page.getByPlaceholder("Buscar profissão, atividade ou oportunidade").fill("eletricista");
  const courseDetailLink = page.locator('a[href^="/discovery/demo-course-electrician"]');
  await expect(courseDetailLink).toHaveCount(1);
  const courseHref = await courseDetailLink.getAttribute("href");
  expect(courseHref).toContain("type%3Dcourse");
  expect(courseHref).toContain("q%3Deletricista");
  await courseDetailLink.click();
  await page.waitForURL("**/discovery/demo-course-electrician**");
  const returnLink = page.getByRole("link", { name: "Voltar para Buscar" });
  await expect(returnLink).toHaveAttribute("href", "/demo?view=discover&type=course&q=eletricista");
  await page.goto("/demo?view=discover&type=course&q=eletricista");
  await expect(page).toHaveURL(/\/demo\?view=discover&type=course&q=eletricista/);
  await expect(page.getByRole("heading", { name: "Descubra oportunidades" })).toBeVisible();
  await expect(page.getByPlaceholder("Buscar profissão, atividade ou oportunidade")).toHaveValue("eletricista");
});

test("capacidade de fornecedora controla oportunidades públicas", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Instituto Ponte Aberta/ }).click();
  await expect(page.getByRole("heading", { name: "Oportunidades com o poder público" })).toHaveCount(0);
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await expect(page.getByRole("button", { name: /Poder público/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Trocar perfil" }).first().click();
  await page.getByRole("button", { name: /Coletivo Horizonte/ }).click();
  await expect(page.getByRole("heading", { name: "Oportunidades com o poder público" })).toBeVisible();
  await page.getByRole("button", { name: "Buscar", exact: true }).first().click();
  await expect(page.getByRole("button", { name: /Poder público/ })).toBeVisible();
});

test("API pública retorna DEMO DATA sem mascarar a proveniência", async ({ request }) => {
  const response = await request.get("/api/public-opportunities");
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  expect(payload.source).toBe("DEMO_DATA");
  expect(payload.provider).toBe("PNCP");
  expect(payload.items.every((item: { source: string; demo: boolean }) => item.source === "DEMO_DATA" && item.demo)).toBe(true);
});
