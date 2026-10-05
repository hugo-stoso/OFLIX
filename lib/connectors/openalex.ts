import { openAlexSnapshot, openAlexSnapshotFetchedAt } from "@/lib/data/openalex-snapshot";

export type AcademicArticle = {
  openAlexId: string;
  title: string;
  authors: string[];
  year: number;
  source: string;
  doi?: string;
  citedByCount: number;
  openAccess: boolean;
  url?: string;
  topics: string[];
  reason: string;
};

export type AcademicTopic = "Mercado de trabalho" | "Gestão" | "Produtividade";

const cache = new Map<string, { expiresAt: number; items: AcademicArticle[] }>();
const cacheMs = 10 * 60 * 1000;

function sourceName(record: Record<string, unknown>) {
  const primary = record.primary_location;
  if (!primary || typeof primary !== "object") return "Fonte não informada";
  const source = (primary as Record<string, unknown>).source;
  if (!source || typeof source !== "object") return "Fonte não informada";
  const name = (source as Record<string, unknown>).display_name;
  return typeof name === "string" && name.trim() ? name : "Fonte não informada";
}

function authorNames(record: Record<string, unknown>) {
  const authorships = Array.isArray(record.authorships) ? record.authorships : [];
  return authorships.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const author = (entry as Record<string, unknown>).author;
    if (!author || typeof author !== "object") return [];
    const name = (author as Record<string, unknown>).display_name;
    return typeof name === "string" && name.trim() ? [name] : [];
  });
}

function topicFor(query: string, record: Record<string, unknown>): string[] {
  const text = `${query} ${String(record.title ?? "")}`.toLocaleLowerCase("pt-BR");
  const topics: string[] = [];
  if (/mercado|labour|labor|wage|work/.test(text)) topics.push("Mercado de trabalho");
  if (/gest|management|manager/.test(text)) topics.push("Gestão");
  if (/productiv/.test(text)) topics.push("Produtividade");
  return topics.length ? Array.from(new Set(topics)) : ["Mercado de trabalho"];
}

export function normalizeOpenAlexWork(record: Record<string, unknown>, query = "") : AcademicArticle | null {
  const id = typeof record.id === "string" ? record.id.split("/").pop() : "";
  const title = typeof record.display_name === "string" ? record.display_name.trim() : typeof record.title === "string" ? record.title.trim() : "";
  if (!id || !title) return null;
  const openAccess = Boolean((record.open_access as Record<string, unknown> | undefined)?.is_oa ?? record.is_oa);
  const bestLocation = record.best_oa_location as Record<string, unknown> | undefined;
  const primaryLocation = record.primary_location as Record<string, unknown> | undefined;
  const url = (typeof bestLocation?.landing_page_url === "string" && bestLocation.landing_page_url) || (typeof primaryLocation?.landing_page_url === "string" && primaryLocation.landing_page_url) || (typeof record.doi === "string" ? record.doi : undefined);
  return { openAlexId: id, title, authors: authorNames(record), year: Number(record.publication_year ?? 0), source: sourceName(record), ...(typeof record.doi === "string" && record.doi ? { doi: record.doi } : {}), citedByCount: Number(record.cited_by_count ?? 0), openAccess, ...(url ? { url } : {}), topics: topicFor(query, record), reason: openAccess ? "Disponível em acesso aberto segundo a metadata do OpenAlex." : "Relacionado ao tema pesquisado na base OpenAlex." };
}

function searchTokens(value: string) {
  return value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter((token) => token.length > 2);
}

function snapshotFor(topic?: string, query?: string) {
  const normalizedTopic = topic?.toLocaleLowerCase("pt-BR");
  const queryTokens = searchTokens(query ?? "");
  const matching = openAlexSnapshot.filter((article) => {
    const articleText = searchTokens(`${article.title} ${article.topics.join(" ")}`).join(" ");
    const matchesQuery = queryTokens.length === 0 || queryTokens.some((token) => articleText.includes(token));
    const matchesTopic = queryTokens.length > 0 || !normalizedTopic || article.topics.some((item) => item.toLocaleLowerCase("pt-BR") === normalizedTopic);
    return matchesQuery && matchesTopic;
  });
  return queryTokens.length > 0 ? matching : matching.length ? matching : openAlexSnapshot;
}

export function rankAcademicArticles(items: AcademicArticle[], topic?: string, query?: string) {
  const normalizedTopic = topic?.toLocaleLowerCase("pt-BR");
  const normalizedQuery = query?.trim().toLocaleLowerCase("pt-BR");
  return [...items].sort((left, right) => {
    const leftTopic = normalizedTopic && left.topics.some((item) => item.toLocaleLowerCase("pt-BR") === normalizedTopic) ? 1 : 0;
    const rightTopic = normalizedTopic && right.topics.some((item) => item.toLocaleLowerCase("pt-BR") === normalizedTopic) ? 1 : 0;
    const leftQuery = normalizedQuery && left.title.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ? 1 : 0;
    const rightQuery = normalizedQuery && right.title.toLocaleLowerCase("pt-BR").includes(normalizedQuery) ? 1 : 0;
    return rightTopic - leftTopic || rightQuery - leftQuery || Number(right.openAccess) - Number(left.openAccess) || right.year - left.year || right.citedByCount - left.citedByCount;
  });
}

export async function getAcademicArticles({ topic, query }: { topic?: AcademicTopic; query?: string } = {}) {
  const cacheKey = `${topic ?? "all"}:${query ?? ""}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { source: "OPENALEX" as const, fallback: false, fetchedAt: new Date().toISOString(), items: cached.items };
  const search = query?.trim() || topic || "labour market productivity management";
  try {
    const endpoint = new URL("https://api.openalex.org/works");
    endpoint.searchParams.set("search", search);
    endpoint.searchParams.set("filter", "type:article");
    endpoint.searchParams.set("per-page", "12");
    if (process.env.OPENALEX_API_KEY) endpoint.searchParams.set("api_key", process.env.OPENALEX_API_KEY);
    const response = await fetch(endpoint, { next: { revalidate: 600 }, headers: { Accept: "application/json", "User-Agent": "OFLIX-demo/0.1" } });
    if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
    const payload = await response.json() as { results?: Record<string, unknown>[] };
    const items = rankAcademicArticles((payload.results ?? []).map((record) => normalizeOpenAlexWork(record, search)).filter((item): item is AcademicArticle => Boolean(item)), topic, query).slice(0, 8);
    if (!items.length) throw new Error("OpenAlex sem resultados");
    cache.set(cacheKey, { expiresAt: Date.now() + cacheMs, items });
    return { source: "OPENALEX" as const, fallback: false, fetchedAt: new Date().toISOString(), items };
  } catch {
    const items = rankAcademicArticles(snapshotFor(topic, query), topic, query).slice(0, 8);
    return { source: "OPENALEX_SNAPSHOT" as const, fallback: true, fetchedAt: openAlexSnapshotFetchedAt, items };
  }
}
