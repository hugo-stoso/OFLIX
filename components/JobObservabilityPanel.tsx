"use client";

import { CircleAlert, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { JobObservabilitySnapshot, JobObservabilitySourceSummary, SourceCollectionRun } from "@/lib/job-observability";

function sourceLabel(source: string) {
  if (source === "GO_SERGIPE") return "GO Sergipe";
  if (source === "EMPREGAJU") return "EmpregAju";
  if (source === "IEL_SERGIPE") return "IEL Sergipe";
  return source;
}

function freshnessLabel(source: JobObservabilitySourceSummary) {
  if (!source.enabled) return "Desabilitada";
  if (source.freshness === "STALE") return "Stale · fallback";
  if (source.freshness === "ERROR") return "Erro na coleta";
  return source.partial ? "Atualizada · parcial" : "Atualizada";
}

function coverageLabel(source: JobObservabilitySourceSummary) {
  if (source.coverageMode === "FULL") return source.sourceAvailableCount === undefined ? "Completa" : `Completa · ${source.sourceAvailableCount} disponíveis`;
  if (source.coverageMode === "PARTIAL") return "Parcial";
  return "Não mensurável";
}

function dateLabel(value?: string) {
  if (!value) return "Ainda não coletada";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function runStats(run?: SourceCollectionRun) {
  if (!run) return "Sem coleta nesta execução";
  return `${run.newCount} novos · ${run.updatedCount} atualizados · ${run.unchangedCount} inalterados · ${run.disappearedCount} ausentes`;
}

export function JobObservabilityPanel({ profileId }: { profileId: string }) {
  const [snapshot, setSnapshot] = useState<JobObservabilitySnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/observability/jobs?profileId=${encodeURIComponent(profileId)}`)
      .then((response) => response.ok ? response.json() as Promise<JobObservabilitySnapshot> : Promise.reject(new Error("observability")))
      .then((value) => { if (active) setSnapshot(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [profileId]);

  return <section className="panel mt-8 p-6 sm:p-8" aria-labelledby="job-observability-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <p className="eyebrow">Saúde das fontes</p>
        <h2 id="job-observability-title" className="mt-2 text-2xl font-black tracking-[-.035em] text-navy">Cobertura e atualização</h2>
        <p className="mt-2 text-sm leading-6 text-[#637688]">Métricas agregadas da coleta pública de empregos externos. Cache hit não conta como nova coleta; anúncios são identificados por fonte e identificador público.</p>
      </div>
      <RefreshCw size={20} className="text-blue" aria-hidden="true" />
    </div>
    {error ? <p className="mt-5 flex items-start gap-2 rounded-lg border border-[#efd0d0] bg-[#fff7f7] p-3 text-sm font-semibold leading-5 text-[#9b3b3b]" role="alert"><CircleAlert size={17} className="mt-0.5 shrink-0" />Não foi possível carregar a saúde das fontes agora.</p> : null}
    {!snapshot && !error ? <div className="mt-6 flex items-center gap-2 text-sm text-[#637688]" role="status"><Loader2 size={16} className="animate-spin" />Atualizando métricas...</div> : null}
    {snapshot ? <>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-line bg-[#f8fbfd] p-4"><p className="eyebrow">Anúncios observados</p><p className="mt-2 text-2xl font-black text-navy">{snapshot.overview.currentCount}</p></div>
        <div className="rounded-xl border border-line bg-[#f8fbfd] p-4"><p className="eyebrow">Fontes ativas</p><p className="mt-2 text-2xl font-black text-navy">{snapshot.overview.sourceCount}</p></div>
        <div className="rounded-xl border border-line bg-[#f8fbfd] p-4"><p className="eyebrow">Novos na coleta</p><p className="mt-2 text-2xl font-black text-navy">{snapshot.overview.newCount}</p></div>
        <div className="rounded-xl border border-line bg-[#f8fbfd] p-4"><p className="eyebrow">Última coleta OK</p><p className="mt-2 text-sm font-bold text-navy">{dateLabel(snapshot.overview.lastSuccessfulCollectedAt)}</p></div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {snapshot.sources.map((source) => <article key={source.source} className="min-w-0 rounded-xl border border-line bg-white p-5" aria-label={`Saúde da fonte ${sourceLabel(source.source)}`}>
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="eyebrow truncate">{source.provider}</p><h3 className="mt-2 break-words text-lg font-black text-navy">{sourceLabel(source.source)}</h3></div><span className="shrink-0 rounded-full bg-[#edf5f8] px-2.5 py-1 text-[10px] font-black uppercase tracking-[.08em] text-blue">{source.freshness}</span></div>
          <dl className="mt-5 grid gap-2 text-sm text-[#637688]"><div className="flex justify-between gap-3"><dt>Registros atuais</dt><dd className="font-bold text-navy">{source.currentCount}</dd></div><div className="flex justify-between gap-3"><dt>Cobertura</dt><dd className="text-right font-bold text-navy">{coverageLabel(source)}</dd></div><div className="flex justify-between gap-3"><dt>Estado</dt><dd className="text-right font-bold text-navy">{freshnessLabel(source)}</dd></div><div className="flex justify-between gap-3"><dt>Última coleta</dt><dd className="text-right font-bold text-navy">{dateLabel(source.lastSuccessfulCollectedAt)}</dd></div></dl>
          <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-[#637688]">{runStats(source.latestRun)}</p>
          {source.latestRun ? <p className="mt-2 text-xs leading-5 text-[#637688]">{source.latestRun.pages} página(s) · {source.latestRun.durationMs} ms{source.latestRun.servedFromStale ? " · fallback stale" : ""}</p> : null}
          {source.discoveryLatency.available ? <p className="mt-2 text-xs leading-5 text-[#637688]">Latência mediana: {Math.round((source.discoveryLatency.medianMs ?? 0) / 60000)} min · amostra {source.discoveryLatency.sampleSize}</p> : null}
        </article>)}
      </div>
      {!snapshot.historyAvailable ? <p className="mt-5 rounded-lg border border-[#ecd9ae] bg-[#fff9ec] p-3 text-sm leading-6 text-[#775d25]">Histórico ainda não disponível para calcular latência de descoberta. {snapshot.historyReason}</p> : null}
      <p className="mt-5 text-xs leading-5 text-[#718291]">{snapshot.methodology.disappearance} {snapshot.methodology.latency}</p>
    </> : null}
  </section>;
}
