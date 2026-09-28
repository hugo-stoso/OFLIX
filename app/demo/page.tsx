"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CircleAlert, Loader2, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";
import { DemoNavigation, type DemoView } from "@/components/DemoNavigation";
import { InterestSelector } from "@/components/InterestSelector";
import { OpportunityComposer } from "@/components/OpportunityComposer";
import { OpportunityFilters } from "@/components/OpportunityFilters";
import { OpportunityRow } from "@/components/OpportunityRow";
import { PersonalTerritoryPanel } from "@/components/PersonalTerritoryPanel";
import { ProfilePicker } from "@/components/ProfilePicker";
import { ServiceCallComposer } from "@/components/ServiceCallComposer";
import { ServiceCallPanel } from "@/components/ServiceCallPanel";
import { TalentBasePanel } from "@/components/TalentBasePanel";
import type { OpportunityKind } from "@/lib/domain";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; summary: string; capabilities: string; location: { state: string; municipality: string; district: string } };
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

function displayType(type: Profile["type"]) {
  return type === "PERSON" ? "Pessoa" : type === "ORGANIZATION" ? "Organização" : "Analista institucional";
}

export default function DemoPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Record<OpportunityKind, Opportunity[]>>({ formal: [], service: [], volunteer: [] });
  const [talents, setTalents] = useState<Talent[]>([]);
  const [activeTab, setActiveTab] = useState<OpportunityKind>("formal");
  const [publicationMode, setPublicationMode] = useState<PublicationMode>("demands");
  const [activeView, setActiveView] = useState<DemoView>("home");
  const [personComposerOpen, setPersonComposerOpen] = useState(false);
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

  const modeOpportunities = useMemo(() => opportunities[activeTab].filter((opportunity) => {
    if (publicationMode === "offers") return opportunity.ownerType === "PERSON";
    if (selectedProfile?.type === "ORGANIZATION") return opportunity.ownerType !== "PERSON" && opportunity.owner.id === selectedProfile.id;
    return opportunity.ownerType !== "PERSON";
  }), [activeTab, opportunities, publicationMode, selectedProfile]);
  const categories = useMemo(() => Array.from(new Set(modeOpportunities.flatMap((opportunity) => activeTab === "service" && opportunity.requiredActivities?.length ? opportunity.requiredActivities : [opportunity.category]))).sort(), [activeTab, modeOpportunities]);
  const municipalities = useMemo(() => Array.from(new Set(modeOpportunities.map((opportunity) => opportunity.location.municipality))).sort(), [modeOpportunities]);
  const visible = useMemo(() => {
    void favoriteVersion;
    const term = search.trim().toLowerCase();
    const favorites = favoriteIds();
    return modeOpportunities.filter((opportunity) => {
      const activities = opportunity.requiredActivities?.length ? opportunity.requiredActivities : [opportunity.category];
      const matchesTerm = !term || `${opportunity.title} ${opportunity.description} ${opportunity.category} ${activities.join(" ")}`.toLowerCase().includes(term);
      const matchesCategory = !category || activities.includes(category);
      const matchesMunicipality = !municipality || opportunity.location.municipality === municipality;
      const matchesEmployment = activeTab !== "formal" || employmentType === "ALL" || opportunity.employmentType === employmentType;
      const matchesFavorite = !favoritesOnly || favorites.includes(opportunity.id);
      return matchesTerm && matchesCategory && matchesMunicipality && matchesEmployment && matchesFavorite;
    });
  }, [activeTab, category, employmentType, favoriteVersion, favoritesOnly, modeOpportunities, municipality, search]);
  const allOpportunities = useMemo(() => Object.values(opportunities).flat(), [opportunities]);
  const ownedOpportunities = useMemo(() => selectedProfile ? allOpportunities.filter((opportunity) => opportunity.owner.id === selectedProfile.id) : [], [allOpportunities, selectedProfile]);
  const homeMatches = useMemo(() => allOpportunities.filter((opportunity) => opportunity.ownerType !== "PERSON").slice(0, 3), [allOpportunities]);

  function chooseProfile(id: string) {
    setSelectedId(id);
    setActiveView("home");
    window.localStorage.setItem("oflix-demo-profile", id);
    window.dispatchEvent(new Event("oflix-profile-changed"));
    const profile = profiles.find((candidate) => candidate.id === id);
    if (profile?.type === "INSTITUTIONAL_ANALYST") window.location.href = "/demo/analyst";
  }

  function resetFilters() {
    setSearch(""); setCategory(""); setMunicipality(""); setEmploymentType("ALL"); setFavoritesOnly(false);
  }

  function goTo(view: DemoView) {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openPersonComposer() {
    setPersonComposerOpen(true);
    window.setTimeout(() => document.getElementById("person-offer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function addCreatedOpportunity(opportunity: Opportunity) {
    setOpportunities((current) => ({ ...current, [opportunity.kind]: [opportunity, ...current[opportunity.kind]] }));
    setPublicationMode(opportunity.ownerType === "PERSON" ? "offers" : "demands");
    setActiveTab(opportunity.kind);
  }

  if (loading) return <main className="min-h-screen"><DemoHeader /><div className="shell py-10"><div className="panel flex min-h-[360px] items-center justify-center"><Loader2 className="animate-spin text-blue" size={24} aria-label="Carregando" /></div></div></main>;
  if (error) return <main className="min-h-screen"><DemoHeader /><div className="shell py-10"><div className="panel flex min-h-[360px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><h1 className="mt-4 text-xl font-bold text-navy">A demonstração não carregou</h1><p className="mt-2 text-sm text-[#607286]">Verifique se o banco foi preparado e tente novamente.</p><button className="button-secondary mt-5" onClick={() => window.location.reload()}><RefreshCw size={16} /> Tentar novamente</button></div></div></main>;
  if (!selectedProfile) return <main className="min-h-screen"><DemoHeader /><div className="shell py-10 sm:py-14"><section className="mx-auto max-w-[820px]"><p className="eyebrow">Perfil de demonstração</p><h1 className="mt-4 max-w-[690px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">Escolha uma perspectiva para entrar.</h1><p className="body-copy mt-5 max-w-[650px]">Escolha como quer conhecer o OFLIX. As personas são fictícias e a seleção não é autenticação.</p><ProfilePicker profiles={profiles} onSelected={chooseProfile} /></section></div></main>;

  const isPerson = selectedProfile.type === "PERSON";
  const isOrganization = selectedProfile.type === "ORGANIZATION";

  return <main className="min-h-screen pb-24 md:pb-8">
    <DemoHeader />
    <div className="shell py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4"><div><p className="eyebrow">{displayType(selectedProfile.type)} · Sergipe</p><p className="mt-1 text-sm font-semibold text-[#607286]"><MapPin size={14} className="mr-1 inline text-blue" />{selectedProfile.location.municipality} · {selectedProfile.location.district}</p></div><button type="button" className="button-quiet hidden sm:inline-flex" onClick={() => { window.localStorage.removeItem("oflix-demo-profile"); setSelectedId(null); window.dispatchEvent(new Event("oflix-profile-changed")); }}>Trocar perfil</button></div>
      <DemoNavigation profileType={selectedProfile.type} activeView={activeView} onNavigate={goTo} />

      {activeView === "home" && <section aria-labelledby="home-title">
        <div className="demo-hero"><div><p className="eyebrow">Início</p><h1 id="home-title" className="mt-2 max-w-[720px] text-3xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">{isPerson ? `Olá, ${selectedProfile.name.split(" ")[0]}.` : `Olá, ${selectedProfile.name}.`}</h1><p className="body-copy mt-3 max-w-[650px]">{isPerson ? "Encontre uma oportunidade que combine com o que você procura." : "Veja o que sua organização pode fazer agora no território."}</p></div><div className="demo-hero-note"><Sparkles size={18} className="text-blue" /><span>{isPerson ? "Oportunidades próximas" : "Conexões do território"}</span></div></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Ações rápidas">
          <button type="button" className="quick-action quick-action-primary" onClick={() => isPerson ? goTo("discover") : document.getElementById("publish-opportunity")?.scrollIntoView({ behavior: "smooth", block: "start" })}><span><span className="quick-action-kicker">Principal</span><strong>{isPerson ? "Encontrar trabalho" : "Publicar oportunidade"}</strong></span><ArrowRight size={18} /></button>
          <button type="button" className="quick-action" onClick={() => goTo("today")}><span><span className="quick-action-kicker">Agora</span><strong>Serviço para hoje</strong></span><ArrowRight size={18} /></button>
          <button type="button" className="quick-action" onClick={() => isPerson ? openPersonComposer() : goTo("talents")}><span><span className="quick-action-kicker">Atalho</span><strong>{isPerson ? "Oferecer meu trabalho" : "Encontrar talentos"}</strong></span><ArrowRight size={18} /></button>
        </div>

        {isPerson ? <><section className="mt-10" aria-labelledby="home-opportunities-title"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Para você</p><h2 id="home-opportunities-title" className="mt-2 text-2xl font-bold tracking-[-.03em] text-navy">Oportunidades em destaque</h2><p className="mt-1 text-sm text-[#637688]">Demandas que já estão movimentando o território.</p></div><button type="button" className="subtle-link" onClick={() => goTo("discover")}>Ver todas</button></div><div className="panel mt-4 px-5 sm:px-8">{homeMatches.length ? homeMatches.map((opportunity) => <OpportunityRow key={opportunity.id} opportunity={opportunity} kind={opportunity.kind} />) : <p className="py-8 text-sm text-[#637688]">Nenhuma oportunidade disponível agora.</p>}</div></section>{personComposerOpen && <div id="person-offer" className="mt-8 scroll-mt-4"><OpportunityComposer key={selectedProfile.id} profile={selectedProfile} onCreated={addCreatedOpportunity} /></div>}</> : <section id="publish-opportunity" className="mt-10 scroll-mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><OpportunityComposer key={selectedProfile.id} profile={selectedProfile} onCreated={addCreatedOpportunity} /><section className="panel p-5 sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Acompanhar</p><h2 className="mt-2 text-xl font-bold text-navy">Minhas oportunidades</h2></div><span className="text-sm font-bold text-blue">{ownedOpportunities.length}</span></div><div className="mt-4 divide-y divide-line">{ownedOpportunities.length ? ownedOpportunities.map((opportunity) => <div key={opportunity.id} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0"><strong className="block truncate text-sm text-navy">{opportunity.title}</strong><span className="text-xs text-[#718291]">{opportunity.kind === "formal" ? opportunity.employmentType === "INTERNSHIP" ? "Estágio" : "CLT" : opportunity.requiredActivities?.join(" · ") ?? opportunity.category}</span></span><span className="status status-success">Publicada</span></div>) : <p className="py-4 text-sm text-[#637688]">Você ainda não publicou uma oportunidade.</p>}</div><button type="button" className="subtle-link mt-4" onClick={() => goTo("discover")}>Ver oportunidades do território →</button></section></section>}
      </section>}

      {activeView === "preferences" && isPerson && <section aria-labelledby="preferences-title"><div className="page-intro"><p className="eyebrow">Preferências de trabalho</p><h1 id="preferences-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Diga o que combina com você.</h1><p className="body-copy mt-3 max-w-[650px]">Suas escolhas orientam os destaques e o recorte territorial da sua experiência.</p></div><InterestSelector profile={selectedProfile} matches={[...opportunities.formal, ...opportunities.service].map((opportunity) => ({ title: opportunity.title, category: opportunity.category, requiredActivities: opportunity.requiredActivities }))} /><PersonalTerritoryPanel profileId={selectedProfile.id} /></section>}

      {activeView === "today" && (isPerson || isOrganization) && <section aria-labelledby="today-title"><div className="page-intro"><p className="eyebrow">Serviço para hoje</p><h1 id="today-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Resolva uma necessidade de hoje.</h1><p className="body-copy mt-3 max-w-[650px]">Abra ou encontre um chamado com atividade, horário e território aproximado.</p></div><div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"><ServiceCallComposer profile={selectedProfile} /><ServiceCallPanel profile={selectedProfile} /></div></section>}

      {activeView === "talents" && isOrganization && <section aria-labelledby="talents-title"><div className="page-intro"><p className="eyebrow">Banco de talentos</p><h1 id="talents-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Encontre pessoas para o próximo passo.</h1><p className="body-copy mt-3 max-w-[650px]">Busque perfis que autorizaram a divulgação de competências, formação e interesses.</p></div><div className="mt-7"><TalentBasePanel ownerId={selectedProfile.id} talents={talents} /></div></section>}

      {activeView === "discover" && <section aria-labelledby="discover-title"><div className="page-intro"><p className="eyebrow">Buscar</p><h1 id="discover-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Encontre a próxima conexão.</h1><p className="body-copy mt-3 max-w-[650px]">Pesquise por oportunidade, atividade ou território. Use os filtros só quando precisar.</p></div><section className="mt-7" aria-label="Separar ofertas e demandas de trabalho"><div className="segmented-control" role="tablist" aria-label="Tipo de publicação"><button type="button" role="tab" aria-selected={publicationMode === "offers"} onClick={() => { setPublicationMode("offers"); setActiveTab("formal"); resetFilters(); }} className={publicationMode === "offers" ? "is-active" : ""}>Ofertas <span>Pessoas e autônomos</span></button><button type="button" role="tab" aria-selected={publicationMode === "demands"} onClick={() => { setPublicationMode("demands"); setActiveTab("formal"); resetFilters(); }} className={publicationMode === "demands" ? "is-active" : ""}>Demandas <span>{isOrganization ? "Suas publicações" : "Contratantes e instituições"}</span></button></div></section><nav className="mt-6 flex max-w-full gap-1 overflow-x-auto border-b border-line" aria-label="Frentes da plataforma">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setCategory(""); setMunicipality(""); setEmploymentType("ALL"); }} className={`whitespace-nowrap border-b-2 px-3 pb-3 text-sm font-bold transition first:pl-0 ${activeTab === tab.key ? "border-blue text-blue" : "border-transparent text-[#718291] hover:text-navy"}`}>{tab.label}<span className="ml-2 text-xs font-normal text-[#8a9aa7]">{opportunities[tab.key].filter((opportunity) => publicationMode === "offers" ? opportunity.ownerType === "PERSON" : opportunity.ownerType !== "PERSON" && (!isOrganization || opportunity.owner.id === selectedProfile.id)).length}</span></button>)}</nav><div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]"><div><OpportunityFilters search={search} category={category} municipality={municipality} employmentType={employmentType} favoritesOnly={favoritesOnly} categories={categories} municipalities={municipalities} isFormal={activeTab === "formal"} onSearch={setSearch} onCategory={setCategory} onMunicipality={setMunicipality} onEmploymentType={setEmploymentType} onFavoritesOnly={setFavoritesOnly} onClear={resetFilters} /><div className="panel px-5 sm:px-8">{visible.length ? visible.map((opportunity) => <OpportunityRow key={opportunity.id} opportunity={opportunity} kind={activeTab} />) : <div className="py-14 text-center"><p className="font-bold text-navy">Nenhuma publicação encontrada.</p><p className="mt-2 text-sm text-[#607286]">Tente outra palavra ou limpe os filtros para ampliar a busca.</p><button type="button" className="subtle-link mt-4" onClick={resetFilters}>Limpar busca</button></div>}</div></div><aside className="hidden h-fit border-l-2 border-[#c9dce8] pl-5 lg:block"><p className="eyebrow">Neste recorte</p><p className="mt-3 text-sm leading-6 text-[#607286]">{publicationMode === "offers" ? "Pessoas apresentam sua força de trabalho e suas atividades." : isOrganization ? "Você vê somente as demandas publicadas pela sua organização." : "Empresas e instituições apresentam vagas, serviços e ações."}</p><Link href="/profile" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue hover:underline"><BarChart3 size={16} /> Ver meu perfil <ArrowRight size={15} /></Link></aside></div></section>}
    </div>
    <div className="shell"><button type="button" className="button-quiet sm:hidden" onClick={() => { window.localStorage.removeItem("oflix-demo-profile"); setSelectedId(null); window.dispatchEvent(new Event("oflix-profile-changed")); }}>Trocar perfil</button></div>
  </main>;
}
