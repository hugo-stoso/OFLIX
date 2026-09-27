export type OpportunityKind = "formal" | "service" | "volunteer";
export type WorkPreference = "CLT" | "Estágio" | "Serviços autônomos" | "Voluntariado";
export const EDUCATION_LEVELS = ["Ensino fundamental", "Ensino médio", "Ensino técnico", "Graduação", "Especialização", "Pós-graduação"] as const;
export type EducationLevel = typeof EDUCATION_LEVELS[number];
export const COURSE_TYPES = ["Administração", "Arquitetura e urbanismo", "Comunicação", "Computação e tecnologia", "Educação", "Engenharia", "Gestão", "Saúde", "Serviços e manutenção", "Direito", "Meio ambiente", "Outro"] as const;
export type CourseType = typeof COURSE_TYPES[number];

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
