"use client";

import { BarChart3, CircleAlert, Loader2, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { RegionalEmploymentChart } from "@/components/RegionalEmploymentChart";
import type { FormalEmploymentType } from "@/lib/db";

type TerritoryData = {
  activities: string[];
  matchedOpportunityCount: number;
  fronts: { key: string; label: string; total: number }[];
  territorial: { municipality: string; district: string; total: number }[];
  employmentByRegion: { municipality: string; district: string; employmentType: FormalEmploymentType; total: number }[];
};

function readActivities(profileId: string) {
  try { return JSON.parse(window.localStorage.getItem(`oflix-interests-${profileId}`) ?? "[]") as string[]; } catch { return []; }
}

export function PersonalTerritoryPanel({ profileId }: { profileId: string }) {
  const [activities, setActivities] = useState<string[]>([]);
  const [data, setData] = useState<TerritoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const selected = readActivities(profileId);
      setActivities(selected);
      setError(false);
      if (!selected.length) { setData(null); return; }
      setLoading(true);
      try {
        const query = new URLSearchParams({ profileId, activities: selected.join(",") });
        const response = await fetch(`/api/territory?${query.toString()}`);
        if (!response.ok) throw new Error("request");
        const next = await response.json() as TerritoryData;
        if (!cancelled) setData(next);
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    window.addEventListener("oflix-interests-changed", load);
    return () => { cancelled = true; window.removeEventListener("oflix-interests-changed", load); };
  }, [profileId]);

  return <section className="panel mt-8 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><BarChart3 size={18} /></div><div><p className="eyebrow">Seu recorte territorial</p><h2 className="mt-2 text-xl font-bold text-navy">Oportunidades relacionadas aos seus interesses</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Você vê apenas a distribuição territorial das vagas e serviços compatíveis com as atividades que escolheu. Dados gerais do território ficam restritos ao Observatório Território Aberto.</p></div></div>
    {!activities.length ? <p className="mt-5 rounded-lg border border-dashed border-line p-4 text-sm leading-6 text-[#637688]">Selecione uma ou mais atividades acima para gerar seu recorte territorial.</p> : loading ? <div className="flex min-h-[120px] items-center justify-center"><Loader2 className="animate-spin text-blue" aria-label="Carregando seu recorte territorial" /></div> : error ? <div className="mt-5 rounded-lg border border-[#efd4c8] bg-[#fff7f3] p-4 text-sm text-[#8c4d39]"><div className="flex items-center gap-2 font-bold"><CircleAlert size={16} /> Não foi possível carregar seu recorte.</div><button type="button" className="button-quiet mt-3" onClick={() => window.dispatchEvent(new Event("oflix-interests-changed"))}><RefreshCw size={15} /> Tentar novamente</button></div> : <>
      <div className="mt-5 flex flex-wrap gap-2">{activities.map((activity) => <span key={activity} className="rounded-full bg-[#edf6fb] px-3 py-1.5 text-xs font-bold text-blue">{activity}</span>)}</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{data?.fronts.filter((front) => front.key !== "volunteer").map((front) => <div key={front.key} className="rounded-lg border border-line p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-[#738593]">{front.label}</p><p className="mt-2 text-2xl font-black text-navy">{front.total}</p><p className="mt-1 text-xs text-[#687b8b]">oportunidade(s) compatível(is)</p></div>)}</div>
      <div className="mt-6"><p className="eyebrow">Onde estão as oportunidades relacionadas</p><div className="mt-3 divide-y divide-line">{data?.territorial.length ? data.territorial.map((item) => <div key={`${item.municipality}-${item.district}`} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="inline-flex items-center gap-2 font-bold text-navy"><MapPin size={14} className="text-blue" />{item.municipality} · {item.district}</span><span className="font-bold text-blue">{item.total}</span></div>) : <p className="py-3 text-sm text-[#687b8b]">Nenhuma oportunidade compatível encontrada.</p>}</div></div>
      {data && <RegionalEmploymentChart points={data.employmentByRegion} eyebrow="Empregos do seu interesse" title="Distribuição das vagas relacionadas" description="Este gráfico considera somente oportunidades formais compatíveis com as atividades que você selecionou." />}
    </>}
  </section>;
}
