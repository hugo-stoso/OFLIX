import type { DiscoveryItem, DiscoveryKind, DiscoverySource, WorkPreference } from "@/lib/domain";

export type IntelligenceProfile = {
  id: string;
  municipality: string;
  capabilities: string;
  activities: string[];
  workPreferences: string[];
  educationLevel?: string;
  courseName?: string;
  specialization?: string;
};

export type NaturalSearchInterpretation = {
  query: string;
  terms: string[];
  municipality?: string;
  kinds: DiscoveryKind[];
  summary: string;
};

export type OpportunityCompatibility = {
  score: number;
  level: "Alta" | "Média" | "Baixa" | "Indeterminada";
  matchedSignals: string[];
  gaps: string[];
  unknowns: string[];
  basis: string;
};

export type VerifiedRecommendation = {
  item: DiscoveryItem;
  compatibility: OpportunityCompatibility;
  reasons: string[];
};

export type DeterministicAssistantAnswer = {
  answer: string;
  interpretedQuery: NaturalSearchInterpretation;
  matches: DiscoveryItem[];
  facts: string[];
  limitations: string[];
};

const VERIFIED_SOURCES = new Set<DiscoverySource>(["GO_SERGIPE", "EMPREGAJU", "IEL_SERGIPE", "PNCP", "AUTHORIZED_PARTNER"]);
const STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "com", "como", "de", "do", "dos", "da", "das", "em", "e", "é", "para", "por", "que", "qual", "quais", "uma", "um", "umas", "uns", "me", "minha", "meu", "minhas", "meus", "tenho", "tem", "há", "existe", "existem", "procuro", "procurando", "buscar", "busco", "encontre", "encontrar", "quero", "gostaria", "interesse", "interesses", "oportunidade", "oportunidades", "vaga", "vagas", "trabalho", "trabalhar", "carreira", "profissão", "profissional", "profissionais", "disponível", "disponiveis", "disponíveis", "agora", "hoje", "sobre", "na", "no", "nas", "nos", "onde", "temos", "pode", "podem", "ser", "são", "sao", "posso", "preparar", "preparação", "preparacao", "melhorar", "melhor", "habilidade", "habilidades", "qualificar", "qualificação", "qualificacao", "experiência", "experiencia",
]);

const SERGIPE_MUNICIPALITIES = [
  "Aracaju", "Estância", "Itabaiana", "Lagarto", "Nossa Senhora do Socorro", "São Cristóvão", "Propriá", "Tobias Barreto", "Itaporanga d'Ajuda",
];

const KIND_TERMS: Array<{ terms: string[]; kinds: DiscoveryKind[] }> = [
  { terms: ["curso", "cursos", "capacitação", "capacitacao", "qualificação", "qualificacao", "aprender"], kinds: ["course"] },
  { terms: ["concurso", "concursos", "edital"], kinds: ["public_exam"] },
  { terms: ["seleção", "selecao", "processo seletivo"], kinds: ["public_selection"] },
  { terms: ["serviço", "servico", "autônomo", "autonomo"], kinds: ["service"] },
  { terms: ["voluntariado", "voluntário", "voluntario"], kinds: ["volunteer"] },
  { terms: ["emprego", "empregos", "vaga", "vagas", "clt", "estágio", "estagio", "trabalho formal"], kinds: ["formal", "external_job"] },
];

function normalized(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function tokens(value: string) {
  return normalized(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function itemText(item: DiscoveryItem) {
  return normalized([
    item.title, item.description, item.category, item.provider, item.location.municipality, item.location.state, item.sourceLabel,
    ...(item.tags ?? []), item.requirements, item.responsibilities, item.experience, item.education, item.workMode, item.workSchedule,
    item.contractType, item.occupationLabel, ...(item.skills ?? []),
  ].filter(Boolean).join(" "));
}

export function isVerifiedDiscoveryItem(item: DiscoveryItem) {
  return item.demo !== true && VERIFIED_SOURCES.has(item.source) && /^https:\/\//u.test(item.sourceUrl ?? "");
}

export function interpretNaturalSearch(query: string, items: DiscoveryItem[] = []): NaturalSearchInterpretation {
  const raw = query.trim();
  if (!raw) return { query: "", terms: [], kinds: [], summary: "" };
  const normalizedQuery = normalized(raw);
  const candidateMunicipalities = unique([...items.map((item) => item.location.municipality), ...SERGIPE_MUNICIPALITIES]).sort((left, right) => normalized(right).length - normalized(left).length);
  const municipality = candidateMunicipalities.find((candidate) => normalizedQuery.includes(normalized(candidate)));
  let remaining = municipality ? normalizedQuery.replace(normalized(municipality), " ") : normalizedQuery;
  const kinds = unique(KIND_TERMS.flatMap(({ terms: values, kinds: candidateKinds }) => values.some((term) => remaining.includes(normalized(term))) ? candidateKinds : [])).filter((kind): kind is DiscoveryKind => Boolean(kind));
  for (const { terms: values } of KIND_TERMS) for (const term of values) remaining = remaining.replace(normalized(term), " ");
  const searchTerms = unique(tokens(remaining));
  const summary = [
    searchTerms.length ? `tema/profissão: ${searchTerms.join(" ")}` : "",
    municipality ? `município: ${municipality}` : "",
    kinds.length ? `universo: ${kinds.map((kind) => kind === "external_job" || kind === "formal" ? "empregos" : kind === "course" ? "cursos" : kind === "public_exam" || kind === "public_selection" ? "concursos e seleções" : kind).join(" / ")}` : "",
  ].filter(Boolean).join(" · ");
  return { query: raw, terms: searchTerms, ...(municipality ? { municipality } : {}), kinds, summary };
}

export function matchesNaturalSearch(item: DiscoveryItem, interpretation: NaturalSearchInterpretation) {
  if (interpretation.municipality && normalized(item.location.municipality) !== normalized(interpretation.municipality)) return false;
  if (interpretation.kinds.length && !interpretation.kinds.some((kind) => kind === item.kind || (kind === "formal" && item.kind === "external_job"))) return false;
  const text = itemText(item);
  return interpretation.terms.every((term) => text.includes(normalized(term)));
}

function meaningfulProfileSignals(profile: IntelligenceProfile) {
  return unique([
    ...profile.activities,
    ...tokens(profile.capabilities),
    ...tokens(profile.courseName ?? ""),
    ...tokens(profile.specialization ?? ""),
  ]).filter((signal) => normalized(signal).length >= 3);
}

function preferenceMatches(item: DiscoveryItem, preferences: string[]) {
  const matches: string[] = [];
  const values = new Set(preferences);
  if (values.has("CLT") && (item.modality === "CLT" || item.contractType === "CLT")) matches.push("CLT");
  if (values.has("Estágio") && (item.modality === "Estágio" || item.contractType === "Estágio")) matches.push("Estágio");
  if (values.has("Cursos e capacitação") && item.kind === "course") matches.push("Cursos e capacitação");
  if (values.has("Concursos públicos") && item.kind === "public_exam") matches.push("Concursos públicos");
  if (values.has("Processos seletivos públicos") && item.kind === "public_selection") matches.push("Processos seletivos públicos");
  if (values.has("Serviços autônomos") && item.kind === "service") matches.push("Serviços autônomos");
  if (values.has("Voluntariado") && item.kind === "volunteer") matches.push("Voluntariado");
  return matches;
}

function profileEducationMatches(item: DiscoveryItem, profile: IntelligenceProfile) {
  if (!item.education || !profile.educationLevel) return undefined;
  const itemEducation = normalized(item.education);
  const profileEducation = normalized(profile.educationLevel);
  return itemEducation.includes(profileEducation) || profileEducation.includes(itemEducation);
}

export function analyzeOpportunityCompatibility(item: DiscoveryItem, profile: IntelligenceProfile): OpportunityCompatibility {
  const signals = meaningfulProfileSignals(profile);
  const text = itemText(item);
  const matchedSignals = signals.filter((signal) => text.includes(normalized(signal))).slice(0, 5);
  const preferenceSignals = preferenceMatches(item, profile.workPreferences);
  const locationMatches = normalized(item.location.municipality) === normalized(profile.municipality);
  const educationMatches = profileEducationMatches(item, profile);
  const gaps: string[] = [];
  const unknowns: string[] = [];
  let score = 0;

  if (signals.length) score += Math.min(45, Math.round((matchedSignals.length / Math.max(signals.length, 1)) * 45));
  else unknowns.push("O perfil ainda não informou áreas ou habilidades suficientes para uma comparação completa.");
  if (locationMatches) score += 20;
  if (preferenceSignals.length) score += Math.min(20, preferenceSignals.length * 10);
  if (item.education && profile.educationLevel) {
    if (educationMatches) score += 10;
    else gaps.push(`Escolaridade informada na fonte: ${item.education}.`);
  } else if (!item.education) {
    unknowns.push("A fonte não informou escolaridade estruturada.");
  } else {
    unknowns.push("O perfil não informou escolaridade para comparar com a vaga.");
  }
  if (item.skills?.length) {
    const skills = item.skills.filter((skill) => signals.some((signal) => normalized(skill).includes(normalized(signal)) || normalized(signal).includes(normalized(skill))));
    if (skills.length) score += Math.min(5, skills.length * 2);
    else gaps.push(`Habilidades exigidas na fonte: ${item.skills.slice(0, 3).join(", ")}.`);
  } else if (!item.requirements && !item.experience) {
    unknowns.push("A fonte não informou requisitos detalhados suficientes para uma análise completa.");
  }
  if (!isVerifiedDiscoveryItem(item)) unknowns.push("Esta análise só é válida para oportunidades com fonte verificável.");
  const normalizedScore = Math.min(100, Math.max(0, score));
  const level = !signals.length && !profile.workPreferences.length ? "Indeterminada" : normalizedScore >= 70 ? "Alta" : normalizedScore >= 45 ? "Média" : "Baixa";
  const matched = [...matchedSignals, ...preferenceSignals];
  if (locationMatches) matched.push(`Município: ${item.location.municipality}`);
  return {
    score: normalizedScore,
    level,
    matchedSignals: unique(matched).slice(0, 6),
    gaps: gaps.slice(0, 4),
    unknowns: unique(unknowns).slice(0, 4),
    basis: "Comparação determinística entre perfil informado, localização e campos públicos da fonte; não substitui a leitura do anúncio.",
  };
}

export function recommendationReasons(item: DiscoveryItem, compatibility: OpportunityCompatibility, profile: IntelligenceProfile) {
  const reasons = [`Fonte verificável: ${item.sourceLabel}.`];
  if (normalized(item.location.municipality) === normalized(profile.municipality)) reasons.push(`Fica em ${item.location.municipality}, município do perfil.`);
  if (compatibility.matchedSignals.length) reasons.push(`Sinais compatíveis: ${compatibility.matchedSignals.slice(0, 3).join(", ")}.`);
  return reasons.slice(0, 3);
}

export function rankVerifiedRecommendations(items: DiscoveryItem[], profile: IntelligenceProfile): VerifiedRecommendation[] {
  return items.filter(isVerifiedDiscoveryItem).map((item) => {
    const compatibility = analyzeOpportunityCompatibility(item, profile);
    return { item, compatibility, reasons: recommendationReasons(item, compatibility, profile) };
  }).sort((left, right) => right.compatibility.score - left.compatibility.score || Number(Boolean(right.item.publishedAt)) - Number(Boolean(left.item.publishedAt)) || left.item.title.localeCompare(right.item.title, "pt-BR")).slice(0, 8);
}

export function verifiedOpportunityLimitations(items: DiscoveryItem[]) {
  const limitations = ["As recomendações usam somente registros com fonte, link oficial e campos públicos verificáveis; DEMO DATA nunca entra nesta lista."];
  if (!items.some((item) => item.kind === "course")) limitations.push("Cursos reais ainda não têm um conector oficial ativo; por isso cursos DEMO DATA não são recomendados.");
  if (!items.some((item) => item.kind === "public_exam" || item.kind === "public_selection")) limitations.push("Concursos e processos seletivos reais ainda não têm uma fonte oficial integrada; por isso registros DEMO DATA não são recomendados.");
  if (!items.some((item) => item.kind === "external_job" || item.kind === "formal")) limitations.push("Nenhuma vaga de emprego verificável está disponível neste momento nas fontes habilitadas.");
  return limitations;
}

export function buildDeterministicAssistantAnswer(question: string, items: DiscoveryItem[], profile: IntelligenceProfile): DeterministicAssistantAnswer {
  void profile;
  const interpretedQuery = interpretNaturalSearch(question, items);
  const verified = items.filter(isVerifiedDiscoveryItem);
  const matches = verified.filter((item) => matchesNaturalSearch(item, interpretedQuery)).slice(0, 8);
  const limitations = verifiedOpportunityLimitations(verified);
  const careerQuestion = /carreira|prepar|habilidade|qualifica|requisito|experi[êe]ncia|melhorar/i.test(question);
  let answer: string;
  const facts: string[] = [];
  if (matches.length) {
    answer = careerQuestion
      ? `Encontrei ${matches.length} oportunidade${matches.length === 1 ? "" : "s"} verificável${matches.length === 1 ? "" : "is"} no recorte. Compare os requisitos publicados antes de se candidatar; a fonte oficial é a referência final.`
      : `Encontrei ${matches.length} oportunidade${matches.length === 1 ? "" : "s"} verificável${matches.length === 1 ? "" : "is"} para esta busca. A lista abaixo preserva a fonte original e não inclui registros demonstrativos.`;
    facts.push(...matches.slice(0, 5).map((item) => `${item.title} · ${item.location.municipality} · ${item.sourceLabel}.`));
  } else if (careerQuestion) {
    answer = "Não encontrei uma oportunidade verificável que responda a esse recorte. Posso comparar somente requisitos publicados pelas fontes integradas; não vou sugerir qualificações ou vagas sem evidência.";
    facts.push("Nenhum registro verificável correspondeu à pergunta.");
  } else {
    answer = "Não encontrei uma oportunidade verificável para essa busca. Tente informar profissão, município, habilidade ou interesse; quando não houver fonte oficial, o OFLIX informa a limitação em vez de preencher com DEMO DATA.";
    facts.push("Nenhum registro verificável correspondeu à busca.");
  }
  return { answer, interpretedQuery, matches, facts, limitations };
}

export function buildGeminiAssistantPrompt(result: DeterministicAssistantAnswer, question: string) {
  const opportunities = result.matches.map((item) => ({ id: item.id, title: item.title, municipality: item.location.municipality, source: item.sourceLabel, sourceUrl: item.sourceUrl, publishedAt: item.publishedAt, requirements: item.requirements, education: item.education, skills: item.skills }));
  return JSON.stringify({ question, interpretedQuery: result.interpretedQuery, deterministicAnswer: result.answer, facts: result.facts, limitations: result.limitations, opportunities }, null, 2);
}

export function isSafeGeminiAssistantAnswer(value: string) {
  return value.trim().length >= 10 && value.trim().length <= 900 && !/[<>]|https?:\/\/|\d/u.test(value);
}

export function profileFromInput(input: Omit<IntelligenceProfile, "id"> & { id: string }): IntelligenceProfile {
  return { ...input, activities: unique(input.activities), workPreferences: unique(input.workPreferences) };
}

export function preferenceLabel(preference: string) {
  return preference as WorkPreference;
}
