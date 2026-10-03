"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CircleAlert, Loader2, MapPin, RefreshCw, Search, Sparkles } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";
import { DemoNavigation, type DemoView } from "@/components/DemoNavigation";
import { DiscoveryRow } from "@/components/DiscoveryRow";
import { InterestSelector } from "@/components/InterestSelector";
import { OpportunityComposer } from "@/components/OpportunityComposer";
import { OpportunityFilters } from "@/components/OpportunityFilters";
import { PersonalTerritoryPanel } from "@/components/PersonalTerritoryPanel";
import { ProfilePicker } from "@/components/ProfilePicker";
import { PublicOpportunityPanel } from "@/components/PublicOpportunityPanel";
import { ServiceCallComposer } from "@/components/ServiceCallComposer";
import { ServiceCallPanel } from "@/components/ServiceCallPanel";
import { ServiceCallTeaser } from "@/components/ServiceCallTeaser";
import { TalentBasePanel } from "@/components/TalentBasePanel";
import { canDiscoverPublicOpportunities, DISCOVERY_FILTER_LABELS, discoveryItemMatchesFilter, type DiscoveryFilterKind, type DiscoveryItem, type OpportunityKind } from "@/lib/domain";
import { demoDiscoveryItems, discoveryReasons, internalToDiscoveryItem, rankDiscoveryItems } from "@/lib/discovery";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; summary: string; capabilities: string; canSupplyPublic: boolean; location: { state: string; municipality: string; district: string } };
type Opportunity = { id: string; title: string; description: string; category: string; kind: OpportunityKind; location: { municipality: string; district: string }; owner: { id: string; name: string }; ownerType: Profile["type"]; employmentType?: "CLT" | "INTERNSHIP"; eventDate?: string; requiredActivities?: string[] };
type Talent = { id: string; profileId: string; name: string; summary: string; capabilities: string; opportunityId: string; opportunityTitle: string; category: string; ownerId: string; action: string };
type PublicationMode = "offers" | "demands";
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
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilterKind>("all");
  const [publicationMode, setPublicationMode] = useState<PublicationMode>("demands");
  const [activeView, setActiveView] = useState<DemoView>("home");
  const [personComposerOpen, setPersonComposerOpen] = useState(false);
  const [organizationComposerOpen, setOrganizationComposerOpen] = useState(false);
  const [homeSearch, setHomeSearch] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [modality, setModality] = useState("");
  const [education, setEducation] = useState("");
  const [status, setStatus] = useState("");
  const [officialType, setOfficialType] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteVersion, setFavoriteVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [publicItems, setPublicItems] = useState<DiscoveryItem[]>(demoDiscoveryItems.filter((item) => item.kind === "public_procurement"));
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState("");
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [publicInterestEnabled, setPublicInterestEnabled] = useState(false);
  const [savedActivities, setSavedActivities] = useState<string[]>([]);
  const [savedWorkPreferences, setSavedWorkPreferences] = useState<string[]>([]);
  const searchUrlHydrated = useRef(false);
  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? null, [profiles, selectedId]);
  const publicAccess = Boolean(selectedProfile && canDiscoverPublicOpportunities(selectedProfile) && (selectedProfile.type === "ORGANIZATION" || publicInterestEnabled));

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
    if (!selectedProfile) return;
    setPublicLoaded(false);
    setPublicError("");
    const eligible = canDiscoverPublicOpportunities(selectedProfile);
    const readPublicPreference = () => setPublicInterestEnabled(selectedProfile.type === "ORGANIZATION" ? eligible : eligible && window.localStorage.getItem(`oflix-public-opportunities-${selectedProfile.id}`) === "on");
    readPublicPreference();
    window.addEventListener("oflix-public-opportunities-changed", readPublicPreference);
    return () => window.removeEventListener("oflix-public-opportunities-changed", readPublicPreference);
  }, [selectedProfile]);

  useEffect(() => {
    if (!selectedProfile) return;
    const readPreferences = () => {
      try {
        setSavedActivities(JSON.parse(window.localStorage.getItem(`oflix-interests-${selectedProfile.id}`) ?? "[]"));
        setSavedWorkPreferences(JSON.parse(window.localStorage.getItem(`oflix-work-preferences-${selectedProfile.id}`) ?? "[]"));
      } catch {
        setSavedActivities([]);
        setSavedWorkPreferences([]);
      }
    };
    readPreferences();
    window.addEventListener("oflix-interests-changed", readPreferences);
    window.addEventListener("oflix-profile-preferences-changed", readPreferences);
    return () => {
      window.removeEventListener("oflix-interests-changed", readPreferences);
      window.removeEventListener("oflix-profile-preferences-changed", readPreferences);
    };
  }, [selectedProfile]);

  useEffect(() => {
    if (!selectedProfile || !canDiscoverPublicOpportunities(selectedProfile) || !publicInterestEnabled || publicLoaded || (activeFilter !== "all" && activeFilter !== "public_procurement")) return;
    let cancelled = false;
    setPublicLoading(true);
    setPublicError("");
    fetch("/api/public-opportunities")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar as oportunidades agora.");
        if (!cancelled && Array.isArray(data.items)) setPublicItems(data.items);
      })
      .catch((loadError) => { if (!cancelled) setPublicError(loadError instanceof Error ? loadError.message : "Não foi possível atualizar as oportunidades agora."); })
      .finally(() => { if (!cancelled) { setPublicLoaded(true); setPublicLoading(false); } });
    return () => { cancelled = true; };
  }, [activeFilter, publicInterestEnabled, publicLoaded, selectedProfile]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "discover") setActiveView("discover");
    const requestedFilter = params.get("type") as DiscoveryFilterKind | null;
    if (requestedFilter && ["all", "employment", "service", "volunteer", "public_exam", "course", "public_procurement"].includes(requestedFilter)) setActiveFilter(requestedFilter);
    setSearch(params.get("q") ?? "");
    setCategory(params.get("category") ?? "");
    setMunicipality(params.get("municipality") ?? "");
    setModality(params.get("modality") ?? "");
    setEducation(params.get("education") ?? "");
    setStatus(params.get("status") ?? "");
    setOfficialType(params.get("officialType") ?? "");
    setFavoritesOnly(params.get("favorites") === "1");
    searchUrlHydrated.current = true;
  }, []);

  useEffect(() => {
    if (activeFilter === "public_procurement" && !publicAccess) setActiveFilter("all");
  }, [activeFilter, publicAccess]);

  useEffect(() => {
    if (!searchUrlHydrated.current || activeView !== "discover") return;
    const params = new URLSearchParams({ view: "discover" });
    if (activeFilter !== "all") params.set("type", activeFilter);
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (municipality) params.set("municipality", municipality);
    if (modality) params.set("modality", modality);
    if (education) params.set("education", education);
    if (status) params.set("status", status);
    if (officialType) params.set("officialType", officialType);
    if (favoritesOnly) params.set("favorites", "1");
    window.history.replaceState(null, "", `/demo?${params.toString()}`);
  }, [activeFilter, activeView, category, education, favoritesOnly, modality, municipality, officialType, search, status]);

  useEffect(() => {
    if (selectedProfile?.type !== "ORGANIZATION") { setTalents([]); return; }
    fetch(`/api/talents?profileId=${encodeURIComponent(selectedProfile.id)}`)
      .then(async (response) => { if (!response.ok) throw new Error("request"); return response.json(); })
      .then(setTalents)
      .catch(() => setTalents([]));
  }, [selectedProfile]);

  useEffect(() => {
    if (selectedProfile?.type === "INSTITUTIONAL_ANALYST") window.location.replace("/demo/analyst");
  }, [selectedProfile]);

  const allInternalDiscovery = useMemo(() => Object.values(opportunities).flat().map((opportunity) => internalToDiscoveryItem(opportunity)), [opportunities]);
  const discoveryItems = useMemo(() => {
    const internal = allInternalDiscovery.filter((item) => {
      if (!selectedProfile) return false;
      const opportunity = item.kind === "formal" || item.kind === "service" || item.kind === "volunteer" ? opportunities[item.kind].find((candidate) => candidate.id === item.id) : undefined;
      if (!opportunity) return false;
      if (selectedProfile.type === "PERSON") return true;
      if (publicationMode === "offers") return opportunity.ownerType === "PERSON";
      if (selectedProfile.type === "ORGANIZATION") return opportunity.ownerType !== "PERSON" && opportunity.owner.id === selectedProfile.id;
      return opportunity.ownerType !== "PERSON";
    });
    const personDemoItems = selectedProfile?.type === "PERSON" ? demoDiscoveryItems.filter((item) => item.kind !== "public_procurement") : [];
    return [...internal, ...personDemoItems, ...(publicAccess ? publicItems : [])];
  }, [allInternalDiscovery, opportunities, publicationMode, publicAccess, publicItems, selectedProfile]);
  const filterTabs = useMemo(() => {
    const base: DiscoveryFilterKind[] = ["all", "employment", "service", "volunteer"];
    if (selectedProfile?.type === "PERSON") base.push("public_exam", "course");
    if (publicAccess) base.push("public_procurement");
    return base;
  }, [publicAccess, selectedProfile]);
  const filterDiscoveryItem = useCallback((item: DiscoveryItem) => {
    const normalized = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const term = normalized(search.trim());
    const haystack = normalized(`${item.title} ${item.description} ${item.category} ${item.tags.join(" ")}`);
    const matchesTerm = !term || haystack.includes(term);
    const matchesCategory = !category || [item.category, ...item.tags].includes(category);
    const matchesMunicipality = !municipality || item.location.municipality === municipality;
    const matchesModality = !modality || item.modality === modality;
    const matchesEducation = !education || item.education === education;
    const matchesStatus = !status || item.status === status;
    const matchesOfficialType = !officialType || item.officialType === officialType;
    const matchesFavorite = !favoritesOnly || favoriteIds().includes(item.id);
    return discoveryItemMatchesFilter(item, activeFilter) && matchesTerm && matchesCategory && matchesMunicipality && matchesModality && matchesEducation && matchesStatus && matchesOfficialType && matchesFavorite;
  }, [activeFilter, category, education, favoritesOnly, modality, municipality, officialType, search, status]);
  const scopedDiscovery = useMemo(() => {
    void favoriteVersion;
    return discoveryItems.filter(filterDiscoveryItem);
  }, [discoveryItems, favoriteVersion, filterDiscoveryItem]);
  const visibleDiscovery = useMemo(() => rankDiscoveryItems(scopedDiscovery, { search, activities: savedActivities, workPreferences: savedWorkPreferences, municipality }), [municipality, savedActivities, savedWorkPreferences, scopedDiscovery, search]);
  const filterScopedItems = useMemo(() => discoveryItems.filter((item) => discoveryItemMatchesFilter(item, activeFilter)), [activeFilter, discoveryItems]);
  const categories = useMemo(() => Array.from(new Set(filterScopedItems.flatMap((item) => [item.category, ...item.tags]))).filter(Boolean).sort(), [filterScopedItems]);
  const municipalities = useMemo(() => Array.from(new Set(filterScopedItems.map((item) => item.location.municipality))).sort(), [filterScopedItems]);
  const modalities = useMemo(() => Array.from(new Set(filterScopedItems.map((item) => item.modality).filter(Boolean) as string[])).sort(), [filterScopedItems]);
  const educations = useMemo(() => Array.from(new Set(filterScopedItems.map((item) => item.education).filter(Boolean) as string[])).sort(), [filterScopedItems]);
  const statuses = useMemo(() => Array.from(new Set(filterScopedItems.map((item) => item.status).filter(Boolean) as string[])).sort(), [filterScopedItems]);
  const officialTypes = useMemo(() => Array.from(new Set(filterScopedItems.map((item) => item.officialType).filter(Boolean) as string[])).sort(), [filterScopedItems]);
  const allOpportunities = useMemo(() => Object.values(opportunities).flat(), [opportunities]);
  const ownedOpportunities = useMemo(() => selectedProfile ? allOpportunities.filter((opportunity) => opportunity.owner.id === selectedProfile.id) : [], [allOpportunities, selectedProfile]);
  const homeMatches = useMemo(() => rankDiscoveryItems(discoveryItems, { activities: savedActivities, workPreferences: savedWorkPreferences, municipality: selectedProfile?.location.municipality }).slice(0, 4), [discoveryItems, savedActivities, savedWorkPreferences, selectedProfile?.location.municipality]);
  const territoryItems = useMemo(() => discoveryItems.filter((item) => item.location.municipality === selectedProfile?.location.municipality), [discoveryItems, selectedProfile?.location.municipality]);
  const homeCounts = useMemo(() => ({
    work: territoryItems.filter((item) => item.kind === "formal" || item.kind === "external_job").length,
    services: territoryItems.filter((item) => item.kind === "service").length,
    publicExams: territoryItems.filter((item) => item.kind === "public_exam" || item.kind === "public_selection").length,
    courses: territoryItems.filter((item) => item.kind === "course").length,
  }), [territoryItems]);

  async function refreshPublicOpportunities() {
    setPublicLoading(true); setPublicError("");
    try {
      const response = await fetch("/api/public-opportunities?live=1&state=SE");
      const data = await response.json();
      if (!response.ok) throw new Error("Não foi possível atualizar as oportunidades agora.");
      setPublicItems(data.items ?? []);
    } catch (refreshError) {
      setPublicError(refreshError instanceof Error ? refreshError.message : "Não foi possível atualizar as oportunidades agora.");
    } finally { setPublicLoaded(true); setPublicLoading(false); }
  }

  function chooseProfile(id: string) {
    setSelectedId(id);
    setActiveView("home");
    setOrganizationComposerOpen(false);
    setPersonComposerOpen(false);
    setActiveFilter("all");
    resetFilters();
    window.localStorage.setItem("oflix-demo-profile", id);
    window.dispatchEvent(new Event("oflix-profile-changed"));
    const profile = profiles.find((candidate) => candidate.id === id);
    if (profile?.type === "INSTITUTIONAL_ANALYST") window.location.href = "/demo/analyst";
  }

  function resetFilters() {
    setSearch(""); setCategory(""); setMunicipality(""); setModality(""); setEducation(""); setStatus(""); setOfficialType(""); setFavoritesOnly(false);
  }

  function goToDiscovery(filter: DiscoveryFilterKind = "all", nextSearch?: string) {
    resetFilters();
    setActiveFilter(filter);
    if (nextSearch !== undefined) setSearch(nextSearch);
    setActiveView("discover");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function goTo(view: DemoView) {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openPersonComposer() {
    setPersonComposerOpen(true);
    window.setTimeout(() => document.getElementById("person-offer")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function openOrganizationComposer() {
    setOrganizationComposerOpen(true);
    window.setTimeout(() => document.getElementById("publish-opportunity")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function submitHomeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToDiscovery("all", homeSearch.trim());
  }

  function addCreatedOpportunity(opportunity: Opportunity) {
    setOpportunities((current) => ({ ...current, [opportunity.kind]: [opportunity, ...current[opportunity.kind]] }));
    setPublicationMode(opportunity.ownerType === "PERSON" ? "offers" : "demands");
    setActiveFilter(opportunity.kind === "formal" ? "employment" : opportunity.kind);
  }

  if (loading) return <main className="min-h-screen"><DemoHeader /><div className="shell py-10"><div className="panel flex min-h-[360px] items-center justify-center"><Loader2 className="animate-spin text-blue" size={24} aria-label="Carregando" /></div></div></main>;
  if (error) return <main className="min-h-screen"><DemoHeader /><div className="shell py-10"><div className="panel flex min-h-[360px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><h1 className="mt-4 text-xl font-bold text-navy">A demonstração não carregou</h1><p className="mt-2 text-sm text-[#607286]">Verifique se o banco foi preparado e tente novamente.</p><button className="button-secondary mt-5" onClick={() => window.location.reload()}><RefreshCw size={16} /> Tentar novamente</button></div></div></main>;
  if (selectedProfile?.type === "INSTITUTIONAL_ANALYST") return <main className="min-h-screen"><DemoHeader /><div className="shell py-10"><div className="panel flex min-h-[360px] items-center justify-center"><Loader2 className="animate-spin text-blue" size={24} aria-label="Abrindo painel analítico" /></div></div></main>;
  if (!selectedProfile) return <main className="min-h-screen"><DemoHeader /><div className="shell py-10 sm:py-14"><section className="mx-auto max-w-[820px]"><p className="eyebrow">Perfil de demonstração</p><h1 className="mt-4 max-w-[690px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">Escolha uma perspectiva para entrar.</h1><p className="body-copy mt-5 max-w-[650px]">Escolha como quer conhecer o OFLIX. As personas são fictícias e a seleção não é autenticação.</p><ProfilePicker profiles={profiles} onSelected={chooseProfile} /></section></div></main>;

  const isPerson = selectedProfile.type === "PERSON";
  const isOrganization = selectedProfile.type === "ORGANIZATION";
  const showPublicPanel = canDiscoverPublicOpportunities(selectedProfile) && publicInterestEnabled;
  const discoveryReturnTo = (() => {
    const params = new URLSearchParams({ view: "discover" });
    if (activeFilter !== "all") params.set("type", activeFilter);
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (municipality) params.set("municipality", municipality);
    if (modality) params.set("modality", modality);
    if (education) params.set("education", education);
    if (status) params.set("status", status);
    if (officialType) params.set("officialType", officialType);
    if (favoritesOnly) params.set("favorites", "1");
    return `/demo?${params.toString()}`;
  })();

  return <main className="min-h-screen pb-24 md:pb-8">
    <DemoHeader />
    <div className="shell py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-4"><div><p className="eyebrow">{displayType(selectedProfile.type)} · Sergipe</p><p className="mt-1 text-sm font-semibold text-[#607286]"><MapPin size={14} className="mr-1 inline text-blue" />{selectedProfile.location.municipality} · {selectedProfile.location.district}</p></div><button type="button" className="button-quiet hidden sm:inline-flex" onClick={() => { window.localStorage.removeItem("oflix-demo-profile"); setSelectedId(null); window.dispatchEvent(new Event("oflix-profile-changed")); }}>Trocar perfil</button></div>
      <DemoNavigation profileType={selectedProfile.type} activeView={activeView} onNavigate={goTo} />

      {activeView === "home" && <section aria-labelledby="home-title">
        <div className="demo-hero"><div><p className="eyebrow">Início</p><h1 id="home-title" className="mt-2 max-w-[720px] text-3xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">{isPerson ? `Olá, ${selectedProfile.name.split(" ")[0]}.` : `Olá, ${selectedProfile.name}.`}</h1><p className="body-copy mt-3 max-w-[700px]">{isPerson ? `Descubra oportunidades para trabalhar, aprender e crescer em ${selectedProfile.location.municipality}.` : "Veja o que sua organização pode fazer agora no território."}</p></div><div className="demo-hero-note"><Sparkles size={18} className="text-blue" /><span>{isPerson ? "Oportunidades no seu território" : "Conexões do território"}</span></div></div>

        {isPerson ? <>
          <form className="panel mt-7 p-5 sm:p-6" onSubmit={submitHomeSearch} aria-label="Buscar oportunidades"><label htmlFor="home-discovery-search" className="block text-base font-bold text-navy">O que você está procurando?</label><div className="mt-3 flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input id="home-discovery-search" aria-label="O que você está procurando?" value={homeSearch} onChange={(event) => setHomeSearch(event.target.value)} placeholder="Cargo, profissão, curso ou oportunidade" className="w-full rounded-lg border border-line bg-white py-3 pl-10 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></div><button type="submit" className="button-primary"><Search size={16} /> Buscar</button></div><p className="mt-3 text-xs text-[#718291]">Exemplos: Eletricista · Administração · Tecnologia</p></form>
          <section className="mt-8 rounded-2xl border border-[#c9dce8] bg-[#f5fafc] p-5 sm:p-6" aria-labelledby="territory-summary-title"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Recorte territorial</p><h2 id="territory-summary-title" className="mt-2 text-2xl font-black tracking-[-.03em] text-navy">Na demonstração em {selectedProfile.location.municipality}</h2><p className="mt-2 text-sm text-[#637688]">Dados da demonstração · oportunidades permitidas para este perfil.</p></div><div className="sm:text-right"><p className="text-3xl font-black text-navy">{homeCounts.work || "Nenhuma"}</p><p className="text-sm font-bold text-[#637688]">{homeCounts.work === 1 ? "oportunidade de trabalho" : "oportunidades de trabalho"}</p></div></div><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#d5e4ec] pt-4 text-sm font-semibold text-[#53687c]">{homeCounts.services > 0 && <span>{homeCounts.services} serviços</span>}{homeCounts.publicExams > 0 && <span>{homeCounts.publicExams} concursos e seleções</span>}{homeCounts.courses > 0 && <span>{homeCounts.courses} capacitações</span>}</div></section>
          <section className="mt-8" aria-labelledby="hub-shortcuts-title"><div><p className="eyebrow">O que você encontra</p><h2 id="hub-shortcuts-title" className="mt-2 text-2xl font-bold tracking-[-.03em] text-navy">Explore oportunidades</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><button type="button" className="quick-action" onClick={() => goToDiscovery("employment")}><span><strong>Trabalho</strong><span className="mt-1 block text-sm font-normal text-[#637688]">Vagas, estágio e oportunidades externas</span></span><ArrowRight size={18} /></button><button type="button" className="quick-action" onClick={() => goToDiscovery("service")}><span><strong>Serviços</strong><span className="mt-1 block text-sm font-normal text-[#637688]">Trabalho autônomo e demandas locais</span></span><ArrowRight size={18} /></button><button type="button" className="quick-action" onClick={() => goToDiscovery("public_exam")}><span><strong>Concursos</strong><span className="mt-1 block text-sm font-normal text-[#637688]">Concursos e seleções públicas</span></span><ArrowRight size={18} /></button><button type="button" className="quick-action" onClick={() => goToDiscovery("course")}><span><strong>Capacitação</strong><span className="mt-1 block text-sm font-normal text-[#637688]">Cursos e qualificação</span></span><ArrowRight size={18} /></button><button type="button" className="quick-action" onClick={() => goToDiscovery("volunteer")}><span><strong>Voluntariado</strong><span className="mt-1 block text-sm font-normal text-[#637688]">Ações e iniciativas</span></span><ArrowRight size={18} /></button>{showPublicPanel && <button type="button" className="quick-action" onClick={() => goToDiscovery("public_procurement")}><span><strong>Poder público</strong><span className="mt-1 block text-sm font-normal text-[#637688]">Oportunidades para sua atividade</span></span><ArrowRight size={18} /></button>}</div></section>
          <div className="mt-5 flex flex-wrap items-center gap-3"><span className="text-sm text-[#637688]">Você também pode apresentar sua força de trabalho.</span><button type="button" className="subtle-link" onClick={openPersonComposer}>Oferecer meu trabalho</button></div><section className="mt-8" aria-labelledby="home-opportunities-title"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Para você</p><h2 id="home-opportunities-title" className="mt-2 text-2xl font-bold tracking-[-.03em] text-navy">Recomendado para você</h2><p className="mt-1 text-sm text-[#637688]">Um recorte misto, priorizado pelas suas atividades e preferências.</p></div><button type="button" className="subtle-link" onClick={() => goToDiscovery()}>Ver tudo</button></div><div className="panel mt-4 px-5 sm:px-8">{homeMatches.length ? homeMatches.map((item) => <DiscoveryRow key={`${item.source}-${item.id}`} item={item} />) : <p className="py-8 text-sm text-[#637688]">Nenhuma oportunidade disponível agora.</p>}</div></section>
          {personComposerOpen && <div id="person-offer" className="mt-8 scroll-mt-4"><OpportunityComposer key={selectedProfile.id} profile={selectedProfile} onCreated={addCreatedOpportunity} /></div>}
          <ServiceCallTeaser profile={selectedProfile} onOpen={() => goTo("today")} />
          {showPublicPanel && <PublicOpportunityPanel items={publicItems} onExplore={() => goToDiscovery("public_procurement")} profileLabel={selectedProfile.name} />}
        </> : <>
          <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Ações da organização"><button type="button" className="quick-action quick-action-primary" onClick={openOrganizationComposer}><span><span className="quick-action-kicker">Principal</span><strong>Publicar oportunidade</strong></span><ArrowRight size={18} /></button><button type="button" className="quick-action" onClick={() => goTo("talents")}><span><span className="quick-action-kicker">Pessoas</span><strong>Encontrar talentos</strong></span><ArrowRight size={18} /></button><button type="button" className="quick-action" onClick={() => goTo("today")}><span><span className="quick-action-kicker">Agora</span><strong>Serviço para hoje</strong></span><ArrowRight size={18} /></button></section>
          {organizationComposerOpen && <section id="publish-opportunity" className="mt-8 scroll-mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><OpportunityComposer key={selectedProfile.id} profile={selectedProfile} onCreated={addCreatedOpportunity} /><section className="panel p-5 sm:p-6"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">Acompanhar</p><h2 className="mt-2 text-xl font-bold text-navy">Minhas oportunidades</h2></div><span className="text-sm font-bold text-blue">{ownedOpportunities.length}</span></div><div className="mt-4 divide-y divide-line">{ownedOpportunities.length ? ownedOpportunities.map((opportunity) => <div key={opportunity.id} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0"><strong className="block truncate text-sm text-navy">{opportunity.title}</strong><span className="text-xs text-[#718291]">{opportunity.kind === "formal" ? opportunity.employmentType === "INTERNSHIP" ? "Estágio" : "CLT" : opportunity.requiredActivities?.join(" · ") ?? opportunity.category}</span></span><span className="status status-success">Publicada</span></div>) : <p className="py-4 text-sm text-[#637688]">Você ainda não publicou uma oportunidade.</p>}</div></section></section>}
          <ServiceCallTeaser profile={selectedProfile} onOpen={() => goTo("today")} />
          {showPublicPanel && <PublicOpportunityPanel items={publicItems} onExplore={() => goToDiscovery("public_procurement")} profileLabel={selectedProfile.name} />}
        </>}
      </section>}

      {activeView === "preferences" && isPerson && <section aria-labelledby="preferences-title"><div className="page-intro"><p className="eyebrow">Preferências</p><h1 id="preferences-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Escolha o que você quer acompanhar.</h1><p className="body-copy mt-3 max-w-[650px]">Preferências guardam sua intenção de descoberta. Formação, currículo, território e banco de talentos ficam no Perfil.</p></div><InterestSelector profile={selectedProfile} matches={[...opportunities.formal, ...opportunities.service].map((opportunity) => ({ title: opportunity.title, category: opportunity.category, requiredActivities: opportunity.requiredActivities }))} /><details className="mt-6 rounded-2xl border border-line bg-white"><summary className="cursor-pointer list-none p-4 text-sm font-bold text-navy sm:p-5">Ver recorte territorial detalhado</summary><div className="border-t border-line px-1 pb-1"><PersonalTerritoryPanel profileId={selectedProfile.id} /></div></details></section>}

      {activeView === "today" && (isPerson || isOrganization) && <section aria-labelledby="today-title"><div className="page-intro"><p className="eyebrow">Serviço para hoje</p><h1 id="today-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Resolva uma necessidade de hoje.</h1><p className="body-copy mt-3 max-w-[650px]">Abra ou encontre um chamado com atividade, horário e território aproximado.</p></div><div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]"><ServiceCallComposer profile={selectedProfile} /><ServiceCallPanel profile={selectedProfile} /></div></section>}

      {activeView === "talents" && isOrganization && <section aria-labelledby="talents-title"><div className="page-intro"><p className="eyebrow">Banco de talentos</p><h1 id="talents-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Encontre pessoas para o próximo passo.</h1><p className="body-copy mt-3 max-w-[650px]">Busque perfis que autorizaram a divulgação de competências, formação e interesses.</p></div><div className="mt-7"><TalentBasePanel ownerId={selectedProfile.id} talents={talents} /></div></section>}

      {activeView === "discover" && <section aria-labelledby="discover-title"><div className="page-intro"><p className="eyebrow">Buscar</p><h1 id="discover-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-navy sm:text-4xl">Descubra oportunidades</h1><p className="body-copy mt-3 max-w-[650px]">Trabalho, concursos, capacitação e outras oportunidades para você.</p></div><section className="mt-7" aria-label="Separar ofertas e demandas de trabalho"><div className="segmented-control" role="tablist" aria-label="Tipo de publicação"><button type="button" role="tab" aria-selected={publicationMode === "offers"} onClick={() => { setPublicationMode("offers"); setActiveFilter("all"); resetFilters(); }} className={publicationMode === "offers" ? "is-active" : ""}>Ofertas <span>Pessoas e autônomos</span></button><button type="button" role="tab" aria-selected={publicationMode === "demands"} onClick={() => { setPublicationMode("demands"); setActiveFilter("all"); resetFilters(); }} className={publicationMode === "demands" ? "is-active" : ""}>Demandas <span>{isOrganization ? "Sua organização + poder público" : "Contratantes e fontes externas"}</span></button></div></section><nav className="mt-6 flex max-w-full gap-1 overflow-x-auto border-b border-line" aria-label="Tipos de oportunidade">{filterTabs.map((filter) => <button key={filter} type="button" onClick={() => { setActiveFilter(filter); setCategory(""); setMunicipality(""); setModality(""); setEducation(""); setStatus(""); setOfficialType(""); }} className={`whitespace-nowrap border-b-2 px-3 pb-3 text-sm font-bold transition first:pl-0 ${activeFilter === filter ? "border-blue text-blue" : "border-transparent text-[#718291] hover:text-navy"}`}>{DISCOVERY_FILTER_LABELS[filter]}<span className="ml-2 text-xs font-normal text-[#8a9aa7]">{discoveryItems.filter((item) => discoveryItemMatchesFilter(item, filter)).length}</span></button>)}</nav><div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]"><div><OpportunityFilters filterKind={activeFilter} search={search} category={category} municipality={municipality} modality={modality} education={education} status={status} officialType={officialType} favoritesOnly={favoritesOnly} categories={categories} municipalities={municipalities} modalities={modalities} educations={educations} statuses={statuses} officialTypes={officialTypes} onSearch={setSearch} onCategory={setCategory} onMunicipality={setMunicipality} onModality={setModality} onEducation={setEducation} onStatus={setStatus} onOfficialType={setOfficialType} onFavoritesOnly={setFavoritesOnly} onClear={resetFilters} />{publicError && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f1d9a5] bg-[#fff9ed] p-3 text-sm font-semibold text-[#76531c]">Não foi possível atualizar as oportunidades agora.<button type="button" className="button-quiet" onClick={refreshPublicOpportunities} disabled={publicLoading}>{publicLoading ? "Tentando…" : "Tentar novamente"}</button></div>}{publicLoading && <p role="status" className="mb-4 text-sm text-[#637688]">Atualizando oportunidades públicas…</p>}<div className="panel px-5 sm:px-8">{visibleDiscovery.length ? visibleDiscovery.map((item) => <DiscoveryRow key={`${item.source}-${item.id}`} item={item} reason={discoveryReasons(item, { search, activities: savedActivities, workPreferences: savedWorkPreferences, municipality, publicEnabled: publicAccess })} returnTo={discoveryReturnTo} />) : <div className="py-14 text-center"><p className="font-bold text-navy">Nenhuma oportunidade encontrada.</p><p className="mt-2 text-sm text-[#607286]">Tente outra palavra ou limpe os filtros para ampliar a busca.</p><button type="button" className="subtle-link mt-4" onClick={resetFilters}>Limpar busca</button></div>}</div></div><aside className="hidden h-fit border-l-2 border-[#c9dce8] pl-5 lg:block"><p className="eyebrow">Neste recorte</p><p className="mt-3 text-sm leading-6 text-[#607286]">{publicationMode === "offers" ? "Pessoas apresentam sua força de trabalho e suas atividades." : isOrganization ? "Sua organização vê suas demandas e, quando habilitada, oportunidades públicas." : "Todos os tipos de oportunidade permitidos para este perfil aparecem nesta busca."}</p><Link href="/profile" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue hover:underline"><BarChart3 size={16} /> Ver meu perfil <ArrowRight size={15} /></Link></aside></div></section>}
    </div>
    <div className="shell"><button type="button" className="button-quiet sm:hidden" onClick={() => { window.localStorage.removeItem("oflix-demo-profile"); setSelectedId(null); window.dispatchEvent(new Event("oflix-profile-changed")); }}>Trocar perfil</button></div>
  </main>;
}
