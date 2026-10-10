"use client";

import Link from "next/link";
import { Bell, ChevronDown, Search, Tag } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { DEVELOPMENT_PREFERENCES, VOLUNTEER_INTERESTS, WORK_ACTIVITIES, WORK_PREFERENCES, workPreferenceLabel, type VolunteerInterest, type WorkPreference } from "@/lib/domain";
import { readProfileArray, readResidence, readTalentRecord, saveTalentRecord, SERVICE_ALERT_KEY, type ResidenceData, type TalentDirectoryRecord } from "@/lib/profile-storage";

type Match = { title: string; category: string; requiredActivities?: string[] };
type PersonProfile = { id: string; name: string; summary: string; capabilities: string; location: { state: string; municipality: string; district: string } };
type ServiceAlert = { id: string; title: string; activities: string[]; location: string; createdAt: string };
type PreferenceSection = "work" | "development" | "activities" | "volunteer" | "business" | null;

function matchesActivity(activities: string[], selected: string[]) {
  return activities.some((activity) => selected.some((item) => item.toLowerCase() === activity.toLowerCase()));
}

function storedArray<T>(key: string, profileId: string, fallback: T[]) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(`${key}-${profileId}`);
  return stored === null ? fallback : readProfileArray<T>(key, profileId);
}

function PreferenceGroup({ id, title, description, summary, open, onToggle, children }: { id: string; title: string; description: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className={`rounded-2xl border bg-white transition ${open ? "border-[#a9c9dc] shadow-soft" : "border-line"}`}>
    <button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5" aria-expanded={open} aria-controls={`${id}-content`} onClick={onToggle}>
      <span className="min-w-0"><span className="block text-base font-bold text-navy">{title}</span><span className="mt-1 block text-sm leading-6 text-[#637688]">{description}</span><span className="mt-3 block text-sm font-bold text-blue">{summary}</span></span>
      <ChevronDown size={19} className={`mt-1 shrink-0 text-blue transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-content`} className="border-t border-line px-4 pb-5 pt-4 sm:px-5">{children}</div>}
  </section>;
}

export function InterestSelector({ profile, matches }: { profile: PersonProfile; matches: Match[] }) {
  const { id: profileId } = profile;
  const [query, setQuery] = useState("");
  const [volunteerQuery, setVolunteerQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [volunteerInterests, setVolunteerInterests] = useState<VolunteerInterest[]>([]);
  const [workPreferences, setWorkPreferences] = useState<WorkPreference[]>([]);
  const [residence, setResidence] = useState<ResidenceData>({ state: profile.location.state || "SE", municipality: profile.location.municipality });
  const [notifications, setNotifications] = useState(false);
  const [publicOpportunities, setPublicOpportunities] = useState(false);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [openSection, setOpenSection] = useState<PreferenceSection>(null);

  useEffect(() => {
    function loadPreferences() {
      const record = readTalentRecord(profileId);
      setSelected(storedArray<string>("oflix-interests", profileId, record?.activities ?? []));
      setVolunteerInterests(record?.volunteerInterests ?? []);
      setWorkPreferences(storedArray<WorkPreference>("oflix-work-preferences", profileId, record?.workPreferences ?? []));
      setResidence(readResidence(profileId, { municipality: profile.location.municipality, state: profile.location.state || "SE" }));
      setNotifications(window.localStorage.getItem(`oflix-interest-notifications-${profileId}`) === "on");
      setPublicOpportunities(window.localStorage.getItem(`oflix-public-opportunities-${profileId}`) === "on" && profile.capabilities.toLowerCase().includes("serviços autônomos"));
      try {
        const value = JSON.parse(window.localStorage.getItem(SERVICE_ALERT_KEY) ?? "[]");
        setAlerts(Array.isArray(value) ? value as ServiceAlert[] : []);
      } catch {
        setAlerts([]);
      }
    }
    loadPreferences();
    window.addEventListener("oflix-opportunity-alerts-changed", loadPreferences);
    window.addEventListener("oflix-interests-changed", loadPreferences);
    window.addEventListener("oflix-profile-preferences-changed", loadPreferences);
    window.addEventListener("oflix-talent-bank-changed", loadPreferences);
    window.addEventListener("oflix-profile-territory-changed", loadPreferences);
    return () => {
      window.removeEventListener("oflix-opportunity-alerts-changed", loadPreferences);
      window.removeEventListener("oflix-interests-changed", loadPreferences);
      window.removeEventListener("oflix-profile-preferences-changed", loadPreferences);
      window.removeEventListener("oflix-talent-bank-changed", loadPreferences);
      window.removeEventListener("oflix-profile-territory-changed", loadPreferences);
    };
  }, [profile.capabilities, profile.location.municipality, profile.location.state, profileId]);

  const filtered = useMemo(() => WORK_ACTIVITIES.filter((activity) => activity.toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredVolunteerInterests = useMemo(() => VOLUNTEER_INTERESTS.filter((interest) => interest.toLowerCase().includes(volunteerQuery.toLowerCase())), [volunteerQuery]);
  const matching = matches.filter((match) => matchesActivity(match.requiredActivities?.length ? match.requiredActivities : [match.category], selected)).length;
  const relevantAlerts = alerts.filter((alert) => matchesActivity(alert.activities, selected));
  const selectedDevelopment = workPreferences.filter((preference) => DEVELOPMENT_PREFERENCES.includes(preference));
  const canFollowPublic = profile.capabilities.toLowerCase().includes("serviços autônomos");

  function saveDirectory(next: { workPreferences?: WorkPreference[]; activities?: string[]; volunteerInterests?: VolunteerInterest[] }) {
    const current = readTalentRecord(profileId);
    const record: TalentDirectoryRecord = {
      profileId,
      name: profile.name,
      summary: profile.summary,
      capabilities: profile.capabilities,
      location: current?.location ?? { ...residence, district: profile.location.district },
      workPreferences: next.workPreferences ?? workPreferences,
      activities: next.activities ?? selected,
      volunteerInterests: next.volunteerInterests ?? volunteerInterests,
      visible: current?.visible ?? false,
      educationLevel: current?.educationLevel ?? "",
      courseTypes: current?.courseTypes ?? [],
      courseName: current?.courseName ?? "",
      specialization: current?.specialization ?? "",
      curriculumFileName: current?.curriculumFileName ?? "",
      curriculumDataUrl: current?.curriculumDataUrl ?? "",
      curriculumConfirmed: current?.curriculumConfirmed ?? false,
      updatedAt: new Date().toISOString(),
    };
    saveTalentRecord(record);
  }

  function toggle(activity: string) {
    const next = selected.includes(activity) ? selected.filter((item) => item !== activity) : [...selected, activity];
    setSelected(next);
    window.localStorage.setItem(`oflix-interests-${profileId}`, JSON.stringify(next));
    saveDirectory({ activities: next });
    window.dispatchEvent(new Event("oflix-interests-changed"));
  }

  function toggleWorkPreference(preference: WorkPreference) {
    const next = workPreferences.includes(preference) ? workPreferences.filter((item) => item !== preference) : [...workPreferences, preference];
    setWorkPreferences(next);
    window.localStorage.setItem(`oflix-work-preferences-${profileId}`, JSON.stringify(next));
    saveDirectory({ workPreferences: next });
    window.dispatchEvent(new Event("oflix-profile-preferences-changed"));
  }

  function toggleVolunteerInterest(interest: VolunteerInterest) {
    const next = volunteerInterests.includes(interest) ? volunteerInterests.filter((item) => item !== interest) : [...volunteerInterests, interest];
    setVolunteerInterests(next);
    saveDirectory({ volunteerInterests: next });
    window.dispatchEvent(new Event("oflix-profile-preferences-changed"));
  }

  function togglePublicOpportunities() {
    const next = !publicOpportunities;
    setPublicOpportunities(next);
    window.localStorage.setItem(`oflix-public-opportunities-${profileId}`, next ? "on" : "off");
    window.dispatchEvent(new Event("oflix-public-opportunities-changed"));
  }

  const workSummary = workPreferences.filter((preference) => WORK_PREFERENCES.includes(preference)).length ? workPreferences.filter((preference) => WORK_PREFERENCES.includes(preference)).map(workPreferenceLabel).join(" + ") : "Nenhuma frente selecionada";
  const developmentSummary = selectedDevelopment.length ? selectedDevelopment.map((item) => workPreferenceLabel(item).replace(" públicos", "").replace("Cursos e capacitação", "Cursos")).join(" + ") : "Nenhum caminho selecionado";
  const activitySummary = selected.length ? `${selected.slice(0, 3).join(", ")}${selected.length > 3 ? "…" : ""} · ${selected.length} área(s)` : "Nenhuma área selecionada";
  const volunteerSummary = volunteerInterests.length ? `${volunteerInterests.slice(0, 2).join(" + ")}${volunteerInterests.length > 2 ? "…" : ""}` : "Nenhum interesse selecionado";

  return <section className="mt-7" aria-label="Preferências de descoberta">
    <div className="mb-4 flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><Tag size={18} /></div><div><p className="eyebrow">O que acompanhar</p><h2 className="mt-2 text-xl font-bold text-navy">Preferências de descoberta</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">A visão inicial é curta. Abra um grupo para ajustar apenas o que importa agora.</p></div></div>
    <div className="space-y-3">
      <PreferenceGroup id="work-preferences" title="Oportunidades de trabalho" description="Empregos, prestação de serviços e voluntariado" summary={workSummary} open={openSection === "work"} onToggle={() => setOpenSection(openSection === "work" ? null : "work")}>
        <p className="text-sm leading-6 text-[#637688]">Escolha as frentes de trabalho que você quer acompanhar.</p><div className="mt-3 flex flex-wrap gap-2">{WORK_PREFERENCES.map((preference) => <label key={preference} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${workPreferences.includes(preference) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={workPreferenceLabel(preference)} checked={workPreferences.includes(preference)} onChange={() => toggleWorkPreference(preference)} className="sr-only" />{workPreferenceLabel(preference)}</label>)}</div>
      </PreferenceGroup>
      <PreferenceGroup id="development-preferences" title="Desenvolvimento profissional" description="Concursos, processos seletivos e capacitação" summary={developmentSummary} open={openSection === "development"} onToggle={() => setOpenSection(openSection === "development" ? null : "development")}>
        <p className="text-sm leading-6 text-[#637688]">Acompanhe caminhos de desenvolvimento que devem influenciar suas recomendações.</p><div className="mt-3 flex flex-wrap gap-2">{DEVELOPMENT_PREFERENCES.map((preference) => <label key={preference} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${workPreferences.includes(preference) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={preference} checked={workPreferences.includes(preference)} onChange={() => toggleWorkPreference(preference)} className="sr-only" />{preference}</label>)}</div>
      </PreferenceGroup>
      <PreferenceGroup id="activity-preferences" title="Áreas e atividades" description="Profissões, competências e temas de atuação" summary={activitySummary} open={openSection === "activities"} onToggle={() => setOpenSection(openSection === "activities" ? null : "activities")}>
        <label className="relative block max-w-[520px]"><span className="sr-only">Buscar área ou profissão</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Buscar área ou profissão" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar área ou profissão" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label>
        <p className="mt-5 text-xs font-black uppercase tracking-[.12em] text-[#738593]">Selecionadas</p><div className="mt-2 flex flex-wrap gap-2">{selected.length ? selected.map((activity) => <label key={activity} className="cursor-pointer rounded-full border border-blue bg-[#edf6fb] px-3 py-2 text-sm font-bold text-blue"><input type="checkbox" aria-label={`Remover ${activity}`} checked onChange={() => toggle(activity)} className="sr-only" />{activity} ×</label>) : <p className="text-sm text-[#718291]">Nenhuma área selecionada ainda.</p>}</div>
        <p className="mt-5 text-xs font-black uppercase tracking-[.12em] text-[#738593]">Outras áreas</p><div className="mt-2 flex flex-wrap gap-2">{filtered.filter((activity) => !selected.includes(activity)).map((activity) => <label key={activity} className="cursor-pointer rounded-full border border-line bg-white px-3 py-2 text-sm font-bold text-[#637688] hover:border-blue"><input type="checkbox" aria-label={activity} checked={false} onChange={() => toggle(activity)} className="sr-only" />{activity}</label>)}</div><p className="mt-3 text-xs text-[#718291]">{matching ? `${matching} oportunidade(s) de trabalho compatível(is) agora.` : "As áreas escolhidas orientam o recorte da descoberta."}</p>{relevantAlerts.length > 0 && <p className="mt-3 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 text-sm font-semibold text-[#176c61]">{relevantAlerts.length} nova(s) demanda(s) compatível(is): {relevantAlerts.slice(0, 2).map((alert) => alert.title).join("; ")}{relevantAlerts.length > 2 ? "…" : ""}</p>}
      </PreferenceGroup>
      <PreferenceGroup id="volunteer-preferences" title="Interesses em voluntariado" description="Temas e iniciativas que você quer acompanhar" summary={volunteerSummary} open={openSection === "volunteer"} onToggle={() => setOpenSection(openSection === "volunteer" ? null : "volunteer")}>
        <label className="relative block max-w-[520px]"><span className="sr-only">Buscar interesse em voluntariado</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Buscar interesse em voluntariado" value={volunteerQuery} onChange={(event) => setVolunteerQuery(event.target.value)} placeholder="Buscar interesse em voluntariado" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label>
        <p className="mt-5 text-xs font-black uppercase tracking-[.12em] text-[#738593]">Selecionados</p><div className="mt-2 flex flex-wrap gap-2">{volunteerInterests.length ? volunteerInterests.map((interest) => <label key={interest} className="cursor-pointer rounded-full border border-blue bg-[#edf6fb] px-3 py-2 text-sm font-bold text-blue"><input type="checkbox" aria-label={`Remover ${interest}`} checked onChange={() => toggleVolunteerInterest(interest)} className="sr-only" />{interest} ×</label>) : <p className="text-sm text-[#718291]">Nenhum interesse selecionado ainda.</p>}</div>
        <p className="mt-5 text-xs font-black uppercase tracking-[.12em] text-[#738593]">Outros interesses</p><div className="mt-2 flex flex-wrap gap-2">{filteredVolunteerInterests.filter((interest) => !volunteerInterests.includes(interest)).map((interest) => <label key={interest} className="cursor-pointer rounded-full border border-line bg-white px-3 py-2 text-sm font-bold text-[#637688] hover:border-blue"><input type="checkbox" aria-label={interest} checked={false} onChange={() => toggleVolunteerInterest(interest)} className="sr-only" />{interest}</label>)}</div>
      </PreferenceGroup>
      {canFollowPublic && <PreferenceGroup id="business-preferences" title="Oportunidades de negócio" description="Contratações relacionadas às suas atividades" summary={publicOpportunities ? "Poder público · Ativado" : "Poder público · Desativado"} open={openSection === "business"} onToggle={() => setOpenSection(openSection === "business" ? null : "business")}>
        <label className="flex cursor-pointer gap-3"><input type="checkbox" aria-label="Quero acompanhar oportunidades com o poder público" checked={publicOpportunities} onChange={togglePublicOpportunities} className="mt-1 h-4 w-4 accent-[#8a5a00]" /><span><strong className="block text-sm text-navy">Quero acompanhar oportunidades com o poder público</strong><span className="mt-1 block text-sm leading-6 text-[#637688]">Veja contratações relacionadas às suas atividades. Consulte sempre os requisitos oficiais.</span></span></label>
      </PreferenceGroup>}
    </div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <Link href="/profile" className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-blue"><span><span className="block text-base font-bold text-navy">Território de referência</span><span className="mt-1 block text-sm text-[#637688]">{residence.municipality} · {residence.state}</span><span className="mt-2 block text-sm font-bold text-blue">Editar no Perfil</span></span><Tag size={18} className="shrink-0 text-blue" /></Link>
      <Link href="/settings" className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 transition hover:border-blue"><span><span className="block text-base font-bold text-navy">Avisos e notificações</span><span className="mt-1 block text-sm text-[#637688]">{notifications ? "Ativados" : "Desativados"}</span><span className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-blue"><Bell size={15} /> Configurar</span></span><Tag size={18} className="shrink-0 text-blue" /></Link>
    </div>
  </section>;
}
