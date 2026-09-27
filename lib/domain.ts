export type OpportunityKind = "formal" | "service" | "volunteer";
export type WorkPreference = "CLT" | "Estágio" | "Serviços autônomos" | "Voluntariado";
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
