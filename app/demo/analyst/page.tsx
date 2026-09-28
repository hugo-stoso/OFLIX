"use client";

import { ArrowLeft, BarChart3, CircleAlert, Loader2, MapPin, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";
import { RegionalEmploymentChart } from "@/components/RegionalEmploymentChart";
import { ANALYST_PROFILE_ID } from "@/lib/domain";
import type { FormalEmploymentType } from "@/lib/db";

type TerritoryData = {
  scope: "general";
  fronts: { key: string; label: string; total: number }[];
  totalOpportunities: number;
  interactions: number;
  territorial: { municipality: string; district: string; total: number }[];
  categories: { front: string; category: string; total: number }[];
  employmentByRegion: { municipality: string; district: string; employmentType: FormalEmploymentType; total: number }[];
};

const frontLabels: Record<string, string> = { formal: "Trabalho formal", service: "Serviços autônomos", volunteer: "Voluntariado" };

export default function AnalystPage() {
  const [data, setData] = useState<TerritoryData | null>(null);
  const [error, setError] = useState(false);
  const [access, setAccess] = useState<"checking" | "granted" | "denied">("checking");
  function chooseAnotherProfile() {
    window.localStorage.removeItem("oflix-demo-profile");
    window.dispatchEvent(new Event("oflix-profile-changed"));
    window.location.href = "/demo";
  }

  useEffect(() => {
    const profileId = window.localStorage.getItem("oflix-demo-profile");
    if (profileId !== ANALYST_PROFILE_ID) { setAccess("denied"); return; }
    setAccess("granted");
    fetch(`/api/territory?profileId=${encodeURIComponent(profileId)}`).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(setData).catch(() => setError(true));
  }, []);
  return (
    <main className="min-h-screen">
      <DemoHeader />
      <div className="shell py-10 sm:py-14">
        <button type="button" className="button-quiet -ml-3" onClick={chooseAnotherProfile}><ArrowLeft size={16} /> Trocar perfil</button>
        <div className="mt-9 border-b border-line pb-8">
          <p className="eyebrow">Inteligência territorial · primeira leitura</p>
          <h1 className="mt-3 max-w-[760px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">O que as conexões começam a revelar.</h1>
          <p className="body-copy mt-4 max-w-[700px]">Visão agregada e anonimizada calculada a partir das mesmas oportunidades e interações que aparecem na demonstração.</p>
        </div>
        {access === "checking" ? <div className="panel mt-8 flex min-h-[280px] items-center justify-center"><Loader2 className="animate-spin text-blue" aria-label="Verificando acesso" /></div> : access === "denied" ? <div className="panel mt-8 flex min-h-[280px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><h2 className="mt-4 text-xl font-bold text-navy">Visão territorial geral restrita</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#607286]">A leitura geral do território está disponível apenas para a conta Observatório Território Aberto (demonstração). Para outros perfis, o OFLIX mostra somente oportunidades relacionadas às atividades de interesse.</p><button type="button" className="button-secondary mt-5" onClick={chooseAnotherProfile}><ArrowLeft size={16} /> Trocar perfil</button></div> : error ? <div className="panel mt-8 flex min-h-[280px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><p className="mt-4 font-bold text-navy">Não foi possível carregar os agregados.</p><button className="button-secondary mt-5" onClick={() => window.location.reload()}><RefreshCw size={16} /> Tentar novamente</button></div> : !data ? <div className="panel mt-8 flex min-h-[280px] items-center justify-center"><Loader2 className="animate-spin text-blue" aria-label="Carregando indicadores" /></div> : <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="panel p-5"><p className="eyebrow">Oportunidades</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">{data.totalOpportunities}</p><p className="mt-2 text-sm text-[#687b8b]">registros na base demo</p></div>
            <div className="panel p-5"><p className="eyebrow">Interações</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">{data.interactions}</p><p className="mt-2 text-sm text-[#687b8b]">conexões registradas</p></div>
            <div className="panel p-5"><p className="eyebrow">Territórios</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">{new Set(data.territorial.map((item) => item.municipality)).size}</p><p className="mt-2 text-sm text-[#687b8b]">municípios com oferta</p></div>
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
            <section className="panel p-6 sm:p-8"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Distribuição por frente</p><h2 className="mt-2 text-xl font-bold text-navy">Onde está a oferta</h2></div><BarChart3 size={20} className="text-blue" /></div><div className="mt-8 grid gap-6">{data.fronts.map((front) => { const width = data.totalOpportunities ? `${Math.round((front.total / data.totalOpportunities) * 100)}%` : "0%"; return <div key={front.key}><div className="flex justify-between gap-4 text-sm"><span className="font-bold text-navy">{front.label}</span><span className="font-bold text-blue">{front.total}</span></div><div className="mt-2 h-2 rounded-full bg-[#e5edf2]"><div className="h-2 rounded-full bg-blue" style={{ width }} /></div></div>; })}</div></section>
            <section className="panel p-6 sm:p-8"><p className="eyebrow">Por categoria</p><h2 className="mt-2 text-xl font-bold text-navy">Campos de atuação</h2><div className="mt-6 divide-y divide-line">{data.categories.map((category) => <div key={`${category.front}-${category.category}`} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0"><span className="block truncate font-bold text-navy">{category.category}</span><span className="text-xs text-[#738593]">{frontLabels[category.front]}</span></span><span className="font-bold text-blue">{category.total}</span></div>)}</div></section>
          </div>
          <RegionalEmploymentChart points={data.employmentByRegion} />
          <section className="panel mt-8 p-6 sm:p-8"><p className="eyebrow">Distribuição territorial</p><h2 className="mt-2 text-xl font-bold text-navy">Onde as interações aconteceram</h2><p className="mt-2 text-sm leading-6 text-[#687b8b]">A leitura abaixo não identifica pessoas: relaciona apenas município, região e volume agregado.</p><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-[.1em] text-[#78909f]"><th className="pb-3 pr-4 font-bold">Município</th><th className="pb-3 pr-4 font-bold">Bairro / região</th><th className="pb-3 text-right font-bold">Interações</th></tr></thead><tbody>{data.territorial.map((item) => <tr key={`${item.municipality}-${item.district}`} className="border-b border-line last:border-0"><td className="py-4 pr-4 font-bold text-navy"><span className="inline-flex items-center gap-2"><MapPin size={14} className="text-blue" />{item.municipality}</span></td><td className="py-4 pr-4 text-[#637688]">{item.district}</td><td className="py-4 text-right font-bold text-blue">{item.total}</td></tr>)}</tbody></table></div></section>
        </>}
      </div>
    </main>
  );
}
