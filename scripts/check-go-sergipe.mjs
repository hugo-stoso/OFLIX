const listUrl = "https://gosergipe.se.gov.br/oportunidades";
const apiPath = "/api/oportunidades";
const apiUrl = new URL(`https://gosergipe.se.gov.br${apiPath}`);
apiUrl.search = new URLSearchParams({
  source: "",
  code_ibge: "",
  q: "",
  page: "1",
  status: "aberta",
  pcd_exclusive: "false",
  pcd_inclusive: "false",
  contract_type: "",
  schooling: "",
  for_me: "",
  no_experience: "",
  code_uf: "SE",
}).toString();
const robotsUrl = "https://gosergipe.se.gov.br/robots.txt";
const termsPaths = ["/termos-de-uso", "/politica-de-privacidade", "/privacidade"];
const host = "gosergipe.se.gov.br";
const maxPages = 25;
const timeoutMs = 8_000;

async function getText(target, accept = "text/html,text/plain") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      headers: { accept, "user-agent": "OFLIX/0.1 (+https://oflix-six.vercel.app)" },
      signal: controller.signal,
    });
    return { status: response.status, contentType: response.headers.get("content-type") ?? "", body: await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

async function getJson(target) {
  const response = await getText(target, "application/json");
  let body;
  try {
    body = JSON.parse(response.body);
  } catch {
    throw new Error(`Resposta não JSON em ${target}`);
  }
  return { ...response, body };
}

function safeNextUrl(rawValue) {
  if (typeof rawValue !== "string" || !rawValue) return undefined;
  try {
    const next = new URL(rawValue, apiUrl);
    if (next.protocol !== "https:" || next.hostname !== host || next.pathname !== apiPath) return undefined;
    next.hash = "";
    return next.toString();
  } catch {
    return undefined;
  }
}

function isShell(body) {
  return /<div[^>]+id=["']app["'][^>]*>/iu.test(body) && /<script[^>]+type=["']module["'][^>]+src=["'][^"']*\/assets\//iu.test(body);
}

try {
  const [page, robots, ...terms] = await Promise.all([getText(listUrl), getText(robotsUrl), ...termsPaths.map((path) => getText(`https://${host}${path}`))]);
  let pageUrl = apiUrl.toString();
  const seenIds = new Set();
  const pages = [];
  let sample;
  let structuredError;
  while (pageUrl && pages.length < maxPages) {
    const response = await getJson(pageUrl);
    const results = Array.isArray(response.body?.results) ? response.body.results : null;
    if (response.status < 200 || response.status >= 300 || !results) {
      structuredError = `status=${response.status} ou results ausente`;
      break;
    }
    for (const record of results) {
      const id = record && (typeof record.id === "string" || typeof record.id === "number") ? String(record.id) : "";
      const municipality = record?.ibge_code?.name;
      const state = record?.ibge_code?.state;
      if (!id || typeof record.short_description !== "string" || typeof municipality !== "string" || state !== "SE") continue;
      seenIds.add(id);
      sample ??= {
        source: "GO_SERGIPE",
        sourceId: id,
        title: record.short_description,
        municipality,
        sourceUrl: `https://${host}/detalheOportunidades/${encodeURIComponent(id)}`,
      };
    }
    pages.push({ number: pages.length + 1, status: response.status, results: results.length, count: response.body.count ?? null });
    const nextUrl = safeNextUrl(response.body.next);
    if (!nextUrl || nextUrl === pageUrl || results.length === 0) break;
    pageUrl = nextUrl;
  }
  const robotsLooksLikeRules = /(^|\n)\s*(user-agent|disallow|allow|sitemap)\s*:/iu.test(robots.body);
  const locatedTerms = terms.flatMap((term, index) => term.status >= 200 && term.status < 300 && !isShell(term.body) ? [termsPaths[index]] : []);
  const pageLooksLikeShell = isShell(page.body);
  const sourceUrlIsSafe = sample ? new URL(sample.sourceUrl).protocol === "https:" && new URL(sample.sourceUrl).hostname === host : false;
  const valid = pages.length > 0 && seenIds.size > 0 && Boolean(sample?.title) && sourceUrlIsSafe && !structuredError;

  console.log(JSON.stringify({
    listUrl,
    apiUrl: apiUrl.toString(),
    status: page.status,
    contentType: page.contentType,
    serverRenderedCards: 0,
    clientRenderedAppShell: pageLooksLikeShell,
    structured: { pages, uniqueIds: seenIds.size, sample, error: structuredError ?? null, valid },
    robots: { status: robots.status, contentType: robots.contentType, looksLikeRules: robotsLooksLikeRules },
    terms: { checkedPaths: termsPaths, locatedPaths: locatedTerms, note: locatedTerms.length ? "termos encontrados nos caminhos verificados" : "não localizado nos caminhos verificados" },
    policy: "public GET only; no internal XHR/API, authentication, candidate details or candidature flow",
  }, null, 2));

  if (!valid) process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({ apiUrl: apiUrl.toString(), error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 2;
}
