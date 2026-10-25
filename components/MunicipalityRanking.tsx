"use client";

import type { MunicipalityAggregate, TerritoryMetric } from "@/lib/territory";
import { territoryMetricLabel } from "@/lib/territory";
import type { TerritoryEmploymentMarket, TerritoryEmploymentOrigin } from "@/lib/territory-market";
import type { TerritoryObservedAggregation } from "@/lib/territory-market";
import { aggregateObservedTerritory } from "@/lib/territory-market";
import type { OccupationFamily } from "@/lib/occupations";

export function MunicipalityRanking({ municipalities, metric, category, selectedMunicipality, onSelect, employmentMarket, employmentOrigin, employmentSource, occupationFamily, occupationKey, observed }: { municipalities: MunicipalityAggregate[]; metric: TerritoryMetric; category?: string; selectedMunicipality: string | null; onSelect: (municipality: string) => void; employmentMarket?: TerritoryEmploymentMarket; employmentOrigin?: TerritoryEmploymentOrigin; employmentSource?: string; occupationFamily?: OccupationFamily; occupationKey?: string; observed?: TerritoryObservedAggregation }) {
  const observedAggregation = observed ?? aggregateObservedTerritory(municipalities, employmentMarket, { category, employmentOrigin, externalSource: employmentSource, occupationFamily, occupationKey });
  const observedRanking = observedAggregation.municipalities.map((municipality) => ({ municipality: { municipality: municipality.municipality } as MunicipalityAggregate, value: metric === "employment" ? municipality.employment : municipality[metric] }));
  const sortedRanking = observedRanking.sort((a, b) => b.value - a.value || a.municipality.municipality.localeCompare(b.municipality.municipality, "pt-BR")).slice(0, 6);
  return <section aria-labelledby="municipality-ranking-title">
    <p className="eyebrow">Leitura comparativa</p>
    <h2 id="municipality-ranking-title" className="mt-2 text-xl font-bold text-navy">Municípios com maior atividade observada</h2>
    <p className="mt-2 text-sm leading-6 text-[#637688]">Volume registrado no mesmo recorte do mapa e do resumo por {territoryMetricLabel(metric).toLowerCase()}; não é um ranking econômico do estado.</p>
    <div className="mt-5 space-y-2">
      {sortedRanking.map(({ municipality, value }, index) => <button key={municipality.municipality} type="button" className={`municipality-ranking-item ${selectedMunicipality === municipality.municipality ? "is-selected" : ""}`} onClick={() => onSelect(municipality.municipality)} aria-pressed={selectedMunicipality === municipality.municipality}>
        <span className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf6fb] text-xs font-black text-blue">{index + 1}</span><span className="truncate text-left font-bold text-navy">{municipality.municipality}</span></span>
        <span className="shrink-0 text-right"><strong className="block text-blue">{value}</strong><small className="text-[10px] uppercase tracking-[.08em] text-[#8393a0]">{territoryMetricLabel(metric)}</small></span>
      </button>)}
      {!sortedRanking.length || sortedRanking.every((item) => item.value === 0) ? <p className="rounded-xl border border-dashed border-line px-4 py-4 text-sm text-[#637688]">Nenhum município possui registros para esta combinação de métrica e atividade.</p> : null}
    </div>
  </section>;
}
