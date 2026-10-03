import type { DiscoveryItem, DiscoveryKind, DiscoveryLocation, DiscoverySource } from "@/lib/domain";

const demoLocation = (municipality: string): DiscoveryLocation => ({ state: "SE", municipality });

export const demoDiscoveryItems: DiscoveryItem[] = [
  {
    id: "demo-course-electrician",
    kind: "course",
    title: "Curso DEMO de eletricista instalador",
    description: "Capacitação fictícia para leitura de projetos, instalações residenciais e segurança do trabalho.",
    category: "Serviços e manutenção",
    provider: "Instituto Demo de Capacitação",
    location: demoLocation("Aracaju"),
    source: "DEMO_DATA",
    sourceLabel: "DEMO DATA · instituição fictícia",
    deadline: "Inscrições até 30/10/2026",
    status: "Inscrições abertas",
    modality: "Presencial",
    education: "Sem requisito informado",
    tags: ["Eletricista", "Manutenção", "Capacitação"],
    demo: true,
  },
  {
    id: "demo-course-excel",
    kind: "course",
    title: "Oficina DEMO de Excel para operações",
    description: "Oficina fictícia com planilhas básicas para organização de estoque, rotas e atendimento.",
    category: "Administração",
    provider: "Rede Demo de Aprendizagem",
    location: demoLocation("Nossa Senhora do Socorro"),
    source: "DEMO_DATA",
    sourceLabel: "DEMO DATA · instituição fictícia",
    status: "Inscrições em breve",
    modality: "Híbrido",
    tags: ["Administração", "Operações", "Capacitação"],
    demo: true,
  },
  {
    id: "demo-public-exam-maintenance",
    kind: "public_exam",
    title: "Concurso DEMO para técnico de manutenção",
    description: "Registro fictício para demonstrar a descoberta de concursos públicos relacionados a uma área profissional.",
    category: "Manutenção",
    provider: "Órgão Demo de Sergipe",
    location: demoLocation("Aracaju"),
    source: "DEMO_DATA",
    sourceLabel: "DEMO DATA · órgão fictício",
    deadline: "Inscrições até 12/11/2026",
    status: "Inscrições abertas",
    officialType: "Concurso público",
    education: "Ensino técnico",
    salary: "Não informado",
    tags: ["Eletricista", "Manutenção", "Concurso público"],
    demo: true,
  },
  {
    id: "demo-public-selection-admin",
    kind: "public_selection",
    title: "Processo seletivo DEMO para apoio administrativo",
    description: "Exemplo fictício de seleção temporária pública, separado semanticamente de concurso público.",
    category: "Administração",
    provider: "Instituição Demo de Sergipe",
    location: demoLocation("Lagarto"),
    source: "DEMO_DATA",
    sourceLabel: "DEMO DATA · órgão fictício",
    status: "Inscrições em breve",
    officialType: "Processo seletivo temporário",
    education: "Ensino médio",
    tags: ["Administração", "Processo seletivo"],
    demo: true,
  },
  {
    id: "demo-external-job-operations",
    kind: "external_job",
    title: "Vaga externa DEMO · assistente de operações",
    description: "Exemplo fictício de vaga agregada de fonte externa autorizada, mantido separado das vagas publicadas no OFLIX.",
    category: "Operações",
    provider: "Parceiro Demo de Vagas",
    location: demoLocation("Aracaju"),
    source: "DEMO_DATA",
    sourceLabel: "DEMO DATA · parceiro fictício",
    status: "Publicada",
    tags: ["Operações", "Vaga externa"],
    demo: true,
  },
  {
    id: "demo-public-procurement-electrical",
    kind: "public_procurement",
    title: "Contratação DEMO de manutenção elétrica",
    description: "Exemplo fictício para demonstrar como uma oportunidade de fornecimento ou serviço público será organizada.",
    category: "Obras e manutenção",
    provider: "Prefeitura Demo",
    location: demoLocation("Aracaju"),
    source: "DEMO_DATA",
    sourceLabel: "DEMO DATA · órgão fictício",
    deadline: "Prazo demonstrativo: 20/11/2026",
    status: "Demonstração",
    officialType: "Pregão eletrônico (demonstração)",
    tags: ["Eletricista", "Manutenção", "Serviços profissionais"],
    demo: true,
  },
  {
    id: "demo-public-procurement-supplies",
    kind: "public_procurement",
    title: "Fornecimento DEMO de materiais de limpeza",
    description: "Exemplo fictício de oportunidade para empresa fornecedora; os requisitos oficiais não existem neste dado de demonstração.",
    category: "Materiais e produtos",
    provider: "Secretaria Demo de Lagarto",
    location: demoLocation("Lagarto"),
    source: "DEMO_DATA",
    sourceLabel: "DEMO DATA · órgão fictício",
    deadline: "Prazo demonstrativo: 05/11/2026",
    status: "Demonstração",
    officialType: "Contratação direta — dispensa (demonstração)",
    tags: ["Limpeza", "Materiais e produtos"],
    demo: true,
  },
];

export function internalToDiscoveryItem(opportunity: { id: string; title: string; description: string; category: string; kind: "formal" | "service" | "volunteer"; location: { state?: string; municipality: string; district?: string }; owner: { name: string }; employmentType?: "CLT" | "INTERNSHIP"; requiredActivities?: string[] }): DiscoveryItem {
  const kind: DiscoveryKind = opportunity.kind;
  return {
    id: opportunity.id,
    kind,
    title: opportunity.title,
    description: opportunity.description,
    category: opportunity.category,
    provider: opportunity.owner.name,
    location: { state: opportunity.location.state ?? "SE", municipality: opportunity.location.municipality, district: opportunity.location.district },
    source: "OFLIX",
    sourceLabel: "OFLIX · publicação da demonstração",
    status: "Disponível",
    modality: opportunity.kind === "formal" ? opportunity.employmentType === "INTERNSHIP" ? "Estágio" : "CLT" : undefined,
    tags: [opportunity.category, ...(opportunity.requiredActivities ?? [])],
  };
}

function textValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

function nestedText(record: Record<string, unknown>, path: string[]) {
  let value: unknown = record;
  for (const key of path) {
    if (!value || typeof value !== "object") return "";
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function classifyProcurement(text: string) {
  const normalized = text.toLocaleLowerCase("pt-BR");
  if (/tecnolog|software|sistema|comunica/.test(normalized)) return "Tecnologia e comunicação";
  if (/obra|manuten|elétrica|eletrica|reforma/.test(normalized)) return "Obras e manutenção";
  if (/curso|consultor|assessoria|serviço/.test(normalized)) return "Serviços profissionais";
  if (/alimenta|material|insumo|limpeza/.test(normalized)) return "Materiais e produtos";
  return "Serviços empresariais";
}

function pncpPortalUrl(record: Record<string, unknown>) {
  const cnpj = textValue(record, "niFornecedor", "cnpj");
  const ano = textValue(record, "anoCompra", "ano");
  const sequencial = textValue(record, "sequencialCompra", "sequencial");
  return cnpj && ano && sequencial ? `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}` : "https://pncp.gov.br/app/consultas/contratacoes";
}

export function normalizePncpRecord(record: Record<string, unknown>): DiscoveryItem | null {
  const title = textValue(record, "objetoCompra", "objeto", "titulo");
  if (!title) return null;
  const organization = textValue(record, "nomeRazaoSocialFornecedor", "razaoSocialOrgao", "orgaoEntidade") || nestedText(record, ["orgaoEntidade", "razaoSocial"]);
  const municipality = textValue(record, "municipioNome") || nestedText(record, ["unidadeOrgao", "municipioNome"]) || "Não informado";
  const state = textValue(record, "ufSigla") || nestedText(record, ["unidadeOrgao", "ufSigla"]) || "SE";
  const officialType = textValue(record, "modalidadeNome", "modalidadeContratacaoNome") || nestedText(record, ["modalidadeContratacao", "nome"]) || "Forma de contratação informada pelo PNCP";
  const sourceId = textValue(record, "numeroControlePNCP", "numeroControlePNCPCompra") || undefined;
  const deadline = textValue(record, "dataFimRecebimentoPropostas", "dataEncerramentoPropostas", "dataFimPropostas") || undefined;
  return {
    id: `pncp-${sourceId ?? `${state}-${municipality}-${title}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
    kind: "public_procurement",
    title,
    description: textValue(record, "informacaoComplementar", "descricao") || "Consulte o objeto e os documentos no portal oficial.",
    category: classifyProcurement(`${title} ${textValue(record, "informacaoComplementar", "descricao")}`),
    provider: organization || "Órgão não informado",
    location: { state, municipality },
    source: "PNCP",
    sourceLabel: "PNCP · consulta pública oficial",
    sourceId,
    sourceUrl: pncpPortalUrl(record),
    publishedAt: textValue(record, "dataPublicacaoPncp", "dataPublicacao") || undefined,
    updatedAt: textValue(record, "dataAtualizacao") || undefined,
    collectedAt: new Date().toISOString(),
    deadline,
    status: textValue(record, "situacaoCompraNome", "situacaoNome") || "Publicada",
    officialType,
    tags: [classifyProcurement(title), officialType],
    value: textValue(record, "valorTotalEstimado", "valorTotal") || undefined,
  };
}

export function deduplicateDiscoveryItems(items: DiscoveryItem[]) {
  const unique = new Map<string, DiscoveryItem>();
  for (const item of items) {
    const key = item.sourceId ?? `${item.provider}|${item.title}|${item.location.municipality}|${item.kind}`.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const current = unique.get(key);
    if (!current || (item.source === "PNCP" && current.source !== "PNCP")) unique.set(key, item);
  }
  return Array.from(unique.values());
}

export function isExternal(item: DiscoveryItem) {
  return item.source !== "OFLIX";
}

export function sourceLabel(source: DiscoverySource) {
  return source === "PNCP" ? "PNCP" : source === "OFLIX" ? "OFLIX" : "DEMO DATA";
}

export function isWorkDiscoveryItem(item: DiscoveryItem) {
  return item.kind === "formal" || item.kind === "service" || item.kind === "volunteer" || item.kind === "external_job";
}

export function isDevelopmentDiscoveryItem(item: DiscoveryItem) {
  return item.kind === "course" || item.kind === "public_exam" || item.kind === "public_selection";
}

function normalized(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

type RankingContext = { search?: string; activities?: string[]; workPreferences?: string[]; municipality?: string };

export function rankDiscoveryItems(items: DiscoveryItem[], context: RankingContext = {}) {
  const term = normalized(context.search?.trim() ?? "");
  const activities = (context.activities ?? []).map(normalized);
  const municipality = normalized(context.municipality ?? "");
  return items
    .map((item, index) => {
      const haystack = normalized(`${item.title} ${item.description} ${item.category} ${item.tags.join(" ")}`);
      const title = normalized(item.title);
      const itemActivities = [item.category, ...item.tags].map(normalized);
      let score = 0;
      if (term && title.includes(term)) score += 100;
      else if (term && haystack.includes(term)) score += 70;
      if (activities.some((activity) => itemActivities.some((value) => value.includes(activity) || activity.includes(value)))) score += 30;
      if (municipality && normalized(item.location.municipality) === municipality) score += 20;
      if (item.status && /abert|dispon|publicad/i.test(item.status)) score += 5;
      if (item.deadline) score += 2;
      return { item, score, index };
    })
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ item }) => item);
}

export function discoveryReasons(item: DiscoveryItem, context: RankingContext & { publicEnabled?: boolean }) {
  const reasons: string[] = [];
  const term = context.search?.trim();
  const normalizedTerm = normalized(term ?? "");
  const itemText = normalized(`${item.title} ${item.description} ${item.category} ${item.tags.join(" ")}`);
  if (normalizedTerm && itemText.includes(normalizedTerm)) reasons.push(`Relacionada à busca por “${term}”.`);
  const activity = (context.activities ?? []).find((candidate) => [item.category, ...item.tags].some((value) => normalized(value).includes(normalized(candidate)) || normalized(candidate).includes(normalized(value))));
  if (activity) reasons.push(`${activity} está entre suas atividades.`);
  if (context.municipality && normalized(item.location.municipality) === normalized(context.municipality)) reasons.push(`Esta oportunidade fica em ${item.location.municipality}.`);
  if ((item.kind === "public_exam" || item.kind === "public_selection") && context.workPreferences?.some((preference) => ["Concursos públicos", "Processos seletivos públicos"].includes(preference))) reasons.push("Você acompanha concursos e processos seletivos públicos.");
  if (item.kind === "course" && context.workPreferences?.includes("Cursos e capacitação")) reasons.push("Você selecionou cursos e capacitação.");
  if (item.kind === "public_procurement" && context.publicEnabled) reasons.push("Você ativou oportunidades com o poder público.");
  return reasons.slice(0, 2);
}
