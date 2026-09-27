"use client";

import { BellRing, CalendarDays, MapPin, Send, Wrench, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { WORK_ACTIVITIES } from "@/lib/domain";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; location: { municipality: string; district: string } };

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function ServiceCallComposer({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState("");
  const [serviceDay, setServiceDay] = useState(localDate);
  const [timeWindow, setTimeWindow] = useState("Agora · até 2 horas");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activity || description.trim().length < 10 || !serviceDay) return;
    setSending(true); setFeedback("");
    try {
      const response = await fetch("/api/service-calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requesterProfileId: profile.id, activity, title: `Chamado de ${activity}`, description: description.trim(), serviceDay, timeWindow }) });
      if (!response.ok) throw new Error("service-call");
      window.dispatchEvent(new Event("oflix-service-calls-changed"));
      setDescription(""); setActivity(""); setServiceDay(localDate()); setTimeWindow("Agora · até 2 horas"); setOpen(false); setFeedback("Chamado aberto. Autônomos compatíveis serão avisados e o primeiro que aceitar ficará responsável.");
    } catch { setFeedback("Não foi possível abrir o chamado. Tente novamente."); }
    finally { setSending(false); }
  }

  return <section className="panel p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Serviço para hoje</p><h2 className="mt-2 text-xl font-bold text-navy">Chamar um autônomo agora</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Informe a atividade, o dia e uma janela de atendimento. Pessoas autônomas compatíveis poderão aceitar o chamado.</p></div><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><BellRing size={19} /></div></div>{feedback && <p className={`mt-4 rounded-lg border p-3 text-sm font-bold ${feedback.startsWith("Chamado") ? "border-[#b7ded5] bg-[#effaf6] text-[#176c61]" : "border-[#ecd9ae] bg-[#fff9ec] text-[#775d25]"}`}>{feedback}</p>}{!open ? <button type="button" className="button-primary mt-5" onClick={() => setOpen(true)}><Wrench size={16} /> Chamar autônomo agora</button> : <form className="mt-5 space-y-4" onSubmit={submit}><div className="flex items-center justify-between border-b border-line pb-3"><p className="font-bold text-navy">Abrir chamado de serviço</p><button type="button" className="button-quiet" onClick={() => setOpen(false)}><X size={15} /> Fechar</button></div><label className="block text-sm font-bold text-navy">Tipo de serviço<select required aria-label="Tipo de serviço" value={activity} onChange={(event) => setActivity(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="">Selecione uma atividade</option>{WORK_ACTIVITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-navy"><span className="flex items-center gap-2"><CalendarDays size={15} /> Dia do atendimento</span><input required type="date" aria-label="Dia do atendimento" min={localDate()} value={serviceDay} onChange={(event) => setServiceDay(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="block text-sm font-bold text-navy">Janela<select aria-label="Janela de atendimento" value={timeWindow} onChange={(event) => setTimeWindow(event.target.value)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option>Agora · até 2 horas</option><option>Hoje · manhã</option><option>Hoje · tarde</option><option>Hoje · noite</option></select></label></div><div className="rounded-lg border border-[#c9dce8] bg-[#f5fafc] p-3 text-sm text-[#637688]"><span className="flex items-center gap-2 font-bold text-navy"><MapPin size={15} /> Local aproximado</span><span className="mt-1 block">{profile.location.municipality} · {profile.location.district}</span><span className="mt-1 block text-xs">O endereço exato deve ser combinado com o autônomo depois da aceitação.</span></div><label className="block text-sm font-bold text-navy">O que precisa ser feito?<textarea required minLength={10} value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Descreva o serviço, materiais envolvidos e qualquer informação importante." className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><button type="submit" className="button-primary" disabled={sending}><Send size={16} /> {sending ? "Abrindo chamado…" : "Notificar autônomos"}</button></form>}</section>;
}
