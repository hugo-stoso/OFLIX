const baseUrl = process.env.OFLIX_AUDIT_BASE_URL ?? "https://oflix-six.vercel.app";
const endpoint = new URL("/api/external-jobs", baseUrl);
endpoint.searchParams.set("source", "all");

const sources = [
  ["GO_SERGIPE", "GO Sergipe"],
  ["EMPREGAJU", "EmpregAju"],
  ["IEL_SERGIPE", "IEL Sergipe"],
];

function present(item, field) {
  if (field === "description") return typeof item.description === "string" && item.description.trim().length > 0;
  if (field === "salary") return Boolean(item.salary || item.salaryMin !== undefined || item.salaryMax !== undefined);
  if (field === "pcd") return Boolean(item.pcd || item.isPcdEligible !== undefined);
  if (field === "workMode") return Boolean(item.workMode || item.modality);
  const value = item[field];
  return Array.isArray(value) ? value.length > 0 : typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
}

function coverage(items, source, provider) {
  const total = items.length;
  const fields = {
    withDescription: "description",
    withRequirements: "requirements",
    withResponsibilities: "responsibilities",
    withEducation: "education",
    withExperience: "experience",
    withBenefits: "benefits",
    withContractType: "contractType",
    withWorkSchedule: "workSchedule",
    withWorkMode: "workMode",
    withSalary: "salary",
    withPcd: "pcd",
  };
  const counts = Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, items.filter((item) => present(item, field)).length]));
  const rate = (value) => total ? Number((value / total).toFixed(4)) : 0;
  return {
    source,
    provider,
    total,
    ...counts,
    coverageRate: Object.fromEntries(Object.entries(fields).map(([name, field]) => [field, rate(counts[name])])),
  };
}

try {
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  const payload = await response.json();
  if (response.status < 200 || response.status >= 300 || !Array.isArray(payload?.items)) throw new Error(`status=${response.status} ou items ausente`);
  const items = payload.items.filter((item) => item && typeof item === "object");
  const result = sources.map(([source, provider]) => coverage(items.filter((item) => item.source === source), source, provider));
  console.log(JSON.stringify({
    endpoint: endpoint.toString(),
    status: response.status,
    sources: result,
    policy: "cobertura de campos publicados; sem persistir itens, descrições, URLs individuais, cookies, tokens ou payload bruto",
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ endpoint: endpoint.toString(), error: error instanceof Error ? error.message : "falha desconhecida" }, null, 2));
  process.exitCode = 2;
}
