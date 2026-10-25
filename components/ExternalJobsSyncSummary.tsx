"use client";

type SourceSummary = {
  label: string;
  count: number;
  status: "idle" | "loading" | "success" | "error";
  partial?: boolean;
  stale?: boolean;
};

export function ExternalJobsSyncSummary({ sources, total, loading }: { sources: SourceSummary[]; total: number; loading: boolean }) {
  if (!sources.some((source) => source.status !== "idle")) return null;
  const statusLabel = (source: SourceSummary) => source.status === "loading" ? "Carregando" : source.status === "error" ? "Falha" : source.partial ? "Parcial" : source.stale ? "Stale" : "Concluído";
  const overall = loading ? "Sincronização em andamento" : sources.some((source) => source.status === "error" || source.partial) ? "Sincronização parcial" : "Sincronização concluída";
  return <section className="mb-5 rounded-xl border border-[#c9dce8] bg-[#f5fafc] p-4" aria-label="Status do carregamento de vagas externas" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-navy">{overall}</p><p className="text-xs font-semibold text-[#637688]">{loading ? "Total conhecido até agora" : "Total deduplicado"}: {total}{loading ? "+" : ""}</p></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-3">{sources.map((source) => <div key={source.label} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-xs"><span className="font-bold text-navy">{source.label}</span><span className="text-right font-semibold text-[#637688]">{source.count}{loading && source.status === "loading" ? "+" : ""} · {statusLabel(source)}</span></div>)}</div>
    {loading && <p className="mt-3 text-xs leading-5 text-[#637688]">Os números são provisórios enquanto alguma fonte responde; a conclusão da consulta não representa cobertura integral do portal.</p>}
  </section>;
}
