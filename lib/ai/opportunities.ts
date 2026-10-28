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
  analysis?: AssistantAnalysis;
};

export type AssistantAnalysis = {
  intent: "highest_salary" | "lowest_salary" | "latest" | "count" | "by_profession" | "by_municipality" | "compare_professions" | "compare_municipalities";
  scopeCount: number;
  comparedCount?: number;
  excludedCount?: number;
  groups?: Array<{ label: string; count: number }>;
};

const VERIFIED_SOURCES = new Set<DiscoverySource>(["GO_SERGIPE", "EMPREGAJU", "IEL_SERGIPE", "PNCP", "AUTHORIZED_PARTNER"]);
const STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "com", "como", "de", "do", "dos", "da", "das", "em", "e", "é", "para", "por", "que", "qual", "quais", "uma", "um", "umas", "uns", "me", "minha", "meu", "minhas", "meus", "tenho", "tem", "há", "existe", "existem", "procuro", "procurando", "buscar", "busco", "encontre", "encontrar", "quero", "gostaria", "interesse", "interesses", "oportunidade", "oportunidades", "vaga", "vagas", "trabalho", "trabalhar", "carreira", "profissão", "profissao", "profissional", "profissionais", "município", "municipio", "municípios", "municipios", "cidade", "cidades", "disponível", "disponiveis", "disponíveis", "agora", "hoje", "sobre", "na", "no", "nas", "nos", "onde", "temos", "pode", "podem", "ser", "são", "sao", "posso", "preparar", "preparação", "preparacao", "melhorar", "melhor", "habilidade", "habilidades", "qualificar", "qualificação", "qualificacao", "experiência", "experiencia", "possui", "possuem", "quantas", "quantos", "mais", "menos", "maior", "menor", "alto", "alta", "baixo", "baixa", "salário", "salario", "salários", "salarios", "remuneração", "remuneracao", "mensal", "mensais", "recente", "recentes", "nova", "novas", "novo", "novos", "última", "ultima", "últimas", "ultimas", "número", "numero", "quantidade", "total", "comparar", "compare", "comparação", "comparacao", "diferença", "diferenca", "entre",
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

const OCCUPATION_SEARCH_ALIASES: Array<{ queryTerms: string[]; itemTerms: string[] }> = [
  { queryTerms: ["contador", "contabilidade", "contabil", "contabilista"], itemTerms: ["contador", "contabilidade", "contabil", "contabilista"] },
  { queryTerms: ["assistente administrativo", "auxiliar administrativo", "assistente de escritorio", "auxiliar de escritorio", "escriturario"], itemTerms: ["assistente administrativo", "auxiliar administrativo", "assistente de escritorio", "auxiliar de escritorio", "escriturario"] },
  { queryTerms: ["motorista", "condutor", "motorista de entrega", "motorista carreteiro"], itemTerms: ["motorista", "condutor", "motorista de entrega", "motorista carreteiro", "entregador"] },
  { queryTerms: ["enfermeiro", "enfermagem", "tecnico de enfermagem", "auxiliar de enfermagem"], itemTerms: ["enfermeiro", "enfermagem", "tecnico de enfermagem", "auxiliar de enfermagem"] },
];

const GENERIC_PROFILE_SIGNALS = new Set(["candidato", "formal", "voluntario", "voluntariado", "pessoa", "profissional", "servico", "servicos", "autonomo", "autonomos"]);

function normalized(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function phraseInText(text: string, phrase: string) {
  const normalizePhrase = (value: string) => normalized(value).replace(/[^a-z0-9]+/giu, " ").replace(/\s+/g, " ").trim();
  const normalizedText = ` ${normalizePhrase(text)} `;
  const normalizedPhrase = ` ${normalizePhrase(phrase)} `;
  return normalizedPhrase.trim().length > 0 && normalizedText.includes(normalizedPhrase);
}

function occupationGroupsForQuery(query: string) {
  return OCCUPATION_SEARCH_ALIASES.filter((group) => group.queryTerms.some((term) => phraseInText(query, term)));
}

function occupationGroupForSignal(signal: string) {
  const normalizedSignal = normalized(signal).replace(/\s+/g, " ").trim();
  return OCCUPATION_SEARCH_ALIASES.find((group) => group.queryTerms.some((term) => normalized(term) === normalizedSignal));
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
    item.occupationCode,
  ].filter(Boolean).join(" "));
}

function itemMatchesSignal(item: DiscoveryItem, signal: string) {
  const group = occupationGroupForSignal(signal);
  return group ? group.itemTerms.some((term) => phraseInText(itemText(item), term)) : phraseInText(itemText(item), signal);
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
  const occupationGroups = occupationGroupsForQuery(interpretation.query);
  const occupationTerms = new Set(occupationGroups.flatMap((group) => group.queryTerms.flatMap((term) => tokens(term))));
  const nonOccupationTerms = interpretation.terms.filter((term) => !occupationTerms.has(term));
  return occupationGroups.every((group) => group.itemTerms.some((term) => phraseInText(text, term))) && nonOccupationTerms.every((term) => phraseInText(text, term));
}

function meaningfulProfileSignals(profile: IntelligenceProfile) {
  return unique([
    ...profile.activities,
    ...tokens(profile.capabilities),
    ...tokens(profile.courseName ?? ""),
    ...tokens(profile.specialization ?? ""),
  ]).filter((signal) => normalized(signal).length >= 3 && !GENERIC_PROFILE_SIGNALS.has(normalized(signal)));
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
  const matchedSignals = signals.filter((signal) => itemMatchesSignal(item, signal)).slice(0, 5);
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
  const profileSignals = meaningfulProfileSignals(profile);
  const hasSpecificProfileSignals = profile.activities.length > 0 || Boolean(profile.courseName || profile.specialization) || profileSignals.some((signal) => tokens(profile.capabilities).includes(signal));
  return items.filter(isVerifiedDiscoveryItem).map((item) => {
    const compatibility = analyzeOpportunityCompatibility(item, profile);
    return { item, compatibility, reasons: recommendationReasons(item, compatibility, profile) };
  }).filter((recommendation) => !hasSpecificProfileSignals || recommendation.compatibility.matchedSignals.some((signal) => profileSignals.includes(signal) && itemMatchesSignal(recommendation.item, signal))).sort((left, right) => right.compatibility.score - left.compatibility.score || Number(Boolean(right.item.publishedAt)) - Number(Boolean(left.item.publishedAt)) || left.item.title.localeCompare(right.item.title, "pt-BR")).slice(0, 8);
}

export function verifiedOpportunityLimitations(items: DiscoveryItem[]) {
  const limitations = ["As recomendações usam somente registros com fonte, link oficial e campos públicos verificáveis; DEMO DATA nunca entra nesta lista."];
  if (!items.some((item) => item.kind === "course")) limitations.push("Cursos reais ainda não têm um conector oficial ativo; por isso cursos DEMO DATA não são recomendados.");
  if (!items.some((item) => item.kind === "public_exam" || item.kind === "public_selection")) limitations.push("Concursos e processos seletivos reais ainda não têm uma fonte oficial integrada; por isso registros DEMO DATA não são recomendados.");
  if (!items.some((item) => item.kind === "external_job" || item.kind === "formal")) limitations.push("Nenhuma vaga de emprego verificável está disponível neste momento nas fontes habilitadas.");
  return limitations;
}

function isEmploymentOpportunity(item: DiscoveryItem) {
  return item.kind === "external_job" || item.kind === "formal";
}

function mentionedMunicipalities(question: string, items: DiscoveryItem[]) {
  const candidates = unique([...items.map((item) => item.location.municipality), ...SERGIPE_MUNICIPALITIES])
    .sort((left, right) => normalized(right).length - normalized(left).length);
  const normalizedQuestion = normalized(question);
  return candidates.filter((candidate) => normalizedQuestion.includes(normalized(candidate)));
}

export function detectAnalyticalIntent(question: string): AssistantAnalysis["intent"] | undefined {
  const value = normalized(question);
  const hasSalary = /\b(salario|remuneracao|ganha|paga)\b/u.test(value);
  if (hasSalary && /\b(maior|mais alto|mais alta|mais bem pago|mais bem paga)\b/u.test(value)) return "highest_salary";
  if (hasSalary && /\b(menor|mais baixo|mais baixa|menos pago|menos paga)\b/u.test(value)) return "lowest_salary";
  if (/\b(mais recente|mais novas?|mais novas?|recentes?|ultimas?)\b/u.test(value)) return "latest";

  const occupationGroups = occupationGroupsForQuery(question);
  const municipalities = mentionedMunicipalities(question, []);
  const comparison = /\b(comparar|compare|comparacao|diferenca|entre)\b/u.test(value);
  if (comparison && occupationGroups.length >= 2) return "compare_professions";
  if (comparison && municipalities.length >= 2) return "compare_municipalities";
  if (/\b(municipio|cidade)\b/u.test(value) && /\b(mais vagas|maior numero|mais oportunidades)\b/u.test(value)) return "by_municipality";
  if (/\b(profissao|ocupacao)\b/u.test(value) && /\b(mais vagas|maior numero|mais oportunidades)\b/u.test(value)) return "by_profession";
  if (/\b(quantas?|quantidade|numero|total)\b/u.test(value) && /\b(vagas?|oportunidades?|empregos?)\b/u.test(value)) return "count";
  return undefined;
}

function analyticalScope(question: string, interpretation: NaturalSearchInterpretation, verified: DiscoveryItem[], intent: AssistantAnalysis["intent"]) {
  const jobs = verified.filter(isEmploymentOpportunity);
  if (intent === "compare_professions") {
    const groups = occupationGroupsForQuery(question);
    return jobs.filter((item) => groups.some((group) => group.itemTerms.some((term) => phraseInText(itemText(item), term))));
  }
  if (intent === "compare_municipalities") {
    const municipalities = mentionedMunicipalities(question, jobs);
    return jobs.filter((item) => municipalities.some((municipality) => normalized(item.location.municipality) === normalized(municipality)));
  }
  return jobs.filter((item) => matchesNaturalSearch(item, interpretation));
}

function numericSalary(value: string | undefined) {
  const match = value?.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/iu);
  if (!match) return undefined;
  const parsed = Number(match[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function comparableMonthlySalary(item: DiscoveryItem) {
  if (item.salaryCurrency !== "BRL" || item.salaryPeriod !== "MONTHLY") return undefined;
  const value = Number.isFinite(item.salaryMax) ? item.salaryMax : Number.isFinite(item.salaryMin) ? item.salaryMin : numericSalary(item.salary);
  if (!Number.isFinite(value) || value === undefined || value <= 0) return undefined;
  return value;
}

function salaryLabel(item: DiscoveryItem, value: number) {
  return item.salary?.trim() || new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function publishedTimestamp(item: DiscoveryItem) {
  if (!item.publishedAt) return undefined;
  const timestamp = Date.parse(item.publishedAt);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function publishedLabel(item: DiscoveryItem) {
  const timestamp = publishedTimestamp(item);
  return timestamp === undefined ? undefined : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(timestamp);
}

function analyticalItemFact(item: DiscoveryItem, extra = "") {
  return `${item.title} · ${item.location.municipality}${extra ? ` · ${extra}` : ""} · Fonte: ${item.sourceLabel}.`;
}

function groupCounts(items: DiscoveryItem[], labelsForItem: (item: DiscoveryItem) => string[]) {
  const counts = new Map<string, number>();
  for (const item of items) for (const label of labelsForItem(item)) counts.set(label, (counts.get(label) ?? 0) + 1);
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"));
}

function buildAnalyticalAnswer(question: string, interpretation: NaturalSearchInterpretation, verified: DiscoveryItem[], baseLimitations: string[]) {
  const intent = detectAnalyticalIntent(question);
  if (!intent) return undefined;
  const scope = analyticalScope(question, interpretation, verified, intent);
  const limitations = [...baseLimitations];

  if (intent === "highest_salary" || intent === "lowest_salary") {
    const comparable = scope.map((item) => ({ item, value: comparableMonthlySalary(item) })).filter((entry): entry is { item: DiscoveryItem; value: number } => entry.value !== undefined);
    const ordered = comparable.sort((left, right) => intent === "highest_salary" ? right.value - left.value : left.value - right.value);
    const excludedCount = scope.length - comparable.length;
    if (excludedCount > 0) limitations.push(`${excludedCount} vaga${excludedCount === 1 ? "" : "s"} ficou${excludedCount === 1 ? "" : "aram"} fora da comparação por não informar remuneração em BRL com periodicidade mensal explícita.`);
    if (!ordered.length) {
      const answer = "Não encontrei remuneração mensal comparável para responder a essa pergunta. Valores sem periodicidade explícita não são ordenados como se fossem salários mensais.";
      return { answer, matches: [], facts: ["Nenhuma vaga verificável informou remuneração mensal comparável."], limitations, analysis: { intent, scopeCount: scope.length, comparedCount: 0, excludedCount } satisfies AssistantAnalysis };
    }
    const winner = ordered[0];
    const salary = salaryLabel(winner.item, winner.value);
    const direction = intent === "highest_salary" ? "maior" : "menor";
    const answer = `A vaga com ${direction} remuneração mensal comparável no recorte é “${winner.item.title}”, com ${salary}, em ${winner.item.location.municipality}. A comparação usa apenas valores em BRL cuja periodicidade mensal foi informada pela fonte.`;
    const facts = [analyticalItemFact(winner.item, `remuneração mensal comparável: ${salary}`), `Base comparável: ${ordered.length} vaga${ordered.length === 1 ? "" : "s"} com valor mensal explícito.`];
    return { answer, matches: ordered.slice(0, 5).map((entry) => entry.item), facts, limitations, analysis: { intent, scopeCount: scope.length, comparedCount: ordered.length, excludedCount } satisfies AssistantAnalysis };
  }

  if (intent === "latest") {
    const dated = scope.map((item) => ({ item, timestamp: publishedTimestamp(item) })).filter((entry): entry is { item: DiscoveryItem; timestamp: number } => entry.timestamp !== undefined).sort((left, right) => right.timestamp - left.timestamp);
    const excludedCount = scope.length - dated.length;
    if (excludedCount > 0) limitations.push(`${excludedCount} vaga${excludedCount === 1 ? "" : "s"} não foi${excludedCount === 1 ? "" : "ram"} ordenada${excludedCount === 1 ? "" : "s"} porque a fonte não informou uma data de publicação válida.`);
    if (!dated.length) return { answer: "Não encontrei vaga verificável com data de publicação válida para identificar a mais recente.", matches: [], facts: ["Nenhuma vaga verificável tinha data de publicação válida."], limitations, analysis: { intent, scopeCount: scope.length, comparedCount: 0, excludedCount } satisfies AssistantAnalysis };
    const newest = dated[0].item;
    const date = publishedLabel(newest) ?? newest.publishedAt ?? "data informada na fonte";
    return { answer: `A vaga mais recente no recorte é “${newest.title}”, publicada em ${date}, em ${newest.location.municipality}. Confira o anúncio original para confirmar a disponibilidade atual.`, matches: dated.slice(0, 5).map((entry) => entry.item), facts: [analyticalItemFact(newest, `publicada em ${date}`)], limitations, analysis: { intent, scopeCount: scope.length, comparedCount: dated.length, excludedCount } satisfies AssistantAnalysis };
  }

  if (intent === "count") {
    const noun = scope.length === 1 ? "vaga verificável" : "vagas verificáveis";
    return { answer: `Encontrei ${scope.length} ${noun} no recorte informado. A contagem considera apenas registros externos com fonte e link oficial; não inclui DEMO DATA.`, matches: scope.slice(0, 8), facts: [`Total verificável no recorte: ${scope.length} ${scope.length === 1 ? "vaga" : "vagas"}.`], limitations, analysis: { intent, scopeCount: scope.length, comparedCount: scope.length } satisfies AssistantAnalysis };
  }

  const municipalities = mentionedMunicipalities(question, scope);
  const occupationGroups = occupationGroupsForQuery(question);
  const isMunicipalityAnalysis = intent === "by_municipality" || intent === "compare_municipalities";
  const groups = isMunicipalityAnalysis
    ? groupCounts(scope, (item) => [item.location.municipality])
    : intent === "compare_professions"
      ? groupCounts(scope, (item) => occupationGroups.filter((group) => group.itemTerms.some((term) => phraseInText(itemText(item), term))).map((group) => group.queryTerms[0]))
      : groupCounts(scope, (item) => [item.occupationLabel || item.title]);
  const comparableGroups = groups.filter((group) => isMunicipalityAnalysis ? municipalities.length === 0 || municipalities.some((municipality) => normalized(municipality) === normalized(group.label)) : true);
  if (!comparableGroups.length) return { answer: "Não encontrei vagas verificáveis suficientes para fazer essa comparação.", matches: [], facts: ["Nenhum grupo comparável foi encontrado no recorte."], limitations, analysis: { intent, scopeCount: scope.length, groups: [] } satisfies AssistantAnalysis };
  const top = comparableGroups[0];
  const label = isMunicipalityAnalysis ? "município" : "profissão ou cargo";
  return { answer: `No recorte, ${top.label} concentra mais vagas verificáveis (${top.count}). A comparação agrupa somente os títulos e municípios publicados pelas fontes oficiais.`, matches: scope.slice(0, 8), facts: [`Comparação por ${label}: ${comparableGroups.slice(0, 5).map((group) => `${group.label} (${group.count})`).join(", ")}.`], limitations, analysis: { intent, scopeCount: scope.length, groups: comparableGroups.slice(0, 10) } satisfies AssistantAnalysis };
}

export function buildDeterministicAssistantAnswer(question: string, items: DiscoveryItem[], profile: IntelligenceProfile): DeterministicAssistantAnswer {
  void profile;
  const interpretedQuery = interpretNaturalSearch(question, items);
  const verified = items.filter(isVerifiedDiscoveryItem);
  const analytical = buildAnalyticalAnswer(question, interpretedQuery, verified, verifiedOpportunityLimitations(verified));
  if (analytical) return { ...analytical, interpretedQuery };
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
  const opportunities = result.matches.map((item) => ({ id: item.id, title: item.title, municipality: item.location.municipality, source: item.sourceLabel, sourceUrl: item.sourceUrl, publishedAt: item.publishedAt, salary: item.salary, salaryMin: item.salaryMin, salaryMax: item.salaryMax, salaryCurrency: item.salaryCurrency, salaryPeriod: item.salaryPeriod, requirements: item.requirements, education: item.education, skills: item.skills }));
  return JSON.stringify({ question, interpretedQuery: result.interpretedQuery, analysis: result.analysis, deterministicAnswer: result.answer, facts: result.facts, limitations: result.limitations, opportunities }, null, 2);
}

export function isSafeGeminiAssistantAnswer(value: string, trustedContext = "") {
  if (value.trim().length < 10 || value.trim().length > 900 || /[<>]|https?:\/\//u.test(value)) return false;
  const trustedDigits = trustedContext.replace(/\D/g, "");
  return (value.match(/\d[\d.,]*/g) ?? []).every((token) => trustedDigits.includes(token.replace(/\D/g, "")));
}

export function profileFromInput(input: Omit<IntelligenceProfile, "id"> & { id: string }): IntelligenceProfile {
  return { ...input, activities: unique(input.activities), workPreferences: unique(input.workPreferences) };
}

export function preferenceLabel(preference: string) {
  return preference as WorkPreference;
}
