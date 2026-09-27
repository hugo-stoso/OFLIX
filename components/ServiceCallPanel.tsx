"use client";

import { Bell, CheckCircle2, Clock3, MapPin, Radio, UserRound, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { WORK_ACTIVITIES } from "@/lib/domain";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; capabilities: string };
type ServiceCall = { id: string; title: string; activity: string; description: string; serviceDay: string; timeWindow: string; status: "OPEN" | "ACCEPTED"; requester: { id: string; name: string; type: string }; location: { municipality: string; district: string }; acceptedBy?: { id: string; name: string } };

function storedActivities(profile: Profile) {
  try {
    const selected = JSON.parse(window.localStorage.getItem(`oflix-interests-${profile.id}`) ?? "[]") as string[];
    const fromCapabilities = WORK_ACTIVITIES.filter((activity) => profile.capabilities.toLowerCase().includes(activity.toLowerCase()));
    return Array.from(new Set([...selected, ...fromCapabilities]));
  } catch { return []; }
}

function dayLabel(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(year, month - 1, date));
}

export function ServiceCallPanel({ profile }: { profile: Profile }) {
  const isWorker = profile.type === "PERSON";
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const knownIds = useRef<Set<string> | null>(null);

  const loadCalls = useCallback(async () => {
    const activities = isWorker ? storedActivities(profile) : [];
    const query = new URLSearchParams({ profileId: profile.id });
    if (activities.length) query.set("activities", activities.join(","));
    try {
      const response = await fetch(`/api/service-calls?${query.toString()}`);
      if (!response.ok) throw new Error("service-calls");
      const next = await response.json() as ServiceCall[];
      if (isWorker && notifications && knownIds.current) {
        const newCalls = next.filter((call) => call.status === "OPEN" && !knownIds.current?.has(call.id) && call.requester.id !== profile.id);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") newCalls.forEach((call) => new Notification("Novo chamado compatível", { body: `${call.activity} · ${call.location.municipality}. Quem aceitar primeiro realiza o serviço.` }));
      }
      knownIds.current = new Set(next.map((call) => call.id)); setCalls(next);
    } catch { setFeedback("Não foi possível atualizar os chamados agora."); }
    finally { setLoading(false); }
  }, [isWorker, notifications, profile]);

  useEffect(() => {
    try { setNotifications(window.localStorage.getItem(`oflix-service-call-notifications-${profile.id}`) === "on"); } catch { setNotifications(false); }
    knownIds.current = null; setLoading(true); void loadCalls();
    const onChanged = () => void loadCalls();
    window.addEventListener("oflix-service-calls-changed", onChanged);
    window.addEventListener("oflix-interests-changed", onChanged);
    const interval = window.setInterval(() => void loadCalls(), 15_000);
    return () => { window.removeEventListener("oflix-service-calls-changed", onChanged); window.removeEventListener("oflix-interests-changed", onChanged); window.clearInterval(interval); };
  }, [loadCalls, profile.id]);

  async function enableNotifications() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    const enabled = typeof Notification === "undefined" || Notification.permission === "granted";
    setNotifications(enabled); if (enabled) window.localStorage.setItem(`oflix-service-call-notifications-${profile.id}`, "on");
  }

  async function accept(call: ServiceCall) {
    setBusyId(call.id); setFeedback("");
    try {
      const response = await fetch(`/api/service-calls/${call.id}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workerProfileId: profile.id }) });
      const result = await response.json();
      if (!response.ok) { setFeedback(result.reason === "already_taken" ? "Este chamado acabou de ser aceito por outra pessoa." : "Este chamado não está mais disponível."); return; }
      setFeedback("Chamado aceito. Combine o endereço exato e os detalhes com quem solicitou o serviço.");
      window.dispatchEvent(new Event("oflix-service-calls-changed"));
    } catch { setFeedback("Não foi possível aceitar o chamado."); }
    finally { setBusyId(null); }
  }

  const title = isWorker ? "Chamados compatíveis hoje" : "Minhas solicitações de serviço";
  const description = isWorker ? "Chamadas abertas para as atividades que você acompanha. Quem aceitar primeiro fica responsável pelo atendimento." : "Acompanhe as chamadas abertas pela sua conta e veja quando um autônomo assumir o atendimento.";

  return <section className="panel p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue">{isWorker ? <Radio size={18} /> : <Clock3 size={18} />}</div><div><p className="eyebrow">Atendimento em tempo real da demo</p><h2 className="mt-2 text-xl font-bold text-navy">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">{description}</p></div></div>{isWorker && <button type="button" className={notifications ? "button-secondary mt-4" : "button-quiet mt-4"} onClick={enableNotifications}><Bell size={16} /> {notifications ? "Alertas de chamados ativados" : "Ativar alertas de chamados"}</button>}{feedback && <p className="mt-4 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 text-sm font-bold text-[#176c61]">{feedback}</p>}{loading ? <p className="mt-6 text-sm text-[#637688]">Buscando chamados compatíveis…</p> : calls.length ? <div className="mt-6 grid gap-3">{calls.map((call) => { const ownRequest = call.requester.id === profile.id; return <article key={call.id} className="rounded-lg border border-line p-4"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#edf6fb] px-2 py-1 text-xs font-bold text-blue">{call.activity}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${call.status === "OPEN" ? "bg-[#fff9ec] text-[#775d25]" : "bg-[#effaf6] text-[#176c61]"}`}>{call.status === "OPEN" ? "Aberto" : "Aceito"}</span></div><h3 className="mt-3 font-bold text-navy">{call.title}</h3><p className="mt-2 text-sm leading-6 text-[#637688]">{call.description}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#718291]"><span className="flex items-center gap-1.5"><CalendarIcon /> {dayLabel(call.serviceDay)} · {call.timeWindow}</span><span className="flex items-center gap-1.5"><MapPin size={14} /> {call.location.municipality} · {call.location.district}</span><span className="flex items-center gap-1.5"><UserRound size={14} /> {call.requester.name}</span></div>{call.status === "ACCEPTED" && <p className="mt-3 text-sm font-bold text-[#176c61]"><CheckCircle2 size={16} className="mr-1 inline" />{call.acceptedBy?.id === profile.id ? "Você aceitou este chamado." : `Aceito por ${call.acceptedBy?.name ?? "um autônomo"}.`}</p>}</div>{isWorker && call.status === "OPEN" && !ownRequest && <button type="button" className="button-primary shrink-0" disabled={busyId === call.id} onClick={() => accept(call)}><CheckCircle2 size={16} /> {busyId === call.id ? "Aceitando…" : "Aceitar primeiro"}</button>}{ownRequest && <span className="flex items-center gap-1.5 text-xs font-bold text-[#718291]"><XCircle size={15} /> Sua solicitação</span>}</div></article>; })}</div> : <div className="mt-6 rounded-lg border border-dashed border-line p-5 text-sm leading-6 text-[#637688]">{isWorker ? "Nenhum chamado compatível aberto agora. Mantenha seus alertas ativos e acompanhe as atividades de interesse." : "Você ainda não abriu um chamado de serviço. Quando abrir, o status e a pessoa que aceitar aparecerão aqui."}</div>}</section>;
}

function CalendarIcon() {
  return <span aria-hidden="true">📅</span>;
}
