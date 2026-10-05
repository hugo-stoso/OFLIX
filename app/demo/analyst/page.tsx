"use client";

import { ArrowLeft, BarChart3, CircleAlert, Loader2, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";
import { MunicipalityRanking } from "@/components/MunicipalityRanking";
import { MunicipalitySummary } from "@/components/MunicipalitySummary";
import { RegionalEmploymentChart } from "@/components/RegionalEmploymentChart";
import { TerritoryMap } from "@/components/TerritoryMap";
import { ANALYST_PROFILE_ID } from "@/lib/domain";
import type { FormalEmploymentType } from "@/lib/db";
import type { MunicipalityAggregate, TerritoryData, TerritoryGeometry, TerritoryMetric } from "@/lib/territory";
import { TERRITORY_METRICS } from "@/lib/territory";

function aggregateForView(municipalities: MunicipalityAggregate[], category?: string) {
  const categories = municipalities.flatMap((municipality) => municipality.categories).filter((item) => !category || item.category === category);
  const groupedCategories = Array.from(categories.reduce((map, item) => {
    const current = map.get(item.category) ?? { category: item.category, total: 0 };
    current.total += item.total;
    map.set(item.category, current);
    return map;
  }, new Map<string, { category: string; total: number }>()).values()).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
  const formal = categories.filter((item) => item.front === "formal");
  const services = categories.filter((item) => item.front === "service");
  const volunteer = categories.filter((item) => item.front === "volunteer");
  return {
    opportunities: categories.reduce((total, item) => total + item.total, 0),
    formal: formal.reduce((total, item) => total + item.total, 0),
    clt: formal.reduce((total, item) => total + item.clt, 0),
    internship: formal.reduce((total, item) => total + item.internship, 0),
    services: services.reduce((total, item) => total + item.total, 0),
    volunteer: volunteer.reduce((total, item) => total + item.total, 0),
    interactions: categories.reduce((total, item) => total + item.interactions, 0),
    categories: groupedCategories,
  };
}

function FrontDistribution({ values }: { values: ReturnType<typeof aggregateForView> }) {
  const items = [["formal", "Trabalho formal", values.formal], ["service", "Serviços autônomos", values.services], ["volunteer", "Voluntariado", values.volunteer]] as const;
  return <section className="panel p-6 sm:p-8" aria-labelledby="front-distribution-title"><div className="flex items-start justify-between gap-5"><div><p className="eyebrow">Distribuição por frente</p><h2 id="front-distribution-title" className="mt-2 text-xl font-bold text-navy">Como a atividade se divide</h2></div><BarChart3 size={20} className="text-blue" /></div><div className="mt-8 grid gap-6">{items.map(([key, label, total]) => { const width = values.opportunities ? `${Math.round((total / values.opportunities) * 100)}%` : "0%"; return <div key={key}><div className="flex justify-between gap-4 text-sm"><span className="font-bold text-navy">{label}</span><span className="font-bold text-blue">{total}</span></div><div className="mt-2 h-2 rounded-full bg-[#e5edf2]"><div className="h-2 rounded-full bg-blue" style={{ width }} /></div></div>; })}</div></section>;
}

function Legend({ maxValue }: { maxValue: number }) {
  const lowEnd = Math.max(1, Math.ceil(maxValue / 3));
  const mediumEnd = Math.max(lowEnd, Math.ceil((maxValue * 2) / 3));
  return <div className="mt-5" aria-label="Legenda da intensidade do mapa"><p className="eyebrow">Legenda</p><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#637688] sm:grid-cols-4"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm border border-line bg-[#edf3f6]" />Sem registros</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[#c7dce7]" />Baixo · 1–{lowEnd}</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[#76aec5]" />Médio · {lowEnd + 1}–{mediumEnd}</span><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm bg-[#1d5b8f]" />Alto · {mediumEnd + 1}+</span></div><p className="mt-3 text-xs leading-5 text-[#718291]">A intensidade indica apenas maior volume na métrica selecionada dentro desta demonstração.</p></div>;
}

export default function AnalystPage() {
  const [data, setData] = useState<TerritoryData | null>(null);
  const [geometry, setGeometry] = useState<TerritoryGeometry | null>(null);
  const [error, setError] = useState(false);
  const [geometryError, setGeometryError] = useState(false);
  const [access, setAccess] = useState<"checking" | "granted" | "denied">("checking");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<TerritoryMetric>("opportunities");
  const [selectedCategory, setSelectedCategory] = useState("");

  function chooseAnotherProfile() {
    window.localStorage.removeItem("oflix-demo-profile");
    window.dispatchEvent(new Event("oflix-profile-changed"));
    window.location.href = "/demo";
  }

  useEffect(() => {
    const profileId = window.localStorage.getItem("oflix-demo-profile");
    if (profileId !== ANALYST_PROFILE_ID) { setAccess("denied"); return; }
    setAccess("granted");
    Promise.all([
      fetch(`/api/territory?profileId=${encodeURIComponent(profileId)}`).then((response) => { if (!response.ok) throw new Error("territory"); return response.json() as Promise<TerritoryData>; }),
      fetch("/geo/sergipe-municipalities-2024.geojson").then((response) => { if (!response.ok) throw new Error("geometry"); return response.json() as Promise<TerritoryGeometry>; }),
    ]).then(([territory, localGeometry]) => { setData(territory); setGeometry(localGeometry); }).catch((cause: unknown) => { if (cause instanceof Error && cause.message === "geometry") setGeometryError(true); else setError(true); });
  }, []);

  const municipalityOptions = useMemo(() => (geometry?.features.map((feature) => feature.properties.municipality) ?? data?.municipalities.map((municipality) => municipality.municipality) ?? []).sort((a, b) => a.localeCompare(b)), [data, geometry]);
  const categoryOptions = useMemo(() => Array.from(new Set(data?.municipalities.flatMap((municipality) => municipality.categories.map((item) => item.category)) ?? [])).sort((a, b) => a.localeCompare(b)), [data]);
  const selectedAggregate = data?.municipalities.find((municipality) => municipality.municipality === selectedMunicipality);
  const summaryValues = useMemo(() => aggregateForView(selectedMunicipality ? (selectedAggregate ? [selectedAggregate] : []) : data?.municipalities ?? [], selectedCategory || undefined), [data, selectedAggregate, selectedCategory, selectedMunicipality]);
  const visibleTerritorial = useMemo(() => data?.territorial.filter((item) => !selectedMunicipality || item.municipality === selectedMunicipality) ?? [], [data, selectedMunicipality]);
  const visibleEmployment = useMemo(() => data?.employmentByRegion.filter((item) => !selectedMunicipality || item.municipality === selectedMunicipality) ?? [], [data, selectedMunicipality]);
  const mapMax = useMemo(() => Math.max(1, ...(geometry?.features.map((feature) => {
    const aggregate = data?.municipalities.find((municipality) => municipality.ibgeCode === feature.properties.ibgeCode || municipality.municipality === feature.properties.municipality);
    const values = aggregate ? aggregateForView([aggregate], selectedCategory || undefined) : aggregateForView([], selectedCategory || undefined);
    if (selectedMetric === "employment") return values.formal;
    return values[selectedMetric];
  }) ?? [0])), [data, geometry, selectedCategory, selectedMetric]);

  return <main className="min-h-screen">
    <DemoHeader />
    <div className="shell py-10 sm:py-14">
      <button type="button" className="button-quiet -ml-3" onClick={chooseAnotherProfile}><ArrowLeft size={16} /> Trocar perfil</button>
      <div className="mt-9 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-3"><p className="eyebrow">Observatório Territorial OFLIX</p><span className="inline-flex items-center rounded-full border border-line bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[.1em] text-[#718291]">Dados da demonstração</span></div>
        <h1 className="mt-3 max-w-[850px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">Entenda como oportunidades e conexões se distribuem pelo território.</h1>
        <p className="body-copy mt-4 max-w-[780px]">Explore dados agregados da demonstração por município, atividade e tipo de oportunidade, sem identificação individual.</p><Link href="/market?tab=salary" className="button-secondary mt-5">Explorar salários <ArrowLeft className="rotate-180" size={15} /></Link>
      </div>
      {access === "checking" ? <div className="panel mt-8 flex min-h-[280px] items-center justify-center"><Loader2 className="animate-spin text-blue" aria-label="Verificando acesso" /></div> : access === "denied" ? <div className="panel mt-8 flex min-h-[280px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><h2 className="mt-4 text-xl font-bold text-navy">Visão territorial geral restrita</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#607286]">A leitura geral do território está disponível apenas para a conta Observatório Território Aberto (demonstração). Para outros perfis, o OFLIX mostra somente oportunidades relacionadas às atividades de interesse.</p><button type="button" className="button-secondary mt-5" onClick={chooseAnotherProfile}><ArrowLeft size={16} /> Trocar perfil</button></div> : error ? <div className="panel mt-8 flex min-h-[280px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><p className="mt-4 font-bold text-navy">Não foi possível carregar os agregados.</p><button className="button-secondary mt-5" onClick={() => window.location.reload()}><RefreshCw size={16} /> Tentar novamente</button></div> : !data ? <div className="panel mt-8 flex min-h-[280px] items-center justify-center"><Loader2 className="animate-spin text-blue" aria-label="Carregando indicadores" /></div> : <>
        <section className="mt-8" aria-labelledby="panorama-title"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Panorama</p><h2 id="panorama-title" className="mt-2 text-2xl font-black tracking-[-.035em] text-navy">{selectedMunicipality ?? "Sergipe"} na OFLIX</h2></div><span className="text-sm text-[#637688]">Base operacional agregada</span></div><div className="grid gap-3 sm:grid-cols-4"><div className="panel p-5"><p className="eyebrow">Oportunidades</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">{selectedMunicipality ? summaryValues.opportunities : data.totalOpportunities}</p><p className="mt-2 text-sm text-[#687b8b]">registros operacionais</p></div><div className="panel p-5"><p className="eyebrow">Conexões</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">{selectedMunicipality ? summaryValues.interactions : data.interactions}</p><p className="mt-2 text-sm text-[#687b8b]">interações registradas</p></div><div className="panel p-5"><p className="eyebrow">Municípios</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">{selectedMunicipality ? (selectedAggregate ? 1 : 0) : data.activeMunicipalities}</p><p className="mt-2 text-sm text-[#687b8b]">{selectedMunicipality ? "no recorte selecionado" : "com atividade na base"}</p></div><div className="panel p-5"><p className="eyebrow">Áreas</p><p className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">{selectedMunicipality ? summaryValues.categories.length : new Set(data.categories.map((item) => item.category)).size}</p><p className="mt-2 text-sm text-[#687b8b]">categorias presentes</p></div></div></section>
        <section className="mt-8" aria-labelledby="explore-title"><div className="mb-4"><p className="eyebrow">Explorar Sergipe</p><h2 id="explore-title" className="mt-2 text-2xl font-black tracking-[-.035em] text-navy">Comece pelo território</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Escolha uma métrica para comparar os municípios. O mapa usa os limites oficiais e os números vêm da base operacional da demonstração.</p></div><div className="panel p-5 sm:p-6"><div className="grid gap-4 md:grid-cols-[1fr_1fr]"><label className="block text-sm font-bold text-navy">Território<select className="input mt-2 w-full" aria-label="Território" value={selectedMunicipality ?? ""} onChange={(event) => setSelectedMunicipality(event.target.value || null)}><option value="">Sergipe</option>{municipalityOptions.map((municipality) => <option key={municipality} value={municipality}>{municipality}</option>)}</select></label><label className="block text-sm font-bold text-navy">Atividade<select className="input mt-2 w-full" aria-label="Atividade" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}><option value="">Todas as atividades</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div><fieldset className="mt-5"><legend className="text-sm font-bold text-navy">Visualizar no mapa</legend><div className="mt-3 grid gap-2 sm:grid-cols-5">{TERRITORY_METRICS.map((item) => <button key={item.value} type="button" className={`territory-metric-button ${selectedMetric === item.value ? "is-active" : ""}`} aria-pressed={selectedMetric === item.value} onClick={() => setSelectedMetric(item.value)}>{item.shortLabel}</button>)}</div></fieldset></div><div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]"><div className="panel p-4 sm:p-6">{geometry ? <TerritoryMap geometry={geometry} municipalities={data.municipalities} metric={selectedMetric} category={selectedCategory || undefined} selectedMunicipality={selectedMunicipality} onSelect={setSelectedMunicipality} /> : <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-[#f8fbfd] p-6 text-center"><CircleAlert className="text-amber" /><p className="mt-4 font-bold text-navy">A malha local não pôde ser renderizada.</p><p className="mt-2 max-w-md text-sm leading-6 text-[#637688]">O seletor e o ranking continuam disponíveis para explorar os agregados.</p></div>}{geometryError ? <p className="mt-3 text-xs text-amber">A geometria local está indisponível neste momento; os dados continuam acessíveis pelos controles.</p> : null}<Legend maxValue={mapMax} /></div><div className="panel p-6 sm:p-7"><MunicipalityRanking municipalities={data.municipalities} metric={selectedMetric} category={selectedCategory || undefined} selectedMunicipality={selectedMunicipality} onSelect={setSelectedMunicipality} /></div></div></section>
        <section className="mt-8"><MunicipalitySummary municipality={selectedMunicipality} values={summaryValues} category={selectedCategory || undefined} onClear={() => setSelectedMunicipality(null)} /></section>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_.9fr]"><FrontDistribution values={summaryValues} /><section className="panel p-6 sm:p-8"><p className="eyebrow">Por categoria</p><h2 className="mt-2 text-xl font-bold text-navy">Campos de atuação</h2><div className="mt-6 divide-y divide-line">{summaryValues.categories.length ? summaryValues.categories.map((category) => <div key={category.category} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="min-w-0 truncate font-bold text-navy">{category.category}</span><span className="font-bold text-blue">{category.total}</span></div>) : <p className="text-sm text-[#637688]">Sem categorias registradas neste município.</p>}</div></section></div>
        <RegionalEmploymentChart points={visibleEmployment as { municipality: string; district: string; employmentType: FormalEmploymentType; total: number }[]} eyebrow={selectedMunicipality ? `Empregos em ${selectedMunicipality}` : "Empregos no território"} title={selectedMunicipality ? "CLT e estágio neste município" : "Distribuição de vagas CLT e estágio"} description={selectedMunicipality ? "Oportunidades formais abertas no recorte municipal selecionado." : "Quantidade de oportunidades formais abertas por município e região da base da demonstração."} />
        <section className="panel mt-8 p-6 sm:p-8"><div className="flex items-start gap-3"><MapPin size={20} className="mt-1 shrink-0 text-blue" /><div><p className="eyebrow">Detalhes do território</p><h2 className="mt-2 text-xl font-bold text-navy">Município, região e atividade OFLIX</h2><p className="mt-2 text-sm leading-6 text-[#687b8b]">Interações e oportunidades aparecem apenas como contagens agregadas; a tabela não identifica pessoas.</p></div></div><div className="mt-6 overflow-x-auto">{visibleTerritorial.length ? <table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-[.1em] text-[#78909f]"><th className="pb-3 pr-4 font-bold">Município</th><th className="pb-3 pr-4 font-bold">Bairro / região</th><th className="pb-3 pr-4 text-right font-bold">Oportunidades</th><th className="pb-3 text-right font-bold">Interações</th></tr></thead><tbody>{visibleTerritorial.map((item) => <tr key={`${item.municipality}-${item.district}`} className="border-b border-line last:border-0"><td className="py-4 pr-4 font-bold text-navy">{item.municipality}</td><td className="py-4 pr-4 text-[#637688]">{item.district}</td><td className="py-4 pr-4 text-right font-bold text-blue">{item.opportunities}</td><td className="py-4 text-right font-bold text-blue">{item.total}</td></tr>)}</tbody></table> : <p className="rounded-xl border border-dashed border-line px-4 py-5 text-sm text-[#637688]">Nenhum detalhe territorial registrado para este recorte.</p>}</div></section>
        <p className="mt-8 text-center text-xs leading-5 text-[#718291]">A leitura usa apenas dados operacionais OFLIX agregados. Sinais externos, cursos, concursos, vagas externas e contratações públicas não entram nas métricas deste mapa.</p>
      </>}
    </div>
  </main>;
}
