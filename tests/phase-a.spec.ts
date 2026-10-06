import { expect, Page, test } from "@playwright/test";

const openDemo = async (page: Page) => {
  await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 60_000 });
  const picker = page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." });
  const personHome = page.getByRole("heading", { name: "Entenda melhor suas oportunidades." });
  await expect(picker.or(personHome)).toBeVisible({ timeout: 30_000 });
  return { picker, personHome };
};

test("perfis de organização expõem tipos e capacidades coerentes", async ({ request }) => {
  const response = await request.get("/api/profiles");
  expect(response.ok()).toBe(true);
  const profiles = await response.json();
  expect(profiles).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "profile-coletivo", organizationKind: "COMPANY" }),
    expect.objectContaining({ id: "profile-instituto", organizationKind: "NONPROFIT" }),
    expect.objectContaining({ id: "profile-instituicao-publica", organizationKind: "PUBLIC_INSTITUTION" }),
  ]));
  const publicProfile = profiles.find((profile: { id: string }) => profile.id === "profile-instituicao-publica");
  const formalAttempt = await request.post("/api/opportunities", { data: { ownerProfileId: publicProfile.id, kind: "formal", title: "Vaga não permitida", category: "Operações", description: "Esta publicação deve ser rejeitada pela política central." } });
  expect(formalAttempt.status()).toBe(403);
  const serviceTodayAttempt = await request.post("/api/service-calls", { data: { requesterProfileId: publicProfile.id, activity: "Educação", title: "Chamado não permitido", description: "Esta solicitação deve ser rejeitada pela política central.", serviceDay: new Date().toISOString().slice(0, 10), timeWindow: "Hoje" } });
  expect(serviceTodayAttempt.status()).toBe(400);
  expect((await request.get(`/api/talents?profileId=${publicProfile.id}`)).status()).toBe(403);
});

test("ciclo de voluntariado persiste interesse, confirmação e participação com propriedade", async ({ request }) => {
  const unique = `Ação de teste ${Date.now()}`;
  const createResponse = await request.post("/api/opportunities", { data: { ownerProfileId: "profile-instituicao-publica", kind: "volunteer", title: unique, category: "Cidadania", description: "Ação fictícia para validar o ciclo de voluntariado persistido.", schedule: "Sábado pela manhã", requirements: "Pontualidade" } });
  expect(createResponse.status()).toBe(201);
  const opportunity = await createResponse.json();
  const interestResponse = await request.post("/api/volunteer-participation", { data: { opportunityId: opportunity.id, personProfileId: "profile-ana" } });
  expect(interestResponse.status()).toBe(201);
  expect((await interestResponse.json()).participation.status).toBe("INTERESTED");
  const owned = await request.get("/api/volunteer-participation?profileId=profile-instituicao-publica").then((response) => response.json());
  const participationId = owned.owned.find((item: { opportunityId: string }) => item.opportunityId === opportunity.id).id;
  const wrongOwner = await request.patch("/api/volunteer-participation", { data: { participationId, organizerProfileId: "profile-instituto", action: "confirm" } });
  expect(wrongOwner.status()).toBe(403);
  const confirmed = await request.patch("/api/volunteer-participation", { data: { participationId, organizerProfileId: "profile-instituicao-publica", action: "confirm" } });
  expect(confirmed.ok()).toBe(true);
  const participated = await request.patch("/api/volunteer-participation", { data: { participationId, organizerProfileId: "profile-instituicao-publica", action: "participate" } });
  expect(participated.ok()).toBe(true);
  const personView = await request.get("/api/volunteer-participation?profileId=profile-ana").then((response) => response.json());
  expect(personView.person.find((item: { opportunityId: string }) => item.opportunityId === opportunity.id).status).toBe("PARTICIPATED");
});

test("seletor diferencia instituição pública e não oferece navegação de serviço", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Instituição pública", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Secretaria Demo de Cidadania/ }).click();
  await expect(page.getByRole("button", { name: "Ações", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Voluntários", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Serviço hoje", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encontrar talentos", exact: true })).toHaveCount(0);
});

test("instituição pública abre a gestão de voluntários sem banco de talentos", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Secretaria Demo de Cidadania/ }).click();
  await page.getByRole("button", { name: "Voluntários", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Acompanhe as pessoas das suas ações." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Base de talentos" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Encontrar talentos", exact: true })).toHaveCount(0);
});

test("ONG diferencia voluntários e talentos e prioriza a ação voluntária", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Instituto Ponte Aberta/ }).click();
  await expect(page.getByText("Mobilize pessoas para sua causa e acompanhe suas ações no território.")).toBeVisible();
  await page.getByRole("button", { name: "Publicar ação voluntária", exact: true }).first().click();
  await page.getByRole("button", { name: "Nova ação voluntária" }).click();
  await expect(page.getByLabel("Frente", { exact: true })).toHaveValue("volunteer");
  await page.getByRole("button", { name: "Pessoas", exact: true }).first().click();
  await expect(page.getByRole("tab", { name: "Voluntários" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Talentos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Gestão de voluntariado" })).toBeVisible();
  await page.getByRole("tab", { name: "Talentos" }).click();
  await expect(page.getByRole("heading", { name: "Base de talentos" })).toBeVisible();
});

test("Mercado & Conhecimento aparece cedo na Home de pessoa e oferece três atalhos diretos", async ({ page }) => {
  const firstLoad = await openDemo(page);
  if (await firstLoad.picker.isVisible()) await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await expect(page.getByRole("heading", { name: "Entenda melhor suas oportunidades." })).toBeVisible();

  const order = await page.evaluate(() => {
    const follows = (first: Element | null, second: Element | null) => Boolean(first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING));
    const search = document.querySelector("form[aria-label='Buscar oportunidades']");
    const market = document.querySelector("section[aria-labelledby='market-knowledge-title']");
    const territory = document.querySelector("#territory-summary-title")?.closest("section") ?? null;
    return { searchBeforeMarket: follows(search, market), marketBeforeTerritory: follows(market, territory) };
  });
  expect(order).toEqual({ searchBeforeMarket: true, marketBeforeTerritory: true });

  const shortcuts = [
    { label: "Ver Salários e mercado", url: "/market?tab=salary" },
    { label: "Consultar Legislação para trabalho e negócios", url: "/market?tab=legislation" },
    { label: "Explorar Artigos & evidências", url: "/market?tab=articles" },
  ];
  for (const shortcut of shortcuts) {
    const link = page.getByRole("link", { name: shortcut.label });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", shortcut.url);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${shortcut.url.replace("?", "\\?")}$`));
    const nextLoad = await openDemo(page);
    if (await nextLoad.picker.isVisible()) await page.getByRole("button", { name: /Hugo Silva/ }).click();
    await expect(page.getByRole("heading", { name: "Entenda melhor suas oportunidades." })).toBeVisible();
  }
});

test("Mercado & Conhecimento contextualiza empresa, ONG e instituição pública", async ({ page }) => {
  const profiles = [
    { name: /Coletivo Horizonte/, heading: "Decida com mais informação." },
    { name: /Instituto Ponte Aberta/, heading: "Conhecimento para mobilizar e gerir." },
    { name: /Secretaria Demo de Cidadania/, heading: "Referências para gestão e território." },
  ];

  for (const [index, profile] of profiles.entries()) {
    await page.goto("/demo", { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (index > 0) {
      await expect(page.getByRole("button", { name: "Trocar perfil" }).first()).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: "Trocar perfil" }).first().click();
    } else {
      await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 30_000 });
    }
    await page.getByRole("button", { name: profile.name }).click();
    await expect(page.getByRole("heading", { name: profile.heading })).toBeVisible();
    const order = await page.evaluate(() => {
      const follows = (first: Element | null, second: Element | null) => Boolean(first && second && (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING));
      const actions = document.querySelector("section[aria-label='Ações da organização']");
      const market = document.querySelector("section[aria-labelledby='market-knowledge-title']");
      const publications = document.querySelector("#organization-activity-title")?.closest("section") ?? null;
      return { actionsBeforeMarket: follows(actions, market), marketBeforePublications: follows(market, publications) };
    });
    expect(order).toEqual({ actionsBeforeMarket: true, marketBeforePublications: true });
  }
});

test("currículo livre aceita PDF e preserva o nome sem modelo obrigatório", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Hugo Silva/ }).click();
  await page.getByRole("link", { name: "Perfil", exact: true }).click();
  await page.getByRole("button", { name: /Currículo/ }).click();
  await expect(page.getByText("Currículo livre", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Baixar modelo/ })).toHaveCount(0);
  await page.getByLabel("Currículo em PDF ou DOCX").setInputFiles({ name: "curriculo-hugo.pdf", mimeType: "application/pdf", buffer: Buffer.from("DEMO DATA") });
  await expect(page.getByText("Arquivo atual: curriculo-hugo.pdf", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Banco de talentos/ }).click();
  await page.getByRole("checkbox", { name: "Permitir que organizações encontrem meu perfil" }).check();
  await expect(page.getByText("Perfil publicado no banco de talentos desta demonstração.", { exact: true })).toBeVisible();
});
