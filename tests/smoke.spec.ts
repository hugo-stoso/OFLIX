import { expect, test } from "@playwright/test";

test("percurso principal: perfil, descoberta, detalhe e interação", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trabalho que encontra o território." })).toBeVisible();
  await page.getByRole("link", { name: "Entrar na demonstração" }).click();
  await page.waitForURL("**/demo");
  await expect(page.getByRole("heading", { name: "Escolha uma perspectiva para entrar." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /Ana Ribeiro/ }).click();
  await expect(page.getByRole("heading", { name: "O que está se movendo perto de você." })).toBeVisible();
  await page.getByRole("link", { name: "Ver detalhe" }).first().click();
  await expect(page.getByRole("heading", { name: "Assistente de operações locais" })).toBeVisible();
  await page.getByRole("button", { name: "Candidatar-se" }).click();
  await expect(page.getByText(/candidatura foi registrada|já estava registrada/)).toBeVisible();
  await page.goto("/demo/analyst");
  await expect(page.getByRole("heading", { name: "O que as conexões começam a revelar." })).toBeVisible();
  await expect(page.getByText("Distribuição por frente")).toBeVisible();
});

test("mobile não cria overflow horizontal na landing", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
