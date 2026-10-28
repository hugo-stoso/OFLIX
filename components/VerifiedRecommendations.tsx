"use client";

import { CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { DiscoveryRow } from "@/components/DiscoveryRow";
import type { VerifiedRecommendation } from "@/lib/ai/opportunities";

type SourceHealth = { source: string; provider: string; count: number; stale: boolean; partial: boolean; error?: string };

type Props = {
  recommendations: VerifiedRecommendation[];
  limitations: string[];
  sources: SourceHealth[];
  loading: boolean;
  error: string;
  returnTo?: string;
};

export function VerifiedRecommendations({ recommendations, limitations, sources, loading, error, returnTo }: Props) {
  return <section className="mt-8" aria-labelledby="verified-recommendations-title">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#227252]" /><p className="eyebrow text-[#227252]">Inteligência de oportunidades</p></div>
        <h2 id="verified-recommendations-title" className="mt-2 text-2xl font-bold tracking-[-.03em] text-navy">Recomendado com fonte verificável</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#637688]">Compatibilidade indicativa calculada com seu município, interesses e preferências. A candidatura e a leitura final acontecem na fonte original.</p>
      </div>
      <span className="rounded-full bg-[#edf8f2] px-3 py-1.5 text-xs font-bold text-[#227252]">DEMO DATA excluído</span>
    </div>
    {loading ? <div className="panel mt-4 flex items-center gap-2 p-6 text-sm text-[#637688]" role="status"><Loader2 size={17} className="animate-spin" />Consultando fontes públicas verificadas…</div> : null}
    {error ? <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#efd0d0] bg-[#fff7f7] p-4 text-sm font-semibold leading-6 text-[#9b3b3b]" role="alert"><CircleAlert size={17} className="mt-1 shrink-0" />{error}</div> : null}
    {!loading && !recommendations.length ? <div className="panel mt-4 border-dashed p-6" data-testid="verified-recommendations-empty"><p className="font-bold text-navy">Nenhuma oportunidade verificável disponível agora.</p><p className="mt-2 text-sm leading-6 text-[#637688]">O OFLIX não substitui esta ausência por registros fictícios. Tente outra busca ou volte quando uma fonte oficial estiver disponível.</p></div> : null}
    {recommendations.length ? <div className="panel mt-4 px-5 sm:px-8">{recommendations.map((recommendation) => <DiscoveryRow key={`${recommendation.item.source}-${recommendation.item.id}`} item={recommendation.item} compatibility={recommendation.compatibility} reason={recommendation.reasons} returnTo={returnTo} />)}</div> : null}
    <div className="mt-4 rounded-lg border border-[#e6edf2] bg-white p-4 text-xs leading-5 text-[#718291]">
      <p className="font-bold text-navy">Limites e fontes</p>
      <ul className="mt-2 list-disc space-y-1 pl-4">{limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
      {sources.length ? <p className="mt-3">Estado das fontes: {sources.map((source) => `${source.provider} (${source.count}${source.stale ? ", desatualizada" : ""}${source.partial ? ", parcial" : ""})`).join(" · ")}.</p> : null}
    </div>
  </section>;
}
