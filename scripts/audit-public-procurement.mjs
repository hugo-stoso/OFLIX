const endpoint = "https://pncp.gov.br/api/consulta/v1/contratacoes/proposta";
const params = new URLSearchParams({ dataInicial: new Date().toISOString().slice(0, 10).replaceAll("-", ""), dataFinal: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10).replaceAll("-", ""), pagina: "1", tamanhoPagina: "10", uf: "SE" });
try {
  const response = await fetch(`${endpoint}?${params}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5000) });
  const payload = await response.json().catch(() => ({}));
  const records = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  const ids = records.map((record) => record?.numeroControlePNCP).filter(Boolean).map(String);
  console.log(JSON.stringify({ source: "PNCP", endpoint, status: response.status, page: 1, records: records.length, unique_ids: [...new Set(ids)].length, open_proposal_semantics: "dataFinal + public proposal endpoint", aggregate_only: true }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ source: "PNCP", endpoint, status: "UNAVAILABLE", decision: "NEEDS_MORE_VALIDATION", reason: error instanceof Error ? error.message : "request failed", causeCode: error?.cause?.code ?? undefined }, null, 2));
}
