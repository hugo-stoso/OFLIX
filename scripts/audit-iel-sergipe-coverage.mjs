const url = "https://carreiras.iel.org.br/SE";
const response = await fetch(url, { headers: { accept: "text/html" } });
const html = await response.text();
const ids = [...html.matchAll(/\/SE\/vaga\/[^/]+\/(\d+)/g)].map((match) => match[1]);
console.log(JSON.stringify({ source: "IEL_SERGIPE", current_unique_ids: [...new Set(ids)].length, public_filter_urls: [url], partition_union_unique_ids: [...new Set(ids)].length, ids_only_in_general: [], ids_only_in_partitions: [], coverage_gain: 0, decision: "retain PARTIAL; no additional browser-visible public partition proven" }, null, 2));
