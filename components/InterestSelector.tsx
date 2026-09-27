"use client";

import { Bell, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WORK_ACTIVITIES, WORK_PREFERENCES, type WorkPreference } from "@/lib/domain";

type Match = { title: string; category: string; requiredActivities?: string[] };
type ServiceAlert = { id: string; title: string; activities: string[]; location: string; createdAt: string };
type PersonProfile = { id: string; name: string; summary: string; capabilities: string; location: { municipality: string; district: string } };
type TalentDirectoryRecord = { profileId: string; name: string; summary: string; capabilities: string; location: { municipality: string; district: string }; workPreferences: WorkPreference[]; activities: string[]; visible: boolean; updatedAt: string };
const serviceAlertKey = "oflix-service-opportunity-alerts";
const talentDirectoryKey = "oflix-talent-bank-profiles";

function matchesActivity(activities: string[], selected: string[]) {
  return activities.some((activity) => selected.some((item) => item.toLowerCase() === activity.toLowerCase()));
}

function readDirectory() {
  try { return JSON.parse(window.localStorage.getItem(talentDirectoryKey) ?? "[]") as TalentDirectoryRecord[]; } catch { return []; }
}

export function InterestSelector({ profile, matches }: { profile: PersonProfile; matches: Match[] }) {
  const { id: profileId } = profile;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [workPreferences, setWorkPreferences] = useState<WorkPreference[]>([]);
  const [talentVisible, setTalentVisible] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);

  useEffect(() => {
    function loadPreferences() {
      try {
        setSelected(JSON.parse(window.localStorage.getItem(`oflix-interests-${profileId}`) ?? "[]"));
        setWorkPreferences(JSON.parse(window.localStorage.getItem(`oflix-work-preferences-${profileId}`) ?? "[]"));
        setTalentVisible(window.localStorage.getItem(`oflix-talent-bank-visible-${profileId}`) === "on");
        setNotifications(window.localStorage.getItem(`oflix-interest-notifications-${profileId}`) === "on");
        setAlerts(JSON.parse(window.localStorage.getItem(serviceAlertKey) ?? "[]"));
      } catch {
        // Estado inicial seguro quando o navegador bloqueia o localStorage.
      }
    }
    loadPreferences();
    window.addEventListener("oflix-opportunity-alerts-changed", loadPreferences);
    window.addEventListener("oflix-interests-changed", loadPreferences);
    window.addEventListener("oflix-talent-bank-changed", loadPreferences);
    return () => {
      window.removeEventListener("oflix-opportunity-alerts-changed", loadPreferences);
      window.removeEventListener("oflix-interests-changed", loadPreferences);
      window.removeEventListener("oflix-talent-bank-changed", loadPreferences);
    };
  }, [profileId]);

  const filtered = useMemo(() => WORK_ACTIVITIES.filter((activity) => activity.toLowerCase().includes(query.toLowerCase())), [query]);
  const matching = matches.filter((match) => matchesActivity(match.requiredActivities?.length ? match.requiredActivities : [match.category], selected)).length;
  const relevantAlerts = alerts.filter((alert) => matchesActivity(alert.activities, selected));

  function saveDirectory(next: { activities?: string[]; workPreferences?: WorkPreference[]; visible?: boolean }) {
    const current = readDirectory().filter((record) => record.profileId !== profileId);
    const record: TalentDirectoryRecord = {
      profileId,
      name: profile.name,
      summary: profile.summary,
      capabilities: profile.capabilities,
      location: profile.location,
      workPreferences: next.workPreferences ?? workPreferences,
      activities: next.activities ?? selected,
      visible: next.visible ?? talentVisible,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(talentDirectoryKey, JSON.stringify([...current, record]));
    window.dispatchEvent(new Event("oflix-talent-bank-changed"));
  }

  function toggle(activity: string) {
    const next = selected.includes(activity) ? selected.filter((item) => item !== activity) : [...selected, activity];
    setSelected(next); window.localStorage.setItem(`oflix-interests-${profileId}`, JSON.stringify(next));
    saveDirectory({ activities: next });
    window.dispatchEvent(new Event("oflix-interests-changed"));
  }

  function toggleWorkPreference(preference: WorkPreference) {
    const next = workPreferences.includes(preference) ? workPreferences.filter((item) => item !== preference) : [...workPreferences, preference];
    setWorkPreferences(next); window.localStorage.setItem(`oflix-work-preferences-${profileId}`, JSON.stringify(next));
    saveDirectory({ workPreferences: next });
  }

  function toggleTalentVisibility() {
    const next = !talentVisible;
    setTalentVisible(next); window.localStorage.setItem(`oflix-talent-bank-visible-${profileId}`, next ? "on" : "off");
    saveDirectory({ visible: next });
  }

  async function enableNotifications() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    setNotifications(true); window.localStorage.setItem(`oflix-interest-notifications-${profileId}`, "on");
  }

  return <section className="panel mt-8 p-5 sm:p-6">
    <div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><Tag size={18} /></div><div><p className="eyebrow">Preferências de trabalho</p><h2 className="mt-2 text-xl font-bold text-navy">Atividades que você quer acompanhar</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Selecione quantas quiser. Quando uma nova oportunidade relacionada aparecer, ela poderá ser destacada para você.</p></div></div>
    <fieldset className="mt-5 rounded-lg border border-line bg-[#fbfcfd] p-4"><legend className="px-1 text-sm font-bold text-navy">Tipos de trabalho que você busca</legend><p className="text-sm leading-6 text-[#637688]">Escolha quantos quiser para compor seu perfil de interesse.</p><div className="mt-3 flex flex-wrap gap-2">{WORK_PREFERENCES.map((preference) => <label key={preference} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${workPreferences.includes(preference) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={preference} checked={workPreferences.includes(preference)} onChange={() => toggleWorkPreference(preference)} className="sr-only" />{preference}</label>)}</div></fieldset>
    <label className="mt-4 flex cursor-pointer gap-3 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-4"><input type="checkbox" aria-label="Permitir que instituições encontrem meu perfil" checked={talentVisible} onChange={toggleTalentVisibility} className="mt-1 h-4 w-4 accent-[#176c61]" /><span><strong className="block text-sm text-[#176c61]">Permitir que instituições encontrem meu perfil</strong><span className="mt-1 block text-sm leading-6 text-[#356d68]">Opcional. Organizações que publicam oportunidades poderão ver um resumo das suas competências, interesses, tipos de trabalho e localização aproximada, mesmo sem você ter demonstrado interesse em uma vaga.</span></span></label>
    <label className="relative mt-5 block max-w-[520px]"><span className="sr-only">Pesquisar atividades</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Pesquisar atividades" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar atividade, como eletricista" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label>
    <div className="mt-4 flex flex-wrap gap-2">{filtered.map((activity) => <label key={activity} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${selected.includes(activity) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={activity} checked={selected.includes(activity)} onChange={() => toggle(activity)} className="sr-only" />{activity}</label>)}</div>
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm text-[#637688]"><p>{selected.length ? <><strong className="text-navy">{selected.length}</strong> atividade(s) selecionada(s){matching ? ` · ${matching} oportunidade(s) compatível(is) agora` : ""}</> : "Nenhuma atividade selecionada ainda."}</p>{relevantAlerts.length > 0 && <p className="mt-2 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 font-semibold text-[#176c61]">{relevantAlerts.length} nova(s) demanda(s) compatível(is): {relevantAlerts.slice(0, 2).map((alert) => alert.title).join("; ")}{relevantAlerts.length > 2 ? "…" : ""}</p>}</div><button type="button" className={notifications ? "button-secondary" : "button-primary"} onClick={enableNotifications}><Bell size={16} />{notifications ? "Notificações ativadas" : "Ativar notificações"}</button></div>
  </section>;
}
