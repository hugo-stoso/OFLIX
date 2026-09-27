"use client";

import { Bell, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const activities = ["Eletricista", "Manutenção", "Construção", "Limpeza", "Alimentação", "Eventos", "Design", "Comunicação", "Educação", "Tecnologia", "Cuidados", "Jardinagem", "Transporte", "Beleza", "Administração", "Meio ambiente"];
type Match = { title: string; category: string };

export function InterestSelector({ profileId, matches }: { profileId: string; matches: Match[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(false);
  useEffect(() => {
    try { setSelected(JSON.parse(window.localStorage.getItem(`oflix-interests-${profileId}`) ?? "[]")); setNotifications(window.localStorage.getItem(`oflix-interest-notifications-${profileId}`) === "on"); } catch { /* estado inicial */ }
  }, [profileId]);
  const filtered = useMemo(() => activities.filter((activity) => activity.toLowerCase().includes(query.toLowerCase())), [query]);
  const matching = matches.filter((match) => selected.some((item) => item.toLowerCase() === match.category.toLowerCase())).length;
  function toggle(activity: string) {
    const next = selected.includes(activity) ? selected.filter((item) => item !== activity) : [...selected, activity];
    setSelected(next); window.localStorage.setItem(`oflix-interests-${profileId}`, JSON.stringify(next));
    window.dispatchEvent(new Event("oflix-interests-changed"));
  }
  async function enableNotifications() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    setNotifications(true); window.localStorage.setItem(`oflix-interest-notifications-${profileId}`, "on");
  }
  return <section className="panel mt-8 p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><Tag size={18} /></div><div><p className="eyebrow">Preferências de trabalho</p><h2 className="mt-2 text-xl font-bold text-navy">Atividades que você quer acompanhar</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Selecione quantas quiser. Quando uma nova oportunidade relacionada aparecer, ela poderá ser destacada para você.</p></div></div><label className="relative mt-5 block max-w-[520px]"><span className="sr-only">Pesquisar atividades</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar atividade, como eletricista" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label><div className="mt-4 flex flex-wrap gap-2">{filtered.map((activity) => <label key={activity} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${selected.includes(activity) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" checked={selected.includes(activity)} onChange={() => toggle(activity)} className="sr-only" />{activity}</label>)}</div><div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#637688]">{selected.length ? <><strong className="text-navy">{selected.length}</strong> atividade(s) selecionada(s){matching ? ` · ${matching} oportunidade(s) compatível(is) agora` : ""}</> : "Nenhuma atividade selecionada ainda."}</p><button type="button" className={notifications ? "button-secondary" : "button-primary"} onClick={enableNotifications}><Bell size={16} />{notifications ? "Notificações ativadas" : "Ativar notificações"}</button></div></section>;
}
