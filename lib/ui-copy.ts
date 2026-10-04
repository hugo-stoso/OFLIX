export function formatWorkOpportunityCount(count: number) {
  if (count === 0) return "Nenhuma oportunidade de trabalho";
  return `${count} ${count === 1 ? "oportunidade" : "oportunidades"} de trabalho`;
}

