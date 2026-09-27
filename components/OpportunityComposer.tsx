"use client";

import { Plus, Search, Send, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { OpportunityKind } from "@/lib/domain";
import { WORK_ACTIVITIES } from "@/lib/domain";

type Profile = { id: string; name: string; location: { municipality: string; district: string } };
type Opportunity = { id: string; title: string; description: string; category: string; kind: OpportunityKind; owner: { id: string; name: string }; location: { municipality: string; district: string }; employmentType?: "CLT" | "INTERNSHIP"; requiredActivities?: string[] };
type ServiceAlert = { id: string; title: string; activities: string[]; location: string; createdAt: string };

const serviceAlertKey = "oflix-service-opportunity-alerts";

function saveServiceAlert(alert: ServiceAlert) {
  try {
    const current = JSON.parse(window.localStorage.getItem(serviceAlertKey) ?? "[]") as ServiceAlert[];
    window.localStorage.setItem(serviceAlertKey, JSON.stringify([alert, ...current]));
    window.dispatchEvent(new Event("oflix-opportunity-alerts-changed"));
  } catch {
    // O fluxo principal continua disponível mesmo quando o navegador bloqueia o localStorage.
  }
}

export function OpportunityComposer({ profile, onCreated }: { profile: Profile; onCreated: (opportunity: Opportunity) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OpportunityKind>("formal");
  const [employmentType, setEmploymentType] = useState<"CLT" | "INTERNSHIP">("CLT");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [serviceActivities, setServiceActivities] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [sent, setSent] = useState(false);
  const filteredServiceActivities = useMemo(() => WORK_ACTIVITIES.filter((activity) => activity.toLowerCase().includes(serviceQuery.toLowerCase())), [serviceQuery]);

  function toggleServiceActivity(activity: string) {
    setServiceActivities((current) => current.includes(activity) ? current.filter((item) => item !== activity) : [...current, activity]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const activities = kind === "service" ? serviceActivities : [];
    if (!title.trim() || !description.trim() || (kind !== "service" && !category.trim()) || (kind === "service" && !activities.length)) return;
    const opportunity: Opportunity = { id: `local-${Date.now()}`, title: title.trim(), category: kind === "service" ? activities[0] : category.trim(), description: description.trim(), kind, owner: { id: profile.id, name: profile.name }, location: profile.location, ...(kind === "formal" ? { employmentType } : {}), ...(kind === "service" ? { requiredActivities: activities } : {}) };
    onCreated(opportunity);
    if (kind === "service") saveServiceAlert({ id: opportunity.id, title: opportunity.title, activities, location: `${profile.location.municipality} · ${profile.location.district}`, createdAt: new Date().toISOString() });
    setTitle(""); setCategory(""); setDescription(""); setServiceActivities([]); setServiceQuery(""); setSent(true); setOpen(false);
  }

  return <section className="panel p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Para quem demanda trabalho</p><h2 className="mt-2 text-xl font-bold text-navy">Enviar oportunidade</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Publique uma demanda com contexto suficiente para a pessoa candidata avaliar se faz sentido.</p></div><Plus size={20} className="shrink-0 text-blue" /></div>{sent && <p className="mt-4 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 text-sm font-bold text-[#176c61]">Oportunidade criada na demonstração. Ela já aparece em “Minhas oportunidades” e os interesses compatíveis podem ser avisados neste navegador.</p>}{!open ? <button type="button" className="button-primary mt-5" onClick={() => setOpen(true)}><Plus size={16} /> Nova oportunidade</button> : <form className="mt-5 space-y-4" onSubmit={submit}><div className="flex items-center justify-between border-b border-line pb-3"><p className="font-bold text-navy">Detalhes da publicação</p><button type="button" className="button-quiet" onClick={() => setOpen(false)}><X size={15} /> Fechar</button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Frente<select aria-label="Frente" value={kind} onChange={(event) => setKind(event.target.value as OpportunityKind)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="formal">Trabalho formal</option><option value="service">Demanda de serviço autônomo</option><option value="volunteer">Voluntariado</option></select></label>{kind === "formal" ? <label className="text-sm font-bold text-navy">Tipo<select value={employmentType} onChange={(event) => setEmploymentType(event.target.value as "CLT" | "INTERNSHIP")} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="CLT">CLT</option><option value="INTERNSHIP">Estágio</option></select></label> : kind !== "service" ? <label className="text-sm font-bold text-navy">Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Educação" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label> : <div aria-hidden="true" />}</div>{kind === "formal" && <label className="block text-sm font-bold text-navy">Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Operações" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>}{kind === "service" && <fieldset className="rounded-lg border border-line bg-[#f8fbfc] p-4"><legend className="px-1 text-sm font-bold text-navy">Tipos de trabalho autônomo demandados</legend><p className="mt-1 text-sm leading-6 text-[#637688]">Selecione uma ou mais atividades. Trabalhadores que acompanham essas opções poderão receber um aviso sobre a nova demanda.</p><label className="relative mt-3 block"><span className="sr-only">Pesquisar tipos de trabalho autônomo</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Pesquisar tipos de trabalho autônomo" value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} placeholder="Pesquisar atividade" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label><div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Atividades demandadas">{filteredServiceActivities.map((activity) => <label key={activity} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${serviceActivities.includes(activity) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={activity} checked={serviceActivities.includes(activity)} onChange={() => toggleServiceActivity(activity)} />{activity}</label>)}</div><p className="mt-3 text-xs font-semibold text-[#637688]">{serviceActivities.length ? `${serviceActivities.length} atividade(s) selecionada(s)` : "Selecione pelo menos uma atividade."}</p></fieldset>}<label className="block text-sm font-bold text-navy">Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Pessoa assistente de projeto" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="block text-sm font-bold text-navy">Descrição completa<textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Explique rotina, público, local, disponibilidade e próximos passos." className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><button type="submit" className="button-primary"><Send size={16} /> Publicar na demonstração</button></form>}</section>;
}
