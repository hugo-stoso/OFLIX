export type LegislationAudience = "Pessoas" | "Empresas" | "Autônomos" | "Instituições públicas" | "Organizações da sociedade civil";

export type LegislationCard = {
  id: string;
  title: string;
  shortTitle: string;
  number: string;
  year: number;
  topic: string;
  summary: string;
  audiences: LegislationAudience[];
  tags: string[];
  officialSourceLabel: string;
  officialUrl: string;
  lastCheckedAt: string;
  relatedContexts: string[];
  milestones?: { label: string; reference: string; url: string }[];
};

const checkedAt = "2026-10-05";

export const legislationCards: LegislationCard[] = [
  { id: "clt", title: "Consolidação das Leis do Trabalho", shortTitle: "CLT", number: "Decreto-Lei nº 5.452", year: 1943, topic: "Trabalho", summary: "Reúne normas gerais que estruturam relações individuais e coletivas de trabalho no regime celetista.", audiences: ["Pessoas", "Empresas"], tags: ["Trabalho", "CLT", "Relações de trabalho"], officialSourceLabel: "Planalto", officialUrl: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452.htm", lastCheckedAt: checkedAt, relatedContexts: ["emprego formal"] },
  { id: "reforma-trabalhista", title: "Reforma Trabalhista", shortTitle: "Lei nº 13.467/2017", number: "Lei nº 13.467", year: 2017, topic: "Trabalho", summary: "Altera a Consolidação das Leis do Trabalho e outras normas relacionadas às relações de trabalho.", audiences: ["Pessoas", "Empresas"], tags: ["Trabalho", "Contratos", "Reforma trabalhista"], officialSourceLabel: "Planalto", officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13467.htm", lastCheckedAt: checkedAt, relatedContexts: ["emprego formal"] },
  { id: "estagio", title: "Lei do Estágio", shortTitle: "Lei nº 11.788/2008", number: "Lei nº 11.788", year: 2008, topic: "Estágio", summary: "Dispõe sobre o estágio de estudantes e estabelece parâmetros para sua realização educativa.", audiences: ["Pessoas", "Empresas"], tags: ["Estágio", "Educação", "Bolsa"], officialSourceLabel: "Planalto", officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2008/lei/l11788.htm", lastCheckedAt: checkedAt, relatedContexts: ["estágio"] },
  { id: "voluntariado", title: "Lei do Voluntariado", shortTitle: "Lei nº 9.608/1998", number: "Lei nº 9.608", year: 1998, topic: "Voluntariado", summary: "Dispõe sobre o serviço voluntário e sua formalização por termo de adesão.", audiences: ["Pessoas", "Organizações da sociedade civil"], tags: ["Voluntariado", "Terceiro setor"], officialSourceLabel: "Planalto", officialUrl: "https://www.planalto.gov.br/ccivil_03/leis/l9608.htm", lastCheckedAt: checkedAt, relatedContexts: ["voluntariado"] },
  { id: "licitacoes", title: "Lei de Licitações e Contratos Administrativos", shortTitle: "Lei nº 14.133/2021", number: "Lei nº 14.133", year: 2021, topic: "Licitações", summary: "Estabelece normas gerais de licitação e contratação para a Administração Pública.", audiences: ["Empresas", "Autônomos", "Instituições públicas"], tags: ["Licitação", "Contratos", "Contratação pública"], officialSourceLabel: "Planalto", officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm", lastCheckedAt: checkedAt, relatedContexts: ["contratação pública"] },
  { id: "oscs", title: "Marco Regulatório das Organizações da Sociedade Civil", shortTitle: "Lei nº 13.019/2014", number: "Lei nº 13.019", year: 2014, topic: "Terceiro setor / OSC", summary: "Define o regime jurídico das parcerias entre a Administração Pública e organizações da sociedade civil.", audiences: ["Organizações da sociedade civil", "Instituições públicas"], tags: ["OSC", "Parcerias", "Terceiro setor"], officialSourceLabel: "Planalto", officialUrl: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l13019.htm", lastCheckedAt: checkedAt, relatedContexts: ["parcerias públicas"] },
  { id: "pequenos-negocios", title: "Estatuto Nacional da Microempresa e da Empresa de Pequeno Porte", shortTitle: "Lei Complementar nº 123/2006", number: "Lei Complementar nº 123", year: 2006, topic: "Pequenos negócios", summary: "Institui o Estatuto Nacional da Microempresa e da Empresa de Pequeno Porte e o Simples Nacional.", audiences: ["Empresas", "Autônomos"], tags: ["Pequenos negócios", "Simples Nacional"], officialSourceLabel: "Planalto", officialUrl: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm", lastCheckedAt: checkedAt, relatedContexts: ["negócios"] },
  { id: "reforma-tributaria-consumo", title: "Reforma Tributária do Consumo", shortTitle: "EC 132/2023 + leis complementares", number: "EC nº 132/2023", year: 2023, topic: "Reforma tributária do consumo", summary: "Conheça os principais marcos da transição para o novo sistema.", audiences: ["Empresas", "Autônomos", "Instituições públicas"], tags: ["IBS", "CBS", "Imposto Seletivo", "Transição"], officialSourceLabel: "Planalto", officialUrl: "https://planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm", lastCheckedAt: checkedAt, relatedContexts: ["negócios", "tributação"], milestones: [
    { label: "Emenda Constitucional nº 132/2023", reference: "EC nº 132/2023", url: "https://planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm" },
    { label: "Instituição do IBS, CBS e Imposto Seletivo", reference: "Lei Complementar nº 214/2025", url: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm" },
    { label: "Comitê Gestor do IBS e processo administrativo", reference: "Lei Complementar nº 227/2026", url: "https://planalto.gov.br/ccivil_03/leis/lcp/lcp227.htm" },
  ] },
];

export function contextualLegislation(context?: string) {
  if (!context) return legislationCards;
  const normalized = context.toLocaleLowerCase("pt-BR");
  const aliases = normalized.includes("volunt") ? ["voluntariado"] : normalized.includes("estág") || normalized.includes("estag") ? ["estágio"] : normalized.includes("licita") || normalized.includes("contrata") || normalized.includes("públic") || normalized.includes("public") ? ["contratação pública"] : [normalized];
  return legislationCards.filter((card) => card.relatedContexts.some((item) => aliases.some((alias) => alias.includes(item) || item.includes(alias))));
}
