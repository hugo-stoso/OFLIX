"use client";

import { BrainCircuit, CircleAlert, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { TerritoryAiAnalysis as TerritoryAiAnalysisResult, TerritoryAiFilters, TerritoryAiQuestionAnswer } from "@/lib/ai/territory";

type TerritoryAiAnalysisProps = {
  profileId: string;
  filters: TerritoryAiFilters;
};

function apiErrorMessage(status: number) {
  if (status === 429) return "Aguarde um momento antes de fazer outra solicitação.";
  if (status === 403) return "Esta leitura territorial não está disponível para este perfil.";
  return "Inteligência territorial indisponível neste momento.";
}

export function TerritoryAiAnalysis({ profileId, filters }: TerritoryAiAnalysisProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [analysis, setAnalysis] = useState<TerritoryAiAnalysisResult | null>(null);
  const [analysisFilters, setAnalysisFilters] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<TerritoryAiQuestionAnswer | null>(null);
  const [busy, setBusy] = useState<"analysis" | "question" | null>(null);
  const [error, setError] = useState("");
  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);
  const analysisStale = Boolean(analysis && analysisFilters !== filterKey);

  useEffect(() => {
    let active = true;
    fetch(`/api/territory/ai/status?profileId=${encodeURIComponent(profileId)}`)
      .then((response) => response.ok ? response.json() as Promise<{ enabled?: boolean }> : Promise.reject(new Error("status")))
      .then((value) => { if (active) setEnabled(value.enabled === true); })
      .catch(() => { if (active) setEnabled(false); });
    return () => { active = false; };
  }, [profileId]);

  async function generateAnalysis() {
    setBusy("analysis");
    setError("");
    try {
      const response = await fetch("/api/territory/ai/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, filters }) });
      const body = await response.json() as TerritoryAiAnalysisResult & { error?: string };
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      setAnalysis(body);
      setAnalysisFilters(filterKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível gerar a análise agora.");
    } finally {
      setBusy(null);
    }
  }

  async function askTerritory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setBusy("question");
    setError("");
    try {
      const response = await fetch("/api/territory/ai/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, question, currentFilters: filters }) });
      const body = await response.json() as TerritoryAiQuestionAnswer & { error?: string };
      if (!response.ok) throw new Error(apiErrorMessage(response.status));
      setAnswer(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível analisar a pergunta agora.");
    } finally {
      setBusy(null);
    }
  }

  if (enabled === null || enabled === false) return null;

  return <section className="panel mt-8 p-6 sm:p-8" aria-labelledby="territory-ai-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <div className="flex items-center gap-2"><BrainCircuit size={20} className="text-blue" /><p className="eyebrow">Inteligência territorial</p></div>
        <h2 id="territory-ai-title" className="mt-2 text-2xl font-black tracking-[-.035em] text-navy">Leitura assistida por IA</h2>
        <p className="mt-2 text-sm leading-6 text-[#637688]">A IA interpreta os dados observados neste recorte. As contagens representam anúncios e registros disponíveis nas fontes integradas, não uma estimativa de todo o mercado.</p>
      </div>
      <button type="button" className="button-primary shrink-0" onClick={generateAnalysis} disabled={busy !== null}><BrainCircuit size={16} />{busy === "analysis" ? "Gerando análise..." : "Gerar análise"}</button>
    </div>
    {analysisStale ? <p className="mt-5 rounded-lg border border-[#ecd9ae] bg-[#fff9ec] p-3 text-sm font-semibold leading-5 text-[#775d25]">Os filtros mudaram. Gere uma nova análise para atualizar a leitura.</p> : null}
    {error ? <p className="mt-5 flex items-start gap-2 rounded-lg border border-[#efd0d0] bg-[#fff7f7] p-3 text-sm font-semibold leading-5 text-[#9b3b3b]" role="alert"><CircleAlert size={17} className="mt-0.5 shrink-0" />{error}</p> : null}
    {busy === "analysis" ? <div className="mt-6 flex items-center gap-2 text-sm text-[#637688]" role="status"><Loader2 size={16} className="animate-spin" />Gerando análise...</div> : null}
    {analysis && !analysisStale ? <div className="mt-6 border-t border-line pt-6" aria-live="polite"><p className="max-w-3xl text-base leading-7 text-navy">{analysis.summary}</p><ul className="mt-4 grid gap-3 sm:grid-cols-2">{analysis.highlights.map((highlight) => <li key={highlight} className="rounded-lg bg-[#f5fafc] p-3 text-sm leading-6 text-[#40576b]">{highlight}</li>)}</ul><div className="mt-4 grid gap-2 text-xs leading-5 text-[#718291]"><p><strong>Fatos do recorte:</strong> {analysis.facts.join(" ")}</p>{analysis.caveats.map((caveat) => <p key={caveat}>{caveat}</p>)}</div><p className="mt-4 text-[11px] text-[#8a99a5]">Análise gerada por IA a partir dos dados exibidos nesta página.</p></div> : null}
    <div className="mt-8 border-t border-line pt-6">
      <p className="eyebrow">Pergunte ao território</p>
      <h3 className="mt-2 text-xl font-bold text-navy">Explore o recorte com uma pergunta</h3>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={askTerritory}><label htmlFor="territory-question" className="sr-only">Pergunta ao território</label><input id="territory-question" value={question} onChange={(event) => setQuestion(event.target.value)} className="input min-w-0 flex-1" placeholder="Ex.: qual município tem mais anúncios do GO Sergipe?" maxLength={500} disabled={busy !== null} /><button type="submit" className="button-secondary shrink-0" disabled={busy !== null || !question.trim()}><Send size={16} />{busy === "question" ? "Analisando pergunta..." : "Perguntar"}</button></form>
      {busy === "question" ? <p className="mt-3 flex items-center gap-2 text-sm text-[#637688]" role="status"><Loader2 size={16} className="animate-spin" />Analisando pergunta...</p> : null}
      {answer ? <div className="mt-5 rounded-xl border border-[#c9dce8] bg-[#f5fafc] p-4" aria-live="polite"><p className="text-sm leading-6 text-navy">{answer.answer}</p>{answer.facts.length ? <p className="mt-3 text-xs leading-5 text-[#40576b]"><strong>Fatos:</strong> {answer.facts.join(" ")}</p> : null}<p className="mt-3 text-xs leading-5 text-[#637688]"><strong>Leitura aplicada:</strong> {answer.interpretedQuery}</p><p className="mt-2 text-xs leading-5 text-[#718291]">{answer.caveat}</p></div> : null}
    </div>
  </section>;
}

