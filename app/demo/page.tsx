"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CircleAlert, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";
import { InterestSelector } from "@/components/InterestSelector";
import { OpportunityComposer } from "@/components/OpportunityComposer";
import { OpportunityFilters } from "@/components/OpportunityFilters";
import { OpportunityRow } from "@/components/OpportunityRow";
import { PersonalTerritoryPanel } from "@/components/PersonalTerritoryPanel";
import { ProfilePicker } from "@/components/ProfilePicker";
import { TalentBasePanel } from "@/components/TalentBasePanel";
import type { OpportunityKind } from "@/lib/domain";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; summary: string; capabilities: string; location: { municipality: string; district: string } };
type Opportunity = { id: string; title: string; description: string; category: string; kind: OpportunityKind; location: { municipality: string; district: string }; owner: { id: string; name: string }; ownerType: Profile["type"]; employmentType?: "CLT" | "INTERNSHIP"; eventDate?: string; requiredActivities?: string[] };
type Talent = { id: string; profileId: string; name: string; summary: string; capabilities: string; opportunityId: string; opportunityTitle: string; category: string; ownerId: string; action: string };
type PublicationMode = "offers" | "demands";

const tabs: { key: OpportunityKind; label: string }[] = [
  { key: "formal", label: "Trabalho formal" },
  { key: "service", label: "Serviços autônomos" },
  { key: "volunteer", label: "Voluntariado" },
];

function favoriteIds() {
  try { return JSON.parse(window.localStorage.getItem("oflix-favorite-opportunities") ?? "[]") as string[]; } catch { return []; }
}

export default function DemoPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Record<OpportunityKind, Opportunity[]>>({ formal: [], service: [], volunteer: [] });
  const [talents, setTalents] = useState<Talent[]>([]);
  const [activeTab, setActiveTab] = useState<OpportunityKind>("formal");
  const [publicationMode, setPublicationMode] = useState<PublicationMode>("offers");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [employmentType, setEmploymentType] = useState("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteVersion, setFavoriteVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? null, [profiles, selectedId]);

  useEffect(() => {
    const stored = window.localStorage.getItem("oflix-demo-profile");
    if (stored) setSelectedId(stored);
    const onFavoritesChanged = () => setFavoriteVersion((version) => version + 1);
    window.addEventListener("oflix-favorites-changed", onFavoritesChanged);
    Promise.all([fetch("/api/profiles"), fetch("/api/opportunities")])
      .then(async ([profileResponse, opportunityResponse]) => {
        if (!profileResponse.ok || !opportunityResponse.ok) throw new Error("request");
        const [profileData, opportunityData] = await Promise.all([profileResponse.json(), opportunityResponse.json()]);
        setProfiles(profileData);
        setOpportunities({ formal: opportunityData.formal, service: opportunityData.services, volunteer: opportunityData.volunteer });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    return () => window.removeEventListener("oflix-favorites-changed", onFavoritesChanged);
  }, []);

  useEffect(() => {
    if (selectedProfile?.type !== "ORGANIZATION") { setTalents([]); return; }
    fetch(`/api/talents?profileId=${encodeURIComponent(selectedProfile.id)}`)
      .then(async (response) => { if (!response.ok) throw new Error("request"); return response.json(); })
      .then(setTalents)
      .catch(() => setTalents([]));
  }, [selectedProfile]);

  const modeOpportunities = useMemo(() => opportunities[activeTab].filter((opportunity) => publicationMode === "offers" ? opportunity.ownerType !== "PERSON" : opportunity.ownerType === "PERSON"), [activeTab, opportunities, publicationMode]);
  const publicationTabs = publicationMode === "offers" ? tabs : [{ key: "service" as OpportunityKind, label: "Força de trabalho autônoma" }];
  const categories = useMemo(() => Array.from(new Set(modeOpportunities.flatMap((opportunity) => activeTab === "service" && opportunity.requiredActivities?.length ? opportunity.requiredActivities : [opportunity.category]))).sort(), [activeTab, modeOpportunities]);
  const municipalities = useMemo(() => Array.from(new Set(modeOpportunities.map((opportunity) => opportunity.location.municipality))).sort(), [modeOpportunities]);
  const visible = useMemo(() => {
    void favoriteVersion;
    const term = search.trim().toLowerCase();
    const favorites = favoriteIds();
    return modeOpportunities.filter((opportunity) => {
      const opportunityActivities = opportunity.requiredActivities?.length ? opportunity.requiredActivities : [opportunity.category];
      const matchesTerm = !term || `${opportunity.title} ${opportunity.description} ${opportunity.category} ${opportunityActivities.join(" ")}`.toLowerCase().includes(term);
      const matchesCategory = !category || opportunityActivities.includes(category);
      const matchesMunicipality = !municipality || opportunity.location.municipality === municipality;
      const matchesEmployment = activeTab !== "formal" || employmentType === "ALL" || opportunity.employmentType === employmentType;
      const matchesFavorite = !favoritesOnly || favorites.includes(opportunity.id);
      return matchesTerm && matchesCategory && matchesMunicipality && matchesEmployment && matchesFavorite;
    });
  }, [activeTab, category, employmentType, favoriteVersion, favoritesOnly, modeOpportunities, municipality, search]);
  const allOpportunities = useMemo(() => Object.values(opportunities).flat(), [opportunities]);
  const ownedOpportunities = useMemo(() => selectedProfile ? allOpportunities.filter((opportunity) => opportunity.owner.id === selectedProfile.id) : [], [allOpportunities, selectedProfile]);

  function chooseProfile(id: string) {
    setSelectedId(id);
    window.localStorage.setItem("oflix-demo-profile", id);
    window.dispatchEvent(new Event("oflix-profile-changed"));
    const profile = profiles.find((candidate) => candidate.id === id);
    if (profile?.type === "INSTITUTIONAL_ANALYST") window.location.href = "/demo/analyst";
  }
  function resetFilters() { setSearch(""); setCategory(""); setMunicipality(""); setEmploymentType("ALL"); setFavoritesOnly(false); }
  function addCreatedOpportunity(opportunity: Opportunity) { setOpportunities((current) => ({ ...current, [opportunity.kind]: [opportunity, ...current[opportunity.kind]] })); setPublicationMode(opportunity.ownerType === "PERSON" ? "demands" : "offers"); setActiveTab(opportunity.kind); }

  return <main className="min-h-screen">
    <DemoHeader />
    <div className="shell py-10 sm:py-14">
      {loading ? <div className="panel flex min-h-[360px] items-center justify-center"><Loader2 className="animate-spin text-blue" size={24} aria-label="Carregando" /></div> : error ? <div className="panel flex min-h-[360px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><h1 className="mt-4 text-xl font-bold text-navy">A demonstração não carregou</h1><p className="mt-2 text-sm text-[#607286]">Verifique se o banco foi preparado e tente novamente.</p><button className="button-secondary mt-5" onClick={() => window.location.reload()}><RefreshCw size={16} /> Tentar novamente</button></div> : !selectedProfile ? <section className="mx-auto max-w-[820px]"><p className="eyebrow">Perfil de demonstração</p><h1 className="mt-4 max-w-[690px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">Escolha uma perspectiva para entrar.</h1><p className="body-copy mt-5 max-w-[650px]">Esta seleção muda a experiência apresentada durante a navegação. São personas fictícias: não é autenticação de produção.</p><ProfilePicker profiles={profiles} onSelected={chooseProfile} /></section> : <section>
        <div className="flex flex-col justify-between gap-7 border-b border-line pb-8 lg:flex-row lg:items-end"><div><p className="eyebrow">Explorar oportunidades</p><h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-navy sm:text-5xl">O que está se movendo perto de você.</h1><p className="body-copy mt-4 max-w-[720px]">Encontre uma oportunidade, apresente seu trabalho ou participe de uma ação. Os caminhos de candidatos e de quem publica estão separados para cada pessoa seguir o próximo passo certo.</p></div><div className="flex flex-col items-start gap-2 text-sm text-[#607286] lg:items-end"><span className="font-bold text-navy">{selectedProfile.name}</span><button className="subtle-link" onClick={() => { window.localStorage.removeItem("oflix-demo-profile"); setSelectedId(null); window.dispatchEvent(new Event("oflix-profile-changed")); }}>Trocar perfil</button></div></div>
        <section className="panel mt-8 p-5 sm:p-6" aria-label="Separar publicações de trabalho"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="eyebrow">Caminhos separados</p><h2 className="mt-2 text-xl font-bold text-navy">Encontre quem publica e quem trabalha</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Ofertas reúnem publicações de empresas e instituições. Demandas mostram autônomos e informais divulgando suas competências e disponibilidade.</p></div><div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-[520px]" role="tablist" aria-label="Tipo de publicação"><button type="button" role="tab" aria-selected={publicationMode === "offers"} onClick={() => { setPublicationMode("offers"); setActiveTab("formal"); resetFilters(); }} className={`rounded-lg border px-4 py-3 text-left text-sm font-bold transition ${publicationMode === "offers" ? "border-navy bg-navy text-white" : "border-line bg-white text-[#637688] hover:border-blue"}`}>Ofertas de trabalho<span className={`mt-1 block text-xs font-normal ${publicationMode === "offers" ? "text-[#d9e8f0]" : "text-[#82929f]"}`}>Empresas e instituições</span></button><button type="button" role="tab" aria-selected={publicationMode === "demands"} onClick={() => { setPublicationMode("demands"); setActiveTab("service"); resetFilters(); }} className={`rounded-lg border px-4 py-3 text-left text-sm font-bold transition ${publicationMode === "demands" ? "border-navy bg-navy text-white" : "border-line bg-white text-[#637688] hover:border-blue"}`}>Demandas de trabalho<span className={`mt-1 block text-xs font-normal ${publicationMode === "demands" ? "text-[#d9e8f0]" : "text-[#82929f]"}`}>Autônomos e informais</span></button></div></div></section>
        {selectedProfile.type === "PERSON" && <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><OpportunityComposer key={selectedProfile.id} profile={selectedProfile} onCreated={addCreatedOpportunity} /><section className="panel p-5 sm:p-6"><p className="eyebrow">Gestão da sua divulgação</p><h2 className="mt-2 text-xl font-bold text-navy">Minhas divulgações</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Apresente sua força de trabalho sem misturá-la às oportunidades publicadas por empresas e instituições.</p><div className="mt-5 divide-y divide-line">{ownedOpportunities.length ? ownedOpportunities.map((opportunity) => <div key={opportunity.id} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0"><strong className="block truncate text-sm text-navy">{opportunity.title}</strong><span className="text-xs text-[#718291]">{opportunity.requiredActivities?.length ? opportunity.requiredActivities.join(" · ") : opportunity.category}</span></span><span className="shrink-0 rounded-full bg-[#edf6fb] px-2 py-1 text-xs font-bold text-blue">Publicada</span></div>) : <p className="py-4 text-sm text-[#637688]">Você ainda não divulgou uma atividade.</p>}</div></section></div>}
        {selectedProfile.type === "PERSON" && <InterestSelector profile={selectedProfile} matches={[...opportunities.formal, ...opportunities.service].map((opportunity) => ({ title: opportunity.title, category: opportunity.category, requiredActivities: opportunity.requiredActivities }))} />}
        {selectedProfile.type === "PERSON" && <PersonalTerritoryPanel profileId={selectedProfile.id} />}
        {selectedProfile.type === "ORGANIZATION" && <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><OpportunityComposer key={selectedProfile.id} profile={selectedProfile} onCreated={addCreatedOpportunity} /><section className="panel p-5 sm:p-6"><p className="eyebrow">Gestão da oferta</p><h2 className="mt-2 text-xl font-bold text-navy">Minhas oportunidades</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Acompanhe o que sua organização publicou e diferencie vagas ofertadas de pessoas candidatas.</p><div className="mt-5 divide-y divide-line">{ownedOpportunities.length ? ownedOpportunities.map((opportunity) => <div key={opportunity.id} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0"><strong className="block truncate text-sm text-navy">{opportunity.title}</strong><span className="text-xs text-[#718291]">{opportunity.kind === "formal" ? opportunity.employmentType === "INTERNSHIP" ? "Estágio" : "CLT" : opportunity.requiredActivities?.length ? opportunity.requiredActivities.join(" · ") : opportunity.category}</span></span><span className="shrink-0 rounded-full bg-[#edf6fb] px-2 py-1 text-xs font-bold text-blue">Publicada</span></div>) : <p className="py-4 text-sm text-[#637688]">Você ainda não publicou uma oportunidade.</p>}</div></section></div>}
        {selectedProfile.type === "ORGANIZATION" && <div className="mt-8"><TalentBasePanel ownerId={selectedProfile.id} talents={talents} /></div>}
        <nav className="mt-10 flex max-w-full gap-1 overflow-x-auto border-b border-line" aria-label="Frentes da plataforma">{publicationTabs.map((tab) => <button key={tab.key} onClick={() => { setActiveTab(tab.key); setCategory(""); setMunicipality(""); setEmploymentType("ALL"); }} className={`whitespace-nowrap border-b-2 px-4 pb-3 text-sm font-bold transition first:pl-0 ${activeTab === tab.key ? "border-blue text-blue" : "border-transparent text-[#718291] hover:text-navy"}`}>{tab.label}<span className="ml-2 text-xs font-normal text-[#8a9aa7]">{opportunities[tab.key].filter((opportunity) => publicationMode === "offers" ? opportunity.ownerType !== "PERSON" : opportunity.ownerType === "PERSON").length}</span></button>)}</nav>
        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]"><div><OpportunityFilters search={search} category={category} municipality={municipality} employmentType={employmentType} favoritesOnly={favoritesOnly} categories={categories} municipalities={municipalities} isFormal={activeTab === "formal"} onSearch={setSearch} onCategory={setCategory} onMunicipality={setMunicipality} onEmploymentType={setEmploymentType} onFavoritesOnly={setFavoritesOnly} onClear={resetFilters} /><div className="panel px-5 sm:px-8">{visible.length ? visible.map((opportunity) => <OpportunityRow key={opportunity.id} opportunity={opportunity} kind={activeTab} />) : <div className="py-16 text-center"><p className="font-bold text-navy">Nenhuma publicação corresponde aos filtros.</p><p className="mt-2 text-sm text-[#607286]">{publicationMode === "offers" ? "Tente outra categoria, município ou mude para Demandas de trabalho." : "Ainda não há uma divulgação compatível. Tente Ofertas de trabalho ou publique sua força de trabalho."}</p></div>}</div></div><aside className="h-fit border-l-2 border-[#c9dce8] pl-5 lg:mt-2"><p className="eyebrow">Como ler esta tela</p><p className="mt-3 text-sm leading-6 text-[#607286]">{publicationMode === "offers" ? "Aqui estão as publicações de empresas e instituições: vagas formais, serviços demandados e ações de voluntariado." : "Aqui estão profissionais autônomos e informais que divulgaram suas competências e disponibilidade."} Favoritos e preferências são salvos apenas neste navegador demo.</p>{selectedProfile.type === "INSTITUTIONAL_ANALYST" ? <Link href="/demo/analyst" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue hover:underline"><BarChart3 size={16} /> Ver visão territorial geral <ArrowRight size={15} /></Link> : <p className="mt-5 text-sm font-semibold leading-6 text-[#637688]">A visão territorial geral é exclusiva do Observatório. Este perfil vê apenas o recorte das atividades de interesse.</p>}</aside></div>
      </section>}
    </div>
  </main>;
}
