export type CompensationCurrency = "BRL";
export type CompensationPeriod = "MONTHLY";
export type CompensationKind = "SALARY" | "INTERNSHIP_STIPEND";

export type Compensation = {
  min: number;
  max?: number;
  currency: CompensationCurrency;
  period: CompensationPeriod;
  kind: CompensationKind;
};

export type CompensationInput = {
  min?: string | number | null;
  max?: string | number | null;
  currency?: string;
  period?: string;
  kind: CompensationKind;
};

export type AnnouncedCompensationSummary = {
  average: number | null;
  observations: number;
  hasSmallSample: boolean;
};

function numericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function validateCompensation(input: CompensationInput): { compensation?: Compensation; error?: string } {
  const min = numericValue(input.min);
  const max = numericValue(input.max);
  if (input.currency && input.currency !== "BRL") return { error: "A demonstração usa apenas reais (BRL)." };
  if (input.period && input.period !== "MONTHLY") return { error: "A demonstração aceita apenas periodicidade mensal." };
  if (min === undefined && max === undefined) return {};
  if (min === undefined) return { error: "Informe o valor inicial da remuneração." };
  if (min <= 0 || (max !== undefined && max <= 0)) return { error: "Os valores precisam ser positivos." };
  if (max !== undefined && max < min) return { error: "O valor final não pode ser menor que o inicial." };
  return { compensation: { min, ...(max !== undefined && max !== min ? { max } : {}), currency: "BRL", period: "MONTHLY", kind: input.kind } };
}

export function compensationReferenceValue(compensation: Compensation) {
  return compensation.max === undefined ? compensation.min : (compensation.min + compensation.max) / 2;
}

export function calculateAnnouncedCompensationAverage(compensations: Compensation[]): AnnouncedCompensationSummary {
  const values = compensations.filter(Boolean).map(compensationReferenceValue);
  const average = values.length ? values.reduce((total, value) => total + value, 0) / values.length : null;
  return { average, observations: values.length, hasSmallSample: values.length === 1 };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

export function formatCompensation(compensation?: Compensation) {
  if (!compensation) return "Remuneração não informada";
  const value = compensation.max === undefined ? formatCurrency(compensation.min) : `${formatCurrency(compensation.min)}–${formatCurrency(compensation.max)}`;
  return `${compensation.kind === "INTERNSHIP_STIPEND" ? "Bolsa de " : ""}${value}/mês`;
}

export function compensationKindForEmploymentType(employmentType: "CLT" | "INTERNSHIP"): CompensationKind {
  return employmentType === "INTERNSHIP" ? "INTERNSHIP_STIPEND" : "SALARY";
}
