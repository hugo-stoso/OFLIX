export type OfficialSalaryQuery = { occupationCode?: string; occupationLabel?: string; municipality?: string; state?: string };

export type OfficialSalaryStatus = {
  status: "unavailable";
  source: "MTE_PDET";
  sourceLabel: "Ministério do Trabalho e Emprego · PDET · RAIS/Novo CAGED";
  sourceUrl: string;
  competence: null;
  geography: string;
  observations: null;
  query: OfficialSalaryQuery;
  message: string;
};

export const MTE_PDET_URL = "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho";

export function getOfficialSalaryStatus(query: OfficialSalaryQuery = {}): OfficialSalaryStatus {
  return {
    status: "unavailable",
    source: "MTE_PDET",
    sourceLabel: "Ministério do Trabalho e Emprego · PDET · RAIS/Novo CAGED",
    sourceUrl: MTE_PDET_URL,
    competence: null,
    geography: query.state === "BR" ? "Brasil" : query.state === "SE" ? "Sergipe" : query.state ?? "Não informado",
    observations: null,
    query,
    message: "A consulta oficial do MTE/PDET está identificada, mas não há um endpoint público documentado e seguro disponível para retornar um valor nesta execução. Nenhum salário oficial é inferido a partir de vagas observadas.",
  };
}
