import { expect, test } from "@playwright/test";
import { discoveryItemMatchesFilter } from "@/lib/domain";
import { marketSectionForItem } from "@/lib/opportunity-classification";

test.describe("classificação das seções do mercado", () => {
  test("mantém vagas formais e externas em Vagas e Contratações", () => {
    expect(marketSectionForItem({ kind: "formal" })).toBe("contracts");
    expect(marketSectionForItem({ kind: "external_job" })).toBe("contracts");
    expect(discoveryItemMatchesFilter({ kind: "formal" }, "employment")).toBe(true);
    expect(discoveryItemMatchesFilter({ kind: "external_job" }, "employment")).toBe(true);
  });

  test("separa ofertas autônomas de pedidos de serviço", () => {
    const offer = { kind: "service" as const, serviceIntent: "service_offer" as const };
    const request = { kind: "service" as const, serviceIntent: "service_request" as const };
    expect(marketSectionForItem(offer)).toBe("services");
    expect(marketSectionForItem(request)).toBe("contracts");
    expect(discoveryItemMatchesFilter(offer, "service")).toBe(true);
    expect(discoveryItemMatchesFilter(offer, "employment")).toBe(false);
    expect(discoveryItemMatchesFilter(request, "employment")).toBe(true);
    expect(discoveryItemMatchesFilter(request, "service")).toBe(false);
  });

  test("migra publicação legada sem intenção para a seção segura de contratações", () => {
    const legacy = { kind: "service" as const };
    expect(marketSectionForItem(legacy)).toBe("contracts");
    expect(discoveryItemMatchesFilter(legacy, "employment")).toBe(true);
    expect(discoveryItemMatchesFilter(legacy, "service")).toBe(false);
  });
});
