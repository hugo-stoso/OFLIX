export type OccupationReference = {
  cbo: string;
  label: string;
  synonyms: readonly string[];
};

/**
 * Public CBO references used to drive the search form. This is a reference
 * catalog, not a claim that every occupation has observations in OFLIX.
 * Codes and labels follow the CBO 2002 nomenclature used by MTE datasets.
 */
export const CBO_OCCUPATIONS: readonly OccupationReference[] = [
  {
    cbo: "411010",
    label: "Assistente administrativo",
    synonyms: ["assistente de escritório", "auxiliar administrativo"],
  },
  {
    cbo: "411005",
    label: "Auxiliar de escritório",
    synonyms: ["auxiliar de administração", "escriturário"],
  },
  {
    cbo: "252105",
    label: "Administrador",
    synonyms: ["administradora", "gestor administrativo"],
  },
  {
    cbo: "252505",
    label: "Analista de recursos humanos",
    synonyms: ["analista de rh", "analista de gestão de pessoas"],
  },
  {
    cbo: "422105",
    label: "Recepcionista, em geral",
    synonyms: ["recepcionista", "atendente de recepção"],
  },
  {
    cbo: "421125",
    label: "Operador de caixa",
    synonyms: ["caixa de loja", "caixa"],
  },
  {
    cbo: "521110",
    label: "Vendedor de comércio varejista",
    synonyms: ["vendedor", "vendedora", "consultor de vendas"],
  },
  {
    cbo: "354125",
    label: "Técnico de vendas",
    synonyms: ["técnico comercial", "assistente comercial"],
  },
  {
    cbo: "782305",
    label: "Motorista de carro de passeio",
    synonyms: ["motorista", "condutor"],
  },
  {
    cbo: "782310",
    label: "Motorista de furgão ou veículo similar",
    synonyms: ["motorista de entrega", "entregador motorista"],
  },
  {
    cbo: "513205",
    label: "Cozinheiro geral",
    synonyms: ["cozinheiro", "cozinheira"],
  },
  {
    cbo: "514320",
    label: "Faxineiro",
    synonyms: ["auxiliar de limpeza", "agente de limpeza"],
  },
  {
    cbo: "715210",
    label: "Pedreiro",
    synonyms: ["oficial de obras", "profissional de alvenaria"],
  },
  {
    cbo: "724105",
    label: "Soldador",
    synonyms: ["soldador industrial", "soldadora"],
  },
  {
    cbo: "715615",
    label: "Eletricista de instalações",
    synonyms: ["eletricista", "eletricista predial"],
  },
  {
    cbo: "317110",
    label: "Técnico de desenvolvimento de sistemas",
    synonyms: ["desenvolvedor", "programador"],
  },
  {
    cbo: "351605",
    label: "Técnico em segurança do trabalho",
    synonyms: ["técnico de segurança"],
  },
  {
    cbo: "231205",
    label: "Professor de nível médio no ensino fundamental",
    synonyms: ["professor", "docente"],
  },
  {
    cbo: "322205",
    label: "Técnico de enfermagem",
    synonyms: ["técnico em enfermagem", "enfermagem"],
  },
  {
    cbo: "519110",
    label: "Motociclista no transporte de documentos e pequenos volumes",
    synonyms: ["motoboy", "entregador"],
  },
];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

export const normalizeCbo = (value: string) => value.replace(/\D/g, "");

export function findOccupationReference(query?: string, cbo?: string) {
  const normalizedCbo = normalizeCbo(cbo ?? "");
  if (normalizedCbo) {
    const byCode = CBO_OCCUPATIONS.find(
      (occupation) => occupation.cbo === normalizedCbo,
    );
    if (byCode) return byCode;
  }
  const normalizedQuery = normalize(query ?? "");
  if (!normalizedQuery) return undefined;
  return CBO_OCCUPATIONS.find((occupation) =>
    [occupation.label, ...occupation.synonyms].some(
      (value) => normalize(value) === normalizedQuery,
    ),
  );
}

export const CBO_OCCUPATION_LABELS = CBO_OCCUPATIONS.map(
  (occupation) => occupation.label,
);
