const url = "https://sead.se.gov.br/concursos/concursos-em-andamento/";
const response = await fetch(url, { headers: { accept: "text/html" } });
const html = await response.text();
const records = [...html.matchAll(/href="([^"]+)"[^>]*>([^<]*(?:Concurso|Processo seletivo|Credenciamento)[^<]*)</giu)].map((match) => ({ title: match[2].replace(/\s+/g, " ").trim(), url: new URL(match[1], url).toString() }));
console.log(JSON.stringify({ source: "SEAD_SERGIPE", url, status: response.status, active_or_in_progress: records.length, unique_identities: [...new Set(records.map((item) => item.url))].length, records: records.map(({ title }) => ({ title })), aggregate_only: true }, null, 2));
