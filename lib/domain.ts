export type OpportunityKind = "formal" | "service" | "volunteer";

export const ANALYST_PROFILE_ID = "profile-analista";

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
