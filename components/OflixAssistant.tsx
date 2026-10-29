"use client";

import { BrainCircuit, CircleAlert, ExternalLink, Loader2, Send } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { DeterministicAssistantAnswer } from "@/lib/ai/opportunities";

type AssistantResult = DeterministicAssistantAnswer & {
  mode: "deterministic" | "gemini" | "fallback";
  gemini: { requested: boolean; available: boolean; used: boolean; reason: string; reasonLabel?: string };
  geminiQuota?: { allowed: boolean; reason: string; userRemaining: number | null; globalRemaining: number | null; minuteRemaining: number | null; dailyResetAt: string | null; minuteResetAt: string | null; storageConfigured: boolean };
  sources: Array<{ provider: string; count: number; stale: boolean; partial: boolean; error?: string }>;
  collectedAt?: string;
  stale: boolean;
  partial: boolean;
};

type Props = { profileId: string; activities: string[]; workPreferences: string[] };

function apiErrorMessage(status: number) {
  if (status === 429) return "O assistente atingiu o limite temporário. Aguarde um momento e tente novamente.";
  if (status === 403) return "O assistente está disponível apenas para perfis de pessoa nesta demonstração.";
  return "O Assistente OFLIX está indisponível neste momento.";
}

function itemSalary(item: NonNullable<AssistantResult["matches"]>[number]) {
  if (item.salary) return item.salary;
  const value = item.salaryMax ?? item.salaryMin;
  return value === undefined ? "" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const aggregateIntents = new Set(["by_municipality", "by_profession", "compare_municipalities", "compare_professions"]);

function collectionLabel(value: string | undefined) {
  if (!value) return "";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(timestamp) : value;
}

export function OflixAssistant({ profileId, activities, workPreferences }: Props) {
  const [question, setQuestion] = useState("");
  const [useGemini, setUseGemini] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [geminiBlockedReason, setGeminiBlockedReason] = useState("");
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/intelligence/status")
      .then((response) => response.ok ? response.json() as Promise<{ gemini?: { available?: boolean; blockedReason?: string | null } }> : Promise.reject(new Error("status")))
      .then((body) => { if (active) { setGeminiAvailable(body.gemini?.available === true); setGeminiBlockedReason(body.gemini?.blockedReason ?? ""); } })
      .catch(() => { if (active) setGeminiAvailable(false); });
    return () => { active = false; };
  }, []);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/intelligence/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, question, activities, workPreferences, useGemini }) });
      const body = await response.json() as AssistantResult & { error?: string };
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      setResult(aggregateIntents.has(body.analysis?.intent ?? "") ? { ...body, matches: [] } : body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar o assistente agora.");
    } finally {
      setBusy(false);
    }
  }

  const aggregateAnalysis = result?.analysis && aggregateIntents.has(result.analysis.intent) ? result.analysis : undefined;

  return <section className="mt-8 rounded-2xl border border-[#c9dce8] bg-[#f5fafc] p-5 sm:p-6" aria-labelledby="oflix-assistant-title">
    <div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 text-blue"><BrainCircuit size={19} /></span><div><p className="eyebrow">Assistente OFLIX</p><h2 id="oflix-assistant-title" className="mt-2 text-2xl font-bold tracking-[-.03em] text-navy">Pergunte sobre oportunidades e carreira</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">A resposta começa por busca determinística em fontes públicas verificáveis. O assistente não inventa vagas, cursos, concursos, salários ou qualificações.</p></div></div>
    <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={ask}><label htmlFor="oflix-assistant-question" className="sr-only">Pergunta para o Assistente OFLIX</label><input id="oflix-assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ex.: há vagas de logística em Aracaju?" maxLength={500} className="input min-w-0 flex-1 bg-white" disabled={busy} /><button type="submit" className="button-primary shrink-0" disabled={busy || !question.trim()}><Send size={16} />{busy ? "Consultando…" : "Perguntar"}</button></form>
    <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#637688]"><input type="checkbox" checked={useGemini} onChange={(event) => setUseGemini(event.target.checked)} disabled={!geminiAvailable || busy} className="mt-1 h-4 w-4 accent-[#1d5b8f]" />{geminiAvailable ? "Permitir Gemini nesta pergunta para melhorar a redação da resposta (opcional). Os cartões e fatos continuam determinados pelo backend." : geminiBlockedReason === "free_tier_unconfirmed" ? "Gemini opcional bloqueado até a confirmação da franquia gratuita; a resposta determinística continua disponível." : "Gemini opcional não está configurado neste ambiente; a resposta determinística continua disponível."}</label>
    {error ? <p className="mt-4 flex items-start gap-2 rounded-lg border border-[#efd0d0] bg-[#fff7f7] p-3 text-sm font-semibold leading-6 text-[#9b3b3b]" role="alert"><CircleAlert size={17} className="mt-1 shrink-0" />{error}</p> : null}
    {busy ? <p className="mt-4 flex items-center gap-2 text-sm text-[#637688]" role="status"><Loader2 size={16} className="animate-spin" />Consultando fontes verificáveis…</p> : null}
    {result && aggregateAnalysis?.groups?.length ? <section className="mt-5 rounded-xl border border-[#d5e4ec] bg-white p-4" aria-labelledby="assistant-analysis-ranking-title" data-testid="assistant-analysis-ranking">
      <h3 id="assistant-analysis-ranking-title" className="text-sm font-bold text-navy">Ranking do recorte</h3>
      <p className="mt-1 text-xs leading-5 text-[#637688]">A ordem usa número de publicações/anúncios verificáveis. Postos são uma métrica separada e só aparecem quando informados pela fonte.</p>
      <ol className="mt-3 space-y-3">
        {aggregateAnalysis.groups.slice(0, 10).map((group) => <li key={group.label} className="rounded-lg border border-[#e7eef3] p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="text-sm text-navy">{group.label}</strong><span className="text-xs font-semibold text-[#52687a]">{group.count} {group.count === 1 ? "publicação" : "publicações"} / anúncios</span></div>
          <p className="mt-1 text-xs leading-5 text-[#637688]">{group.positions === undefined ? "Postos oferecidos: não informados pela fonte." : "Postos oferecidos: " + group.positions + " (" + group.positionsKnownCount + " de " + group.count + " publicações com esse campo)."}</p>
          <p className="mt-1 text-xs leading-5 text-[#637688]">Fontes: {group.sourceCounts.map((source) => source.label + " (" + source.count + ")").join(", ")}.</p>
        </li>)}
      </ol>
      {result.collectedAt ? <p className="mt-4 text-xs leading-5 text-[#637688]"><strong>Dados coletados em:</strong> {collectionLabel(result.collectedAt)}.</p> : null}
      {result.sources.length ? <p className="mt-1 text-xs leading-5 text-[#637688]"><strong>Fontes consultadas:</strong> {result.sources.map((source) => source.provider + " (" + source.count + " publicações" + (source.partial ? "; parcial" : "") + (source.stale ? "; desatualizada" : "") + (source.error ? "; com erro" : "") + ")").join(" · ")}.</p> : null}
    </section> : null}
    {result ? <div className="mt-5 border-t border-[#d5e4ec] pt-5" aria-live="polite"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#607286]"><span className="rounded-full bg-white px-2.5 py-1">{result.mode === "gemini" ? "Redação com Gemini" : result.mode === "fallback" ? "Fallback determinístico" : "Resposta determinística"}</span>{result.mode === "fallback" || result.mode === "gemini" ? <span className="rounded-full bg-white px-2.5 py-1">{result.gemini.reasonLabel ?? result.gemini.reason}</span> : null}{result.stale || result.partial ? <span className="rounded-full bg-[#fff9ec] px-2.5 py-1 text-[#775d25]">Fonte parcial ou desatualizada</span> : null}</div>{result.geminiQuota?.storageConfigured && result.geminiQuota.userRemaining !== null ? <p className="mt-3 text-xs font-semibold text-[#52687a]">Perguntas Gemini restantes hoje: {result.geminiQuota.userRemaining}.</p> : null}<p className="mt-3 text-sm leading-7 text-navy">{result.answer}</p>{result.facts.length ? <p className="mt-3 text-xs leading-5 text-[#52687a]"><strong>Fatos encontrados:</strong> {result.facts.join(" ")}</p> : null}<p className="mt-3 text-xs leading-5 text-[#637688]"><strong>Busca interpretada:</strong> {result.interpretedQuery.summary || "recorte geral"}</p>{result.matches.length ? <div className="mt-4 grid gap-3">{result.matches.slice(0, 5).map((item) => <article key={`${item.source}-${item.id}`} className="rounded-lg border border-white bg-white p-4"><p className="text-sm font-bold text-navy">{item.title}</p><p className="mt-1 text-xs text-[#637688]">{item.location.municipality} · Fonte: {item.sourceLabel}</p>{item.salary || item.salaryMin !== undefined || item.salaryMax !== undefined ? <p className="mt-1 text-xs font-semibold text-navy">Remuneração publicada: {itemSalary(item)}</p> : null}{item.publishedAt ? <p className="mt-1 text-xs text-[#637688]">Publicada em: {item.publishedAt}</p> : null}{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue hover:underline">Abrir fonte oficial <ExternalLink size={13} /></a> : null}</article>)}</div> : null}<ul className="mt-4 list-disc space-y-1 pl-4 text-xs leading-5 text-[#718291]">{result.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div> : null}
  </section>;
}
