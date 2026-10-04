"use client";

import type { MunicipalityAggregate, TerritoryMetric } from "@/lib/territory";
import { territoryMetricLabel } from "@/lib/territory";

export function MunicipalityRanking({ municipalities, metric, category, selectedMunicipality, onSelect }: { municipalities: MunicipalityAggregate[]; metric: TerritoryMetric; category?: string; selectedMunicipality: string | null; onSelect: (municipality: string) => void }) {
  const valueFor = (municipality: MunicipalityAggregate) => {
    const categories = category ? municipality.categories.filter((item) => item.category === category) : municipality.categories;
    if (metric === "employment") return categories.filter((item) => item.front === "formal").reduce((total, item) => total + item.total, 0);
    if (metric === "services") return categories.filter((item) => item.front === "service").reduce((total, item) => total + item.total, 0);
    if (metric === "volunteer") return categories.filter((item) => item.front === "volunteer").reduce((total, item) => total + item.total, 0);
    if (metric === "interactions") return categories.reduce((total, item) => total + item.interactions, 0);
    return categories.reduce((total, item) => total + item.total, 0);
  };
  const ranking = municipalities.map((municipality) => ({ municipality, value: valueFor(municipality) })).sort((a, b) => b.value - a.value || a.municipality.municipality.localeCompare(b.municipality.municipality)).slice(0, 6);
  return <section aria-labelledby="municipality-ranking-title">
    <p className="eyebrow">Leitura comparativa</p>
    <h2 id="municipality-ranking-title" className="mt-2 text-xl font-bold text-navy">Municípios com maior atividade na OFLIX</h2>
    <p className="mt-2 text-sm leading-6 text-[#637688]">Volume registrado na base da demonstração por {territoryMetricLabel(metric).toLowerCase()}; não é um ranking econômico do estado.</p>
    <div className="mt-5 space-y-2">
      {ranking.map(({ municipality, value }, index) => <button key={municipality.municipality} type="button" className={`municipality-ranking-item ${selectedMunicipality === municipality.municipality ? "is-selected" : ""}`} onClick={() => onSelect(municipality.municipality)} aria-pressed={selectedMunicipality === municipality.municipality}>
        <span className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf6fb] text-xs font-black text-blue">{index + 1}</span><span className="truncate text-left font-bold text-navy">{municipality.municipality}</span></span>
        <span className="shrink-0 text-right"><strong className="block text-blue">{value}</strong><small className="text-[10px] uppercase tracking-[.08em] text-[#8393a0]">{territoryMetricLabel(metric)}</small></span>
      </button>)}
      {!ranking.length || ranking.every((item) => item.value === 0) ? <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-[#637688]">Nenhum município possui registros para esta combinação de métrica e atividade.</p> : null}
    </div>
  </section>;
}
