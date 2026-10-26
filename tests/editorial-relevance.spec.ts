import { expect, test } from "@playwright/test";
import { editorialRelevance } from "../lib/connectors/openalex";

test("contrato editorial prioriza ciência aplicada a decisões empresariais", () => {
  expect(editorialRelevance("Technology adoption and productivity in small businesses")).toBe("relevant");
  expect(editorialRelevance("Ceremony visit and institutional celebration")).toBe("downranked");
});
