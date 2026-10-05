import { calculateAnnouncedCompensationAverage, formatCurrency, type AnnouncedCompensationSummary, type Compensation } from "@/lib/compensation";

export type AnnouncedMarketSummary = AnnouncedCompensationSummary & {
  label: "Remuneração média anunciada";
  municipality?: string;
  category?: string;
  methodology: string[];
  values: Compensation[];
};

export function announcedCompensationSummary(compensations: Compensation[], scope: { municipality?: string; category?: string } = {}): AnnouncedMarketSummary {
  return {
    ...calculateAnnouncedCompensationAverage(compensations),
    label: "Remuneração média anunciada",
    ...scope,
    methodology: ["Vagas sem remuneração são excluídas.", "Faixas usam o ponto médio.", "Cada publicação conta como uma observação."],
    values: compensations,
  };
}

export function announcedSummaryLabel(summary: AnnouncedMarketSummary) {
  if (summary.observations === 0) return "Nenhuma vaga com remuneração informada neste recorte.";
  if (summary.observations === 1) return `Valor anunciado disponível · ${formatCurrency(summary.average ?? 0)}`;
  return `${formatCurrency(summary.average ?? 0)} · ${summary.observations} vagas com remuneração informada`;
}
