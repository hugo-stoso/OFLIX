const sources = [
  { source: "SEAD_SERGIPE", url: "https://sead.se.gov.br/concursos/concursos-em-andamento/" },
  { source: "ARACAJU_EDITAIS", url: "https://www.aracaju.se.gov.br/editais", fallbackUrl: "http://transparencia.aracaju.se.gov.br/prefeitura/editais-de-concurso-e-pss/" },
];
const results = await Promise.all(sources.map(async ({ source, url }) => {
  try {
    let response = await fetch(url, { headers: { accept: "text/html" }, signal: AbortSignal.timeout(10000) });
    let html = await response.text();
    let usedUrl = url;
    if (source === "ARACAJU_EDITAIS" && !/(concurso|processo seletivo|PSS)/iu.test(html)) {
      response = await fetch("http://transparencia.aracaju.se.gov.br/prefeitura/editais-de-concurso-e-pss/", { headers: { accept: "text/html" }, signal: AbortSignal.timeout(10000) });
      html = await response.text();
      usedUrl = "http://transparencia.aracaju.se.gov.br/prefeitura/editais-de-concurso-e-pss/";
    }
    const candidates = [...html.matchAll(/href="([^"]+)"[^>]*>([^<]*(?:concurso|processo seletivo|PSS)[^<]*)</giu)]
      .map((match) => ({ title: match[2].replace(/\s+/g, " ").trim(), url: new URL(match[1], usedUrl).toString() }));
    return { source, url: usedUrl, status: response.status, rawCandidates: candidates.length, uniqueUrls: new Set(candidates.map((item) => item.url)).size, excludedDemo: true };
  } catch (error) { return { source, url, status: "ERROR", error: error instanceof Error ? error.message : String(error) }; }
}));
console.log(JSON.stringify({ sources: results, policy: "somente agregados; sem catálogos ou respostas brutas" }, null, 2));
