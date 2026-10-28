import { expect, test } from "@playwright/test";
import { buildDeterministicAssistantAnswer, isVerifiedDiscoveryItem, interpretNaturalSearch, matchesNaturalSearch, rankVerifiedRecommendations, type IntelligenceProfile } from "@/lib/ai/opportunities";
import type { DiscoveryItem } from "@/lib/domain";

const profile: IntelligenceProfile = {
  id: "profile-ana",
  municipality: "Aracaju",
  capabilities: "Candidato formal · Tecnologia e administração",
  activities: ["Tecnologia", "Administração"],
  workPreferences: ["CLT"],
};

const verifiedJob: DiscoveryItem = {
  id: "go-1",
  kind: "external_job",
  title: "Analista de tecnologia",
  description: "Atuação com suporte e organização de processos.",
  category: "Tecnologia",
  provider: "Empresa pública informada na fonte",
  location: { state: "SE", municipality: "Aracaju" },
  source: "GO_SERGIPE",
  sourceLabel: "GO Sergipe",
  sourceUrl: "https://gosergipe.se.gov.br/detalheOportunidades/go-1",
  modality: "CLT",
  tags: ["Tecnologia", "Suporte"],
};

const demoCourse: DiscoveryItem = {
  id: "demo-course",
  kind: "course",
  title: "Curso DEMO de tecnologia",
  description: "Registro fictício.",
  category: "Tecnologia",
  provider: "Instituição fictícia",
  location: { state: "SE", municipality: "Aracaju" },
  source: "DEMO_DATA",
  sourceLabel: "DEMO DATA · instituição fictícia",
  sourceUrl: "https://example.invalid/demo",
  demo: true,
  tags: ["Tecnologia"],
};

test("busca natural separa profissão, município e universo", async () => {
  const interpretation = interpretNaturalSearch("quero uma vaga de tecnologia em Aracaju", [verifiedJob]);
  expect(interpretation.municipality).toBe("Aracaju");
  expect(interpretation.kinds).toContain("external_job");
  expect(interpretation.terms).toContain("tecnologia");
  expect(matchesNaturalSearch(verifiedJob, interpretation)).toBe(true);
});

test("recomendações e assistente excluem DEMO DATA", async () => {
  expect(isVerifiedDiscoveryItem(demoCourse)).toBe(false);
  const recommendations = rankVerifiedRecommendations([verifiedJob, demoCourse], profile);
  expect(recommendations).toHaveLength(1);
  expect(recommendations[0]?.item.id).toBe("go-1");
  expect(recommendations[0]?.compatibility.matchedSignals).toContain("Tecnologia");
  const answer = buildDeterministicAssistantAnswer("há vagas de tecnologia em Aracaju?", [verifiedJob, demoCourse], profile);
  expect(answer.matches.map((item) => item.id)).toEqual(["go-1"]);
  expect(answer.limitations.some((limitation) => limitation.includes("Cursos reais"))).toBe(true);
});

test("compatibilidade informa quando os dados do perfil não bastam", async () => {
  const answer = buildDeterministicAssistantAnswer("como posso me preparar?", [verifiedJob], { ...profile, activities: [], workPreferences: [], capabilities: "" });
  expect(answer.answer).toContain("oportunidade");
  expect(answer.matches).toHaveLength(1);
});
