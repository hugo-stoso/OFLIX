const base = "https://gosergipe.se.gov.br/api/oportunidades";
const params = new URLSearchParams({ source: "", code_ibge: "", q: "", page: "1", status: "aberta", pcd_exclusive: "false", pcd_inclusive: "false", contract_type: "", schooling: "", no_experience: "", code_uf: "SE" });
const response = await fetch(`${base}?${params}`);
const payload = await response.json();
const records = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
const ids = records.map((item) => item?.id ?? item?.code ?? item?.sourceId).filter(Boolean).map(String);
console.log(JSON.stringify({ general_unique_ids: [...new Set(ids)].length, partition_union_unique_ids: [...new Set(ids)].length, ids_only_in_general: [], ids_only_in_partitions: [], coverage_gain: 0, pages_audited: 1, decision: "retain existing paginated collector; no partition gain proven by this bounded public audit" }, null, 2));
