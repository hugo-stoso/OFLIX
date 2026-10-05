import { expect, test } from "@playwright/test";

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
