import { expect, test } from "@playwright/test";
import { itemMatchesNavigationFilter, navigationCountLabel } from "@/lib/discovery-catalog";

const base = { title: "Item", description: "Descrição", category: "Categoria", provider: "Fonte", location: { state: "SE", municipality: "Aracaju" }, source: "OFLIX" as const, sourceLabel: "OFLIX", tags: [] };

test.describe("catálogo e contagens de navegação", () => {
  test("mantém categorias gerais estáveis ao alternar a seção de mercado", () => {
    const person = { profileId: "profile-rafael", profileType: "PERSON" as const, publicAccess: false };
    const course = { ...base, id: "course", kind: "course" as const };
    const offer = { ...base, id: "offer", kind: "service" as const, serviceIntent: "service_offer" as const };
    expect(itemMatchesNavigationFilter(course, "course", person)).toBe(true);
    expect(itemMatchesNavigationFilter(course, "service", person)).toBe(false);
    expect(itemMatchesNavigationFilter(offer, "service", person)).toBe(true);
    expect(itemMatchesNavigationFilter(offer, "employment", person)).toBe(false);
  });

  test("preserva o isolamento de solicitações por organização", () => {
    const organization = { profileId: "profile-coletivo", profileType: "ORGANIZATION" as const, publicAccess: false };
    const ownRequest = { ...base, id: "request", kind: "service" as const, serviceIntent: "service_request" as const, ownerId: "profile-coletivo", ownerType: "ORGANIZATION" as const };
    const otherRequest = { ...ownRequest, id: "other", ownerId: "profile-other" };
    expect(itemMatchesNavigationFilter(ownRequest, "employment", organization)).toBe(true);
    expect(itemMatchesNavigationFilter(otherRequest, "employment", organization)).toBe(false);
  });

  test("marca contador de emprego como provisório durante a coleta", () => {
    expect(navigationCountLabel(0, "employment", true)).toBe("0+");
    expect(navigationCountLabel(44, "employment", true)).toBe("44+");
    expect(navigationCountLabel(44, "employment", false)).toBe("44");
    expect(navigationCountLabel(0, "course", true)).toBe("0");
  });
});
