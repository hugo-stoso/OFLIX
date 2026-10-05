export type OfficialSalaryQuery = { occupationCode?: string; occupationLabel?: string; municipality?: string; state?: string };

export type OfficialSalaryStatus = {
  status: "unavailable";
  source: "MTE_PDET";
  sourceLabel: "Ministério do Trabalho e Emprego · PDET/CAGED";
  sourceUrl: string;
  competence: null;
  query: OfficialSalaryQuery;
  message: string;
};

export const MTE_PDET_URL = "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/acoes-e-programas/programas-projetos-acoes-obras-e-atividades/estatisticas-trabalho";

export function getOfficialSalaryStatus(query: OfficialSalaryQuery = {}): OfficialSalaryStatus {
  return {
    status: "unavailable",
    source: "MTE_PDET",
    sourceLabel: "Ministério do Trabalho e Emprego · PDET/CAGED",
    sourceUrl: MTE_PDET_URL,
    competence: null,
    query,
    message: "A OFLIX ainda não carregou uma base salarial oficial nesta execução. Consulte o Perfil do Município e o PDET na fonte do MTE; nenhum valor fictício é exibido como estatística oficial.",
  };
}
