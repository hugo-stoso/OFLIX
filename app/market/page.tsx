"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Info, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/compensation";
import { getOfficialSalaryStatus, type OfficialSalaryStatus } from "@/lib/official-market";
import { announcedSummaryLabel, type AnnouncedMarketSummary } from "@/lib/market";
import { contextualLegislation, legislationCards, type LegislationCard } from "@/lib/legislation";
import type { AcademicArticle } from "@/lib/connectors/openalex";

type MarketTab = "salary" | "legislation" | "articles";
const tabs: { id: MarketTab; label: string; description: string }[] = [
  { id: "salary", label: "Salários e mercado", description: "Vagas divulgadas e mercado formal" },
  { id: "legislation", label: "Legislação para trabalho e negócios", description: "Fichas editoriais com fonte oficial" },
  { id: "articles", label: "Artigos & evidências", description: "Metadata acadêmica explicável" },
];
const topics = ["Mercado de trabalho", "Gestão", "Produtividade"] as const;

function dateLabel(value?: string | null) {
  if (!value) return "Não disponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function LegislationList({ cards }: { cards: LegislationCard[] }) {
  return <div className="grid gap-4 lg:grid-cols-2">{cards.map((card) => <article key={card.id} className="rounded-2xl border border-line bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-blue"><span>{card.topic}</span><span className="h-1 w-1 rounded-full bg-[#9aabb8]" aria-hidden="true" /><span>{card.year}</span></div><h3 className="mt-3 text-xl font-bold tracking-[-.02em] text-navy">{card.shortTitle}</h3><p className="mt-1 text-sm font-semibold text-[#637688]">{card.title}</p><p className="mt-4 text-sm leading-6 text-[#52687a]">{card.summary}</p><div className="mt-4 flex flex-wrap gap-2">{card.audiences.map((audience) => <span key={audience} className="rounded-full bg-[#edf6fb] px-2.5 py-1 text-xs font-bold text-blue">{audience}</span>)}</div>{card.milestones && <div className="mt-5 border-t border-line pt-4"><p className="text-xs font-black uppercase tracking-[.12em] text-[#6b7d8d]">Marcos oficiais</p><ul className="mt-3 space-y-2 text-sm text-[#52687a]">{card.milestones.map((milestone) => <li key={milestone.reference}><a href={milestone.url} target="_blank" rel="noreferrer" className="font-bold text-blue hover:underline">{milestone.reference}</a><span className="ml-2">{milestone.label}</span></li>)}</ul></div>}<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-[#718291]"><span>Última verificação: {dateLabel(card.lastCheckedAt)}</span><a href={card.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-blue hover:underline">Consultar texto oficial <ExternalLink size={13} /></a></div></article>)}</div>;
}

export default function MarketKnowledgePage() {
  const [activeTab, setActiveTab] = useState<MarketTab>("salary");
  const [profession, setProfession] = useState("");
  const [municipality, setMunicipality] = useState("Aracaju");
  const [category, setCategory] = useState("");
  const [announced, setAnnounced] = useState<AnnouncedMarketSummary | null>(null);
  const [announcedLoading, setAnnouncedLoading] = useState(true);
  const [announcedError, setAnnouncedError] = useState(false);
  const [official, setOfficial] = useState<OfficialSalaryStatus>(() => getOfficialSalaryStatus());
  const [articleTopic, setArticleTopic] = useState<typeof topics[number]>("Mercado de trabalho");
  const [articles, setArticles] = useState<AcademicArticle[]>([]);
  const [articlesSource, setArticlesSource] = useState("");
  const [articlesFallback, setArticlesFallback] = useState(false);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [articlesError, setArticlesError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const context = params.get("context");
    const nextTab = params.get("tab") as MarketTab | null;
    if (nextTab && tabs.some((tab) => tab.id === nextTab)) setActiveTab(nextTab);
    setProfession(params.get("profession") ?? "");
    setMunicipality(params.get("municipality") ?? "Aracaju");
    if (context) setActiveTab("legislation");
  }, []);

  async function loadAnnounced() {
    setAnnouncedLoading(true); setAnnouncedError(false);
    try {
      const params = new URLSearchParams();
      if (municipality) params.set("municipality", municipality);
      if (category) params.set("category", category);
      const response = await fetch(`/api/market/announced?${params.toString()}`);
      if (!response.ok) throw new Error("request");
      setAnnounced(await response.json() as AnnouncedMarketSummary);
    } catch {
      setAnnouncedError(true);
    } finally {
      setAnnouncedLoading(false);
    }
  }

  async function loadArticles(topic = articleTopic, query = "") {
    setArticlesLoading(true); setArticlesError(false);
    try {
      const params = new URLSearchParams({ topic });
      if (query) params.set("q", query);
      const response = await fetch(`/api/knowledge?${params.toString()}`);
      if (!response.ok) throw new Error("request");
      const data = await response.json() as { items: AcademicArticle[]; source: string; fallback: boolean };
      setArticles(data.items ?? []); setArticlesSource(data.source); setArticlesFallback(Boolean(data.fallback));
    } catch {
      setArticlesError(true);
    } finally {
      setArticlesLoading(false);
    }
  }

  // The initial request intentionally captures the initial recorte; subsequent changes use the explicit action buttons.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadAnnounced(); void loadArticles(); }, []);

  const context = useMemo(() => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search).get("context") ?? undefined, []);
  const contextualCards = context ? contextualLegislation(context) : legislationCards;

  return <main className="min-h-screen pb-16"><header className="border-b border-line bg-white"><div className="shell flex min-h-20 items-center justify-between gap-4"><Link href="/demo" className="font-black tracking-[-.04em] text-navy">OFLIX <span className="font-medium text-[#7a8b98]">· Sergipe</span></Link><Link href="/demo" className="button-quiet"><ArrowLeft size={16} /> Voltar à demonstração</Link></div></header><div className="shell py-8 sm:py-12"><div className="max-w-[800px]"><p className="eyebrow">Camada complementar</p><h1 className="mt-3 text-4xl font-black leading-tight tracking-[-.05em] text-navy sm:text-5xl">Mercado &amp; Conhecimento</h1><p className="body-copy mt-4 max-w-[680px]">Entenda salários, legislação e pesquisas relacionadas à sua trajetória, sem misturar dados de naturezas diferentes.</p></div><nav className="mt-8 grid gap-2 border-b border-line sm:grid-cols-3" aria-label="Seções de Mercado e Conhecimento">{tabs.map((tab) => <button key={tab.id} type="button" className={`border-b-2 px-2 py-4 text-left transition sm:px-3 ${activeTab === tab.id ? "border-blue text-blue" : "border-transparent text-[#637688] hover:text-navy"}`} onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}><span className="block text-sm font-black">{tab.label}</span><span className="mt-1 block text-xs font-medium">{tab.description}</span></button>)}</nav>{activeTab === "salary" && <section className="mt-8" aria-labelledby="salary-title"><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]"><div><p className="eyebrow">Salários e mercado</p><h2 id="salary-title" className="mt-2 text-2xl font-black tracking-[-.03em] text-navy">Duas leituras, duas fontes</h2><p className="mt-3 max-w-[680px] text-sm leading-6 text-[#637688]">A remuneração anunciada vem das publicações da OFLIX. O salário médio de admissão depende de uma fonte oficial do mercado formal e nunca é combinado com ela.</p><div className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Vagas divulgadas</p><h3 className="mt-2 text-xl font-bold text-navy">Remuneração média anunciada</h3></div><Info size={18} className="text-blue" /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Município<select aria-label="Município da média anunciada" value={municipality} onChange={(event) => setMunicipality(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option>Aracaju</option><option>Lagarto</option><option>Nossa Senhora do Socorro</option></select></label><label className="text-sm font-bold text-navy">Categoria OFLIX<select aria-label="Categoria da média anunciada" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="">Todas as categorias</option><option>Operações</option><option>Atendimento</option><option>Logística</option><option>Comunicação</option><option>Educação</option></select></label></div><button type="button" className="button-secondary mt-4" onClick={() => void loadAnnounced()} disabled={announcedLoading}><Search size={16} /> {announcedLoading ? "Calculando…" : "Atualizar recorte"}</button>{announcedError && <p role="alert" className="mt-4 text-sm font-semibold text-[#9c3131]">Não foi possível carregar este recorte.</p>}{announced && <div className="mt-6 rounded-xl bg-[#f5fafc] p-5"><p className="text-3xl font-black tracking-[-.03em] text-navy">{announced.average === null ? "—" : formatCurrency(announced.average)}</p><p className="mt-1 font-bold text-navy">{announcedSummaryLabel(announced)}</p><p className="mt-3 text-sm leading-6 text-[#637688]">Base OFLIX · {municipality}{category ? ` · ${category}` : ""}. Não representa o salário médio da profissão no mercado.</p><details className="mt-4 text-sm text-[#637688]"><summary className="cursor-pointer font-bold text-blue">Como calculamos</summary><ul className="mt-2 list-disc space-y-1 pl-5">{announced.methodology.map((line) => <li key={line}>{line}</li>)}</ul></details></div>}</div></div><aside className="h-fit rounded-2xl border border-[#f1d9a5] bg-[#fffaf0] p-5 sm:p-6"><p className="eyebrow text-[#8a5a00]">Mercado formal · fonte externa</p><h3 className="mt-2 text-xl font-bold text-navy">Salário médio de admissão</h3><p className="mt-3 text-sm leading-6 text-[#6f5b32]">{official.message}</p><label className="mt-5 block text-sm font-bold text-navy">Buscar profissão<input aria-label="Buscar profissão" value={profession} onChange={(event) => { setProfession(event.target.value); setOfficial(getOfficialSalaryStatus({ occupationLabel: event.target.value, municipality, state: "SE" })); }} placeholder="Ex.: Eletricista" className="mt-2 w-full rounded-lg border border-[#e5d5ac] bg-white px-3 py-3 font-normal" /></label><p className="mt-4 text-xs leading-5 text-[#6f5b32]">Recorte previsto: ocupação determinística + CBO + município + competência. Sem correspondência segura, nenhum CBO é inferido.</p><a href={official.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue hover:underline">Consultar MTE/PDET <ExternalLink size={14} /></a></aside></div></section>}{activeTab === "legislation" && <section className="mt-8" aria-labelledby="legislation-title"><p className="eyebrow">Biblioteca editorial</p><h2 id="legislation-title" className="mt-2 text-2xl font-black tracking-[-.03em] text-navy">Legislação para trabalho e negócios</h2><p className="mt-3 max-w-[760px] text-sm leading-6 text-[#637688]">Fichas curtas para descobrir quais normas podem ser relevantes. O conteúdo é informativo; consulte o texto oficial e orientação profissional quando necessário.</p>{context && contextualCards.length < legislationCards.length && <p className="mt-4 rounded-lg border border-[#c9dce8] bg-[#f5fafc] p-3 text-sm font-semibold text-[#52687a]">Contexto selecionado: mostramos primeiro as fichas relacionadas a “{context}”.</p>}<div className="mt-6"><LegislationList cards={contextualCards} /></div></section>}{activeTab === "articles" && <section className="mt-8" aria-labelledby="articles-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">Metadata acadêmica</p><h2 id="articles-title" className="mt-2 text-2xl font-black tracking-[-.03em] text-navy">Artigos &amp; evidências</h2><p className="mt-3 max-w-[720px] text-sm leading-6 text-[#637688]">Recomendações transparentes por tema, atualidade, citações e acesso aberto. Citações não são sinônimo de qualidade.</p></div><div className="flex flex-wrap gap-2" role="tablist" aria-label="Tema dos artigos">{topics.map((topic) => <button key={topic} type="button" role="tab" aria-selected={articleTopic === topic} onClick={() => { setArticleTopic(topic); void loadArticles(topic); }} className={`rounded-full border px-3 py-2 text-sm font-bold ${articleTopic === topic ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688]"}`}>{topic}</button>)}</div></div>{articlesLoading && <p role="status" className="mt-6 text-sm text-[#637688]">Carregando metadata de artigos…</p>}{articlesError && <div role="alert" className="mt-6 rounded-lg border border-[#efc6c6] bg-[#fff5f5] p-4 text-sm font-semibold text-[#9c3131]">A fonte acadêmica está indisponível e o snapshot não pôde ser carregado.</div>}{!articlesLoading && !articlesError && <><p className="mt-5 text-xs font-semibold text-[#718291]">Fonte: {articlesSource === "OPENALEX_SNAPSHOT" ? "snapshot local de metadata real · coletado em 05/10/2026" : "OpenAlex · consulta pública"}{articlesFallback ? " · fallback determinístico" : ""}</p><div className="mt-4 grid gap-4">{articles.map((article) => <article key={article.openAlexId} className="rounded-2xl border border-line bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#6b7d8d]"><span>{article.year}</span><span>·</span><span>{article.source}</span><span>·</span><span>{article.citedByCount} citações na base OpenAlex</span>{article.openAccess && <span className="rounded-full bg-[#edf8f2] px-2 py-1 text-[#227252]">Acesso aberto</span>}</div><h3 className="mt-3 text-lg font-bold text-navy">{article.title}</h3><p className="mt-2 text-sm text-[#637688]">{article.authors.join(", ") || "Autores não informados"}</p><div className="mt-3 flex flex-wrap gap-2">{article.topics.map((topic) => <span key={topic} className="rounded-full bg-[#f3f6f8] px-2.5 py-1 text-xs font-bold text-[#637688]">{topic}</span>)}</div><p className="mt-4 text-sm leading-6 text-[#52687a]"><strong className="text-navy">Por que recomendamos:</strong> {article.reason}</p><div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">{article.url && <a href={article.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue hover:underline">Ler artigo <ExternalLink size={14} /></a>}{article.doi && <a href={article.doi} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue hover:underline">Ver DOI <ExternalLink size={14} /></a>}<a href={`https://openalex.org/${article.openAlexId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[#637688] hover:underline">Ver OpenAlex <ExternalLink size={14} /></a></div></article>)}</div></>}</section>}</div></main>;
}
