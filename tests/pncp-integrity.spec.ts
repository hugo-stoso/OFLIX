import { expect, test } from "@playwright/test";
import { GET } from "../app/api/public-opportunities/route";

test.describe("integridade PNCP live/DEMO", () => {
  const originalFetch = globalThis.fetch;
  test.afterEach(() => { globalThis.fetch = originalFetch; });

  test("live success with records never appends DEMO DATA", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ data: [{ numeroControlePNCP: "123", objetoCompra: "Serviço de manutenção", municipioNome: "Aracaju", ufSigla: "SE" }] }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
    const response = await GET(new Request("http://localhost/api/public-opportunities?live=1"));
    const body = await response.json();
    expect(body.fallback).toBe(false);
    expect(body.items.length).toBe(1);
    expect(body.items.every((item: { source: string; demo?: boolean }) => item.source === "PNCP" && item.demo === false)).toBe(true);
  });

  test("live zero is preserved as a valid empty response", async () => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
    const response = await GET(new Request("http://localhost/api/public-opportunities?live=1&text=zero-test"));
    const body = await response.json();
    expect(body.fallback).toBe(false);
    expect(body.items).toEqual([]);
  });

  test("unavailable live source exposes explicit DEMO fallback", async () => {
    globalThis.fetch = (async () => { throw new Error("upstream unavailable"); }) as typeof fetch;
    const response = await GET(new Request("http://localhost/api/public-opportunities?live=1&text=unavailable-test"));
    const body = await response.json();
    expect(body.fallback).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((item: { source: string; demo?: boolean }) => item.source === "DEMO_DATA" && item.demo === true)).toBe(true);
  });
});
