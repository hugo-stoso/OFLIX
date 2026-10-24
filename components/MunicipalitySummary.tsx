"use client";

import { externalSourceLabel } from "@/lib/domain";
import type { TerritoryEmploymentSelection, TerritoryObservedAggregation } from "@/lib/territory-market";

type SummaryValues = TerritoryObservedAggregation;
type OccupationSummary = { label: string; classified: number; total: number; coverageRate: number };

export function MunicipalitySummary({ municipality, values, category, onClear, employment, occupation }: { municipality: string | null; values: SummaryValues; category?: string; onClear: () => void; employment?: TerritoryEmploymentSelection; occupation?: OccupationSummary }) {
  const isState = !municipality;
  const hasRecords = values.opportunities > 0 || values.interactions > 0 || Boolean(employment?.total);
  const cards = [
    ["Oportunidades", values.opportunities],
    [employment ? "Empregos observados" : "Empregos", employment?.total ?? values.employment.total],
    ["Prestação de serviços", values.services],
    ["Voluntariado", values.volunteer],
    ["Interações", values.interactions],
  ] as const;
  return <section className="panel p-6 sm:p-8" aria-labelledby="municipality-summary-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow">{isState ? "Recorte atual" : "Município selecionado"}</p>
        <h2 id="municipality-summary-title" className="mt-2 text-2xl font-black tracking-[-.035em] text-navy">{municipality ?? "Sergipe"}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#637688]">{isState ? "Visão agregada das oportunidades operacionais e conexões registradas na base da demonstração." : "Este recorte atualiza os indicadores e leituras abaixo sem expor pessoas ou identificadores individuais."}</p>
      </div>
      {!isState ? <button type="button" className="button-secondary" onClick={onClear}>Voltar para Sergipe</button> : <span className="inline-flex items-center rounded-full bg-[#edf6fb] px-3 py-2 text-xs font-bold text-blue">Dados da demonstração</span>}
    </div>
    {!hasRecords && !isState ? <div className="mt-6 rounded-xl border border-dashed border-line bg-[#f8fbfd] p-5"><p className="font-bold text-navy">Este município ainda não possui registros na base desta demonstração.</p><p className="mt-2 text-sm leading-6 text-[#637688]">Isso não significa ausência de oportunidades reais no território.</p></div> : <>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-[#f8fbfd] p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#738593]">{label}</p><p className="mt-2 text-2xl font-black tracking-[-.04em] text-navy">{value}</p></div>)}</div>
      <div className="mt-7 grid gap-6 sm:grid-cols-[.8fr_1.2fr]">
        <div>{employment ? <><p className="eyebrow">Mercado de empregos observado</p><h3 className="mt-2 font-bold text-navy">{employment.origin === "oflix" ? "Publicadas na OFLIX" : employment.origin === "external" ? employment.source ? externalSourceLabel(employment.source) : "Vagas externas" : employment.source ? externalSourceLabel(employment.source) : "Todas as vagas"}</h3>{occupation ? <p className="mt-2 text-sm font-semibold text-blue">Área ocupacional: {occupation.label}</p> : null}<div className="mt-4 flex flex-wrap gap-3 text-sm text-[#637688]"><span><strong className="text-navy">{employment.oflix}</strong> OFLIX</span><span><strong className="text-navy">{employment.external}</strong> externas</span>{employment.source ? <span><strong className="text-navy">{employment.sourceCounts[employment.source]}</strong> {externalSourceLabel(employment.source)}</span> : null}</div>{occupation && occupation.total > 0 && occupation.classified < occupation.total ? <p className="mt-3 text-xs leading-5 text-[#718291]">Cobertura ocupacional: {occupation.classified} de {occupation.total} publicações de vagas classificadas ({Math.round(occupation.coverageRate * 100)}%). Isso não representa a acurácia da classificação.</p> : null}</> : <><p className="eyebrow">Empregos observados</p><h3 className="mt-2 font-bold text-navy">Mercado integrado</h3><p className="mt-4 text-sm text-[#637688]">A camada de empregos observados ainda não está disponível.</p></>}</div>
        <div><p className="eyebrow">Categorias OFLIX</p><h3 className="mt-2 font-bold text-navy">Serviços e voluntariado neste recorte</h3>{values.categories.length ? <div className="mt-3 flex flex-wrap gap-2">{values.categories.slice(0, 8).map((item) => <span key={`${item.front}-${item.category}`} className="filter-chip">{item.category} · {item.total}</span>)}</div> : <p className="mt-3 text-sm text-[#637688]">Sem categorias OFLIX de serviços ou voluntariado.</p>}{category ? <p className="mt-3 text-xs text-[#718291]">Filtro de atividade OFLIX: <strong>{category}</strong></p> : null}</div>
      </div>
    </>}
  </section>;
}
