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
  await expect(page.getByRole("heading", { name: "O que as conexões começam a revelar." })).toBeVisible();
  await expect(page.getByText("Distribuição por frente")).toBeVisible();
  await expect(page.getByText("Empregos na região")).toBeVisible();
});

test("mobile não cria overflow horizontal na landing", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
