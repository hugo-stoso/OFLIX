import { expect, test } from "@playwright/test";
import { fetchPncpOpportunities } from "../lib/connectors/pncp";
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

  test("unavailable live source exposes empty verified response without DEMO fallback", async () => {
    globalThis.fetch = (async () => { throw new Error("upstream unavailable"); }) as typeof fetch;
    const response = await GET(new Request("http://localhost/api/public-opportunities?live=1&text=unavailable-test"));
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body.fallback).toBe(false);
    expect(body.unavailable).toBe(true);
    expect(body.items).toEqual([]);
    expect(body.source).toBe("PNCP");
  });

  test("preserva paginação oficial e filtros sem fabricar registros", async () => {
    globalThis.fetch = (async (input) => {
      const requestUrl = new URL(String(input));
      expect(requestUrl.searchParams.get("pagina")).toBe("2");
      expect(requestUrl.searchParams.get("tamanhoPagina")).toBe("20");
      expect(requestUrl.searchParams.get("uf")).toBe("SE");
      return new Response(JSON.stringify({ totalRegistros: 21, totalPaginas: 2, data: [{ numeroControlePNCP: "123-2", objetoCompra: "Serviço de manutenção", municipioNome: "Aracaju", ufSigla: "SE" }] }), { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    const result = await fetchPncpOpportunities({ state: "SE", page: 2, pageSize: 20, text: "manutenção" }, { timeoutMs: 50 });
    expect(result).toMatchObject({ page: 2, pageSize: 20, total: 21, totalPages: 2, hasMore: false, stale: false });
    expect(result.items).toHaveLength(1);
  });
});
