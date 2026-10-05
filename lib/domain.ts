export type OpportunityKind = "formal" | "service" | "volunteer";
export type DiscoveryKind = OpportunityKind | "course" | "public_exam" | "public_selection" | "external_job" | "public_procurement";
export type DiscoverySource = "OFLIX" | "DEMO_DATA" | "PNCP" | "AUTHORIZED_PARTNER";
export type WorkPreference = "CLT" | "Estágio" | "Serviços autônomos" | "Voluntariado" | "Concursos públicos" | "Processos seletivos públicos" | "Cursos e capacitação";
export type DiscoveryFilterKind = "all" | "employment" | "service" | "volunteer" | "public_exam" | "course" | "public_procurement";
export const EDUCATION_LEVELS = ["Ensino fundamental", "Ensino médio", "Ensino técnico", "Graduação", "Especialização", "Pós-graduação"] as const;
export type EducationLevel = typeof EDUCATION_LEVELS[number];
export const COURSE_TYPES = ["Administração", "Arquitetura e urbanismo", "Comunicação", "Computação e tecnologia", "Educação", "Engenharia", "Gestão", "Saúde", "Serviços e manutenção", "Direito", "Meio ambiente", "Outro"] as const;
export type CourseType = typeof COURSE_TYPES[number];
export const VOLUNTEER_INTERESTS = ["Educação e leitura", "Saúde e bem-estar", "Meio ambiente", "Cultura e comunicação", "Direitos e cidadania", "Tecnologia e inclusão digital", "Apoio a eventos", "Assistência social"] as const;
export type VolunteerInterest = typeof VOLUNTEER_INTERESTS[number];
export const BRAZILIAN_STATES = [
  { code: "AC", name: "Acre" }, { code: "AL", name: "Alagoas" }, { code: "AP", name: "Amapá" }, { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" }, { code: "CE", name: "Ceará" }, { code: "DF", name: "Distrito Federal" }, { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" }, { code: "MA", name: "Maranhão" }, { code: "MT", name: "Mato Grosso" }, { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" }, { code: "PA", name: "Pará" }, { code: "PB", name: "Paraíba" }, { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" }, { code: "PI", name: "Piauí" }, { code: "RJ", name: "Rio de Janeiro" }, { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" }, { code: "RO", name: "Rondônia" }, { code: "RR", name: "Roraima" }, { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" }, { code: "SE", name: "Sergipe" }, { code: "TO", name: "Tocantins" },
] as const;

export const ANALYST_PROFILE_ID = "profile-analista";
export const WORK_ACTIVITIES = ["Eletricista", "Manutenção", "Construção", "Limpeza", "Alimentação", "Eventos", "Design", "Comunicação", "Educação", "Tecnologia", "Cuidados", "Jardinagem", "Transporte", "Beleza", "Administração", "Meio ambiente"] as const;
export const WORK_PREFERENCES: WorkPreference[] = ["CLT", "Estágio", "Serviços autônomos", "Voluntariado"];
export const DEVELOPMENT_PREFERENCES: WorkPreference[] = ["Concursos públicos", "Processos seletivos públicos", "Cursos e capacitação"];

export const DISCOVERY_FILTER_LABELS: Record<DiscoveryFilterKind, string> = {
  all: "Todos",
  employment: "Empregos",
  service: "Serviços",
  volunteer: "Voluntariado",
  public_exam: "Concursos",
  course: "Capacitação",
  public_procurement: "Poder público",
};

export const DISCOVERY_KIND_LABELS: Record<DiscoveryKind, string> = {
  formal: "VAGA",
  service: "SERVIÇO",
  volunteer: "VOLUNTARIADO",
  course: "CURSO",
  public_exam: "CONCURSO",
  public_selection: "PROCESSO SELETIVO",
  external_job: "VAGA EXTERNA",
  public_procurement: "PODER PÚBLICO",
};

export const PUBLIC_PROCUREMENT_CATEGORIES = [
  "Materiais e produtos",
  "Equipamentos e bens",
  "Serviços profissionais",
  "Serviços empresariais",
  "Obras e manutenção",
  "Tecnologia e comunicação",
  "Cultura e eventos",
  "Locações",
  "Credenciamentos",
] as const;

export type DiscoveryLocation = { state: string; municipality: string; district?: string };
export type DiscoveryItem = {
  id: string;
  kind: DiscoveryKind;
  title: string;
  description: string;
  category: string;
  provider: string;
  location: DiscoveryLocation;
  source: DiscoverySource;
  sourceLabel: string;
  sourceId?: string;
  sourceUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  collectedAt?: string;
  deadline?: string;
  status?: string;
  tags: string[];
  demo?: boolean;
  officialType?: string;
  salary?: string;
  modality?: string;
  education?: string;
  duration?: string;
  cost?: string;
  certificate?: string;
  positions?: string;
  vacancies?: string;
  board?: string;
  value?: string;
};

export function discoveryKindLabel(kind: DiscoveryKind) {
  return DISCOVERY_KIND_LABELS[kind];
}

export function discoveryItemMatchesFilter(item: DiscoveryItem, filter: DiscoveryFilterKind) {
  if (filter === "all") return true;
  if (filter === "employment") return item.kind === "formal" || item.kind === "external_job";
  if (filter === "public_exam") return item.kind === "public_exam" || item.kind === "public_selection";
  if (filter === "course") return item.kind === "course";
  if (filter === "public_procurement") return item.kind === "public_procurement";
  return item.kind === filter;
}

export function canDiscoverPublicOpportunities(profile: { type: ProfileType; canSupplyPublic?: boolean; capabilities?: string }) {
  if (profile.type === "ORGANIZATION") return Boolean(profile.canSupplyPublic);
  return profile.type === "PERSON" && Boolean(profile.capabilities?.toLowerCase().includes("serviços autônomos"));
}

export type ProfileType = "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST";
export type OrganizationKind = "COMPANY" | "NONPROFIT" | "PUBLIC_INSTITUTION";

export type PolicyProfile = {
  type: ProfileType;
  organizationKind?: OrganizationKind | null;
  canSupplyPublic?: boolean;
};

export function organizationKindLabel(kind?: OrganizationKind | null) {
  if (kind === "COMPANY") return "Empresa";
  if (kind === "NONPROFIT") return "ONG / OSC";
  if (kind === "PUBLIC_INSTITUTION") return "Instituição pública";
  return "Organização";
}

export function canPublishFormal(profile: PolicyProfile) {
  return profile.type === "ORGANIZATION" && (profile.organizationKind === "COMPANY" || profile.organizationKind === "NONPROFIT");
}

export function canPublishServiceDemand(profile: PolicyProfile) {
  return profile.type === "ORGANIZATION" && (profile.organizationKind === "COMPANY" || profile.organizationKind === "NONPROFIT");
}

export function canPublishVolunteer(profile: PolicyProfile) {
  return profile.type === "ORGANIZATION" && (profile.organizationKind === "NONPROFIT" || profile.organizationKind === "PUBLIC_INSTITUTION");
}

export function canUseTalentDirectory(profile: PolicyProfile) {
  return profile.type === "ORGANIZATION" && (profile.organizationKind === "COMPANY" || profile.organizationKind === "NONPROFIT");
}

export function canUseServiceToday(profile: PolicyProfile) {
  return profile.type === "PERSON" || (profile.type === "ORGANIZATION" && (profile.organizationKind === "COMPANY" || profile.organizationKind === "NONPROFIT"));
}

export function canManageVolunteers(profile: PolicyProfile) {
  return profile.type === "ORGANIZATION" && (profile.organizationKind === "NONPROFIT" || profile.organizationKind === "PUBLIC_INSTITUTION");
}

export function canDiscoverPublicProcurement(profile: PolicyProfile) {
  return profile.type === "ORGANIZATION" && Boolean(profile.canSupplyPublic);
}

export const opportunityMeta: Record<OpportunityKind, { label: string; action: string; verb: string }> = {
  formal: { label: "Trabalho formal", action: "Candidatar-se", verb: "candidatura" },
  service: { label: "Serviço autônomo", action: "Solicitar contato", verb: "solicitação de contato" },
  volunteer: { label: "Voluntariado", action: "Quero participar", verb: "interesse em participar" },
};

export function locationLabel(location: { municipality: string; district: string }) {
  return `${location.municipality} · ${location.district}`;
}

export function kindFromTargetType(targetType: string): OpportunityKind {
  if (targetType === "FORMAL") return "formal";
  if (targetType === "SERVICE") return "service";
  return "volunteer";
}
