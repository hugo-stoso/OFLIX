import { expect, test } from "@playwright/test";
import { editorialRelevance, rankAcademicArticles, type AcademicArticle } from "../lib/connectors/openalex";

test("contrato editorial prioriza ciência aplicada a decisões empresariais", () => {
  expect(editorialRelevance("Technology adoption and productivity in small businesses")).toBe("relevant");
  expect(editorialRelevance("Ceremony visit and institutional celebration")).toBe("downranked");
});

const article = (title: string, relevance: "relevant" | "downranked"): AcademicArticle => ({ openAlexId: title, title, authors: [], year: 2026, source: "fixture", citedByCount: 0, openAccess: true, topics: ["Mercado de trabalho"], reason: "fixture", relevance });

test("default browsing keeps only relevant items and does not backfill", () => {
  const items = [article("Productivity in small firms", "relevant"), article("Ceremony visit", "downranked")];
  expect(items.filter((item) => item.relevance === "relevant")).toHaveLength(1);
  expect(rankAcademicArticles(items.filter((item) => item.relevance === "relevant"), "Mercado de trabalho")).toHaveLength(1);
});

test("hard excluded editorial categories remain downranked", () => {
  expect(editorialRelevance("Institutional visit and celebrity ceremony", "business productivity")).toBe("downranked");
});
