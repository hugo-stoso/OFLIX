const sources = [
  { source: "SENAI_SE", url: "https://www.se.senai.br/cursos" },
  { source: "FUNDACAO_BRADESCO_EV", url: "https://www.ev.org.br/Cursos" },
  { source: "EVG", url: "https://www.escolavirtual.gov.br/catalogo" },
];
const results = await Promise.all(sources.map(async ({ source, url }) => {
  try {
    const response = await fetch(url, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(10000) });
    const html = await response.text();
    return { source, url, status: response.status, publicHtmlBytes: html.length, publicCatalogReachable: response.ok, demoCourseInSource: false };
  } catch (error) { return { source, url, status: "ERROR", error: error instanceof Error ? error.message : String(error), causeCode: error?.cause?.code ?? undefined }; }
}));
console.log(JSON.stringify({ sources: results, policy: "catálogos públicos; sem credenciais, APIs privadas ou dados DEMO" }, null, 2));
