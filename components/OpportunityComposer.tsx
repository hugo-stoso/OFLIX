"use client";

import { Plus, Search, Send, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { compensationKindForEmploymentType, validateCompensation, type Compensation } from "@/lib/compensation";
import { canPublishFormal, canPublishServiceDemand, canPublishVolunteer, type OpportunityKind, type OrganizationKind, WORK_ACTIVITIES } from "@/lib/domain";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; organizationKind?: OrganizationKind; location: { municipality: string; district: string } };
type Opportunity = { id: string; title: string; description: string; category: string; kind: OpportunityKind; owner: { id: string; name: string }; ownerType: Profile["type"]; location: { municipality: string; district: string }; employmentType?: "CLT" | "INTERNSHIP"; compensation?: Compensation; requiredActivities?: string[]; schedule?: string; eventDate?: string; requirements?: string; desiredVolunteers?: number; institutionalGuidance?: string };

function saveServiceAlert(opportunity: Opportunity, activities: string[]) {
  try {
    const key = "oflix-service-opportunity-alerts";
    const current = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
    window.localStorage.setItem(key, JSON.stringify([{ id: opportunity.id, title: opportunity.title, activities, location: `${opportunity.location.municipality} · ${opportunity.location.district}`, createdAt: new Date().toISOString() }, ...current]));
    window.dispatchEvent(new Event("oflix-opportunity-alerts-changed"));
  } catch { /* O fluxo segue disponível sem alertas locais. */ }
}

export function OpportunityComposer({ profile, initialKind, onCreated }: { profile: Profile; initialKind?: OpportunityKind; onCreated: (opportunity: Opportunity) => void }) {
  const workerMode = profile.type === "PERSON";
  const availableKinds = useMemo<OpportunityKind[]>(() => workerMode ? ["service"] : [
    ...(canPublishFormal(profile) ? ["formal" as const] : []),
    ...(canPublishServiceDemand(profile) ? ["service" as const] : []),
    ...(canPublishVolunteer(profile) ? ["volunteer" as const] : []),
  ], [profile, workerMode]);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OpportunityKind>(initialKind && availableKinds.includes(initialKind) ? initialKind : availableKinds[0] ?? "volunteer");
  const [employmentType, setEmploymentType] = useState<"CLT" | "INTERNSHIP">("CLT");
  const [compensationMode, setCompensationMode] = useState<"none" | "exact" | "range">("none");
  const [compensationMin, setCompensationMin] = useState("");
  const [compensationMax, setCompensationMax] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [serviceActivities, setServiceActivities] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [schedule, setSchedule] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [requirements, setRequirements] = useState("");
  const [desiredVolunteers, setDesiredVolunteers] = useState("");
  const [institutionalGuidance, setInstitutionalGuidance] = useState("");
  const [sent, setSent] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const filteredServiceActivities = useMemo(() => WORK_ACTIVITIES.filter((activity) => activity.toLowerCase().includes(serviceQuery.toLowerCase())), [serviceQuery]);
  const volunteerMode = kind === "volunteer";

  function toggleServiceActivity(activity: string) { setServiceActivities((current) => current.includes(activity) ? current.filter((item) => item !== activity) : [...current, activity]); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const activities = kind === "service" ? serviceActivities : [];
    if (!title.trim() || !description.trim() || (kind !== "service" && !category.trim()) || (kind === "service" && !activities.length)) return;
    const compensationResult = kind === "formal" && compensationMode !== "none" ? validateCompensation({ min: compensationMin, max: compensationMode === "range" ? compensationMax : undefined, kind: compensationKindForEmploymentType(employmentType) }) : { compensation: undefined };
    if (compensationResult.error) { setError(compensationResult.error); return; }
    setSending(true); setError("");
    try {
      const body = { ownerProfileId: profile.id, kind, title: title.trim(), category: kind === "service" ? activities[0] : category.trim(), description: description.trim(), employmentType: kind === "formal" ? employmentType : undefined, compensation: kind === "formal" ? compensationResult.compensation : undefined, requiredActivities: kind === "service" ? activities : undefined, schedule: schedule.trim() || undefined, eventDate: kind === "volunteer" ? eventDate || undefined : undefined, requirements: kind === "volunteer" ? requirements.trim() || undefined : undefined, desiredVolunteers: kind === "volunteer" && desiredVolunteers ? Number(desiredVolunteers) : undefined, institutionalGuidance: kind === "volunteer" ? institutionalGuidance.trim() || undefined : undefined };
      const response = await fetch("/api/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      const opportunity = data.opportunity ?? data;
      if (!response.ok || !opportunity?.id) throw new Error(data.error ?? "Não foi possível publicar agora.");
      onCreated(opportunity as Opportunity);
      if (kind === "service" && !workerMode) saveServiceAlert(opportunity as Opportunity, activities);
      setTitle(""); setCategory(""); setDescription(""); setServiceActivities([]); setServiceQuery(""); setSchedule(""); setEventDate(""); setRequirements(""); setDesiredVolunteers(""); setInstitutionalGuidance(""); setCompensationMode("none"); setCompensationMin(""); setCompensationMax(""); setSent(volunteerMode ? "Ação voluntária criada e disponível para inscrições." : "Publicação criada na demonstração."); setOpen(false);
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Não foi possível publicar agora."); }
    finally { setSending(false); }
  }

  if (!availableKinds.length) return null;
  const activityLegend = workerMode ? "Atividades que você oferece" : "Atividades necessárias";
  const activityDescription = workerMode ? "Selecione as atividades que você realiza. Esta oferta de serviço aparecerá para contratantes." : "Selecione as atividades necessárias. Pessoas compatíveis poderão encontrar esta demanda de serviço.";
  return <section className="panel p-5 sm:p-6">
    <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">{workerMode ? "Pessoa que oferece um serviço" : volunteerMode ? "Ação voluntária" : "Publicação territorial"}</p><h2 className="mt-2 text-xl font-bold text-navy">{workerMode ? "Oferecer um serviço" : volunteerMode ? "Mobilizar pessoas para uma ação" : "Publicar uma oportunidade"}</h2><p className="mt-2 text-sm leading-6 text-[#637688]">{workerMode ? "Apresente as atividades, disponibilidade e condições do serviço que você pode realizar." : volunteerMode ? "Descreva uma ação específica, seus requisitos e como a equipe vai orientar as pessoas." : "Publique uma demanda com contexto suficiente para a pessoa avaliar se faz sentido."}</p></div><Plus size={20} className="shrink-0 text-blue" /></div>
    {sent && <p className="mt-4 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 text-sm font-bold text-[#176c61]">{sent}</p>}{error && <p role="alert" className="mt-4 rounded-lg border border-[#edc8bd] bg-[#fff3ef] p-3 text-sm font-bold text-[#a34f35]">{error}</p>}
    {!open ? <button type="button" className="button-primary mt-5" onClick={() => setOpen(true)}><Plus size={16} /> {workerMode ? "Nova oferta" : volunteerMode ? "Nova ação voluntária" : "Nova publicação"}</button> : <form className="mt-5 space-y-4" onSubmit={submit}>
      <div className="flex items-center justify-between border-b border-line pb-3"><p className="font-bold text-navy">Detalhes da publicação</p><button type="button" className="button-quiet" onClick={() => setOpen(false)}><X size={15} /> Fechar</button></div>
      {workerMode ? <div className="rounded-lg border border-[#c9dce8] bg-[#f5fafc] p-4"><p className="eyebrow">Tipo de publicação</p><p className="mt-2 text-sm font-bold text-navy">Oferta de serviço</p></div> : <label className="block text-sm font-bold text-navy">Frente<select aria-label="Frente" value={kind} onChange={(event) => setKind(event.target.value as OpportunityKind)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal">{availableKinds.map((option) => <option key={option} value={option}>{option === "formal" ? "Trabalho formal" : option === "service" ? "Demanda de serviço" : "Ação voluntária"}</option>)}</select></label>}
      {kind === "formal" && <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Tipo<select value={employmentType} onChange={(event) => setEmploymentType(event.target.value as "CLT" | "INTERNSHIP")} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="CLT">CLT</option><option value="INTERNSHIP">Estágio</option></select></label><label className="text-sm font-bold text-navy">Categoria<input required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Operações" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label></div>}
      {!workerMode && kind === "formal" && <fieldset className="rounded-lg border border-line bg-[#f8fbfc] p-4"><legend className="px-1 text-sm font-bold text-navy">{employmentType === "INTERNSHIP" ? "Bolsa / remuneração de estágio" : "Remuneração mensal"}</legend><label className="block text-sm font-bold text-navy">Como deseja divulgar?<select aria-label="Como deseja divulgar a remuneração" value={compensationMode} onChange={(event) => setCompensationMode(event.target.value as "none" | "exact" | "range")} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="none">Não informar remuneração</option><option value="exact">Valor exato</option><option value="range">Faixa salarial</option></select></label>{compensationMode !== "none" && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-navy">{compensationMode === "range" ? "De" : "Valor"}<input aria-label={compensationMode === "range" ? "Remuneração mínima" : "Remuneração"} type="number" min="0.01" step="0.01" value={compensationMin} onChange={(event) => setCompensationMin(event.target.value)} placeholder="2400" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>{compensationMode === "range" && <label className="text-sm font-bold text-navy">Até<input aria-label="Remuneração máxima" type="number" min="0.01" step="0.01" value={compensationMax} onChange={(event) => setCompensationMax(event.target.value)} placeholder="2800" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>}</div>}<p className="mt-3 text-xs leading-5 text-[#637688]">Campos vazios não viram zero. A OFLIX aceita BRL e periodicidade mensal nesta demonstração.</p></fieldset>}
      {kind === "volunteer" && <label className="block text-sm font-bold text-navy">Categoria<input required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Educação e leitura" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>}
      {(workerMode || kind === "service") && <fieldset className="rounded-lg border border-line bg-[#f8fbfc] p-4"><legend className="px-1 text-sm font-bold text-navy">{activityLegend}</legend><p className="mt-1 text-sm leading-6 text-[#637688]">{activityDescription}</p><label className="relative mt-3 block"><span className="sr-only">Pesquisar atividades</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Pesquisar atividades para publicação" value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} placeholder="Pesquisar atividade" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm" /></label><div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label={workerMode ? "Atividades oferecidas" : "Atividades demandadas"}>{filteredServiceActivities.map((activity) => <label key={activity} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition ${serviceActivities.includes(activity) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688]"}`}><input type="checkbox" aria-label={activity} checked={serviceActivities.includes(activity)} onChange={() => toggleServiceActivity(activity)} />{activity}</label>)}</div></fieldset>}
      {volunteerMode && <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Data da ação<input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="text-sm font-bold text-navy">Horário / escala<input value={schedule} onChange={(event) => setSchedule(event.target.value)} placeholder="Ex.: sábado, 9h às 12h" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label></div>}
      {volunteerMode && <><label className="block text-sm font-bold text-navy">Quantas pessoas você deseja mobilizar?<input type="number" min="1" max="1000" value={desiredVolunteers} onChange={(event) => setDesiredVolunteers(event.target.value)} placeholder="Ex.: 10" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="block text-sm font-bold text-navy">Requisitos práticos<textarea value={requirements} onChange={(event) => setRequirements(event.target.value)} rows={2} placeholder="Ex.: pontualidade, escuta e disposição para seguir orientação" className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="block text-sm font-bold text-navy">Orientação institucional<textarea value={institutionalGuidance} onChange={(event) => setInstitutionalGuidance(event.target.value)} rows={2} placeholder="Como a equipe vai acolher e orientar as pessoas?" className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label></>}
      {!workerMode && kind === "service" && <label className="block text-sm font-bold text-navy">Quando precisa do serviço?<input value={schedule} onChange={(event) => setSchedule(event.target.value)} placeholder="Ex.: atendimento remoto ou em Aracaju" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>}
      <label className="block text-sm font-bold text-navy">Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={volunteerMode ? "Ex.: Apoio a uma ação de leitura" : kind === "service" ? "Ex.: Instalação elétrica residencial" : "Ex.: Pessoa assistente de projeto"} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="block text-sm font-bold text-navy">{kind === "service" ? "Descreva o serviço necessário" : "Descrição completa"}<textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder={kind === "service" ? "Explique a atividade, o contexto, o local e os próximos passos." : "Explique rotina, público, local, disponibilidade e próximos passos."} className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><button type="submit" className="button-primary" disabled={sending}><Send size={16} /> {sending ? "Publicando…" : volunteerMode ? "Publicar ação" : workerMode ? "Publicar oferta de serviço" : kind === "service" ? "Publicar demanda de serviço" : "Publicar oportunidade"}</button>
    </form>}
  </section>;
}
