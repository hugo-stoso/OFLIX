"use client";

import { MessageCircle, Search, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { WorkPreference } from "@/lib/domain";

type Talent = { id: string; profileId: string; name: string; summary: string; capabilities: string; opportunityId: string; opportunityTitle: string; category: string; ownerId: string; action: string };
type TalentProfile = { profileId: string; name: string; summary: string; capabilities: string; location: { municipality: string; district: string }; workPreferences: WorkPreference[]; activities: string[]; visible: boolean; updatedAt: string };
const talentDirectoryKey = "oflix-talent-bank-profiles";
const filters: Array<"Todos" | WorkPreference> = ["Todos", "CLT", "Estágio", "Serviços autônomos", "Voluntariado"];

function readDirectory() {
  try { return JSON.parse(window.localStorage.getItem(talentDirectoryKey) ?? "[]") as TalentProfile[]; } catch { return []; }
}

export function TalentBasePanel({ ownerId, talents }: { ownerId: string; talents: Talent[] }) {
  const [directory, setDirectory] = useState<TalentProfile[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [active, setActive] = useState<TalentProfile | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const load = () => setDirectory(readDirectory().filter((profile) => profile.visible));
    load();
    window.addEventListener("oflix-talent-bank-changed", load);
    return () => window.removeEventListener("oflix-talent-bank-changed", load);
  }, []);

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    return directory.filter((candidate) => {
      const matchesFilter = filter === "Todos" || candidate.workPreferences.includes(filter);
      const matchesSearch = !term || `${candidate.name} ${candidate.summary} ${candidate.capabilities} ${candidate.activities.join(" ")} ${candidate.workPreferences.join(" ")} ${candidate.location.municipality}`.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [directory, filter, query]);

  function relevantInterests(profileId: string) {
    return talents.filter((talent) => talent.profileId === profileId && talent.ownerId === ownerId);
  }

  return <section className="panel p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><UserRound size={18} /></div><div><p className="eyebrow">Acesso institucional</p><h2 className="mt-2 text-xl font-bold text-navy">Base de talentos</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Encontre pessoas que autorizaram a divulgação do perfil para organizações. A busca considera competências e interesses, sem eliminar resultados pela distância da vaga.</p></div></div>
    <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="relative min-w-0 flex-1"><span className="sr-only">Pesquisar talentos</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Pesquisar talentos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por nome, competência ou atividade" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label><select aria-label="Filtrar tipo de trabalho" value={filter} onChange={(event) => setFilter(event.target.value as (typeof filters)[number])} className="rounded-lg border border-line bg-white px-3 py-3 text-sm font-bold text-navy"><option value="Todos">Todos os tipos</option>{filters.slice(1).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
    <p className="mt-3 text-xs leading-5 text-[#718291]">{candidates.length} perfil(is) compartilhado(s) · A localização é aproximada e serve apenas como contexto para a conversa.</p>
    {candidates.length ? <div className="mt-6 grid gap-3">{candidates.map((candidate) => { const interests = relevantInterests(candidate.profileId); return <article key={candidate.profileId} className="rounded-lg border border-line p-4"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="font-bold text-navy">{candidate.name}</p><p className="mt-1 text-sm text-[#637688]">{candidate.summary}</p><p className="mt-2 text-sm font-semibold text-navy">{candidate.capabilities}</p><p className="mt-2 text-xs text-[#718291]">{candidate.location.municipality} · {candidate.location.district}</p><div className="mt-3 flex flex-wrap gap-2">{candidate.workPreferences.map((preference) => <span key={preference} className="rounded-full bg-[#edf6fb] px-2 py-1 text-xs font-bold text-blue">{preference}</span>)}{candidate.activities.slice(0, 5).map((activity) => <span key={activity} className="rounded-full bg-[#f3f5f6] px-2 py-1 text-xs font-semibold text-[#637688]">{activity}</span>)}</div>{interests.length > 0 && <p className="mt-3 text-xs text-[#718291]">Já demonstrou interesse em: {interests.slice(0, 2).map((interest) => <span key={interest.id}><strong className="text-navy">{interest.opportunityTitle}</strong>{interest.category !== interest.opportunityTitle ? ` · ${interest.category}` : ""}; </span>)}</p>}</div><button type="button" className="button-secondary shrink-0" onClick={() => { setActive(candidate); setSent(false); }}><MessageCircle size={16} /> Iniciar conversa</button></div>{active?.profileId === candidate.profileId && <div className="mt-4 border-t border-line pt-4"><p className="text-sm font-bold text-navy">Nova conversa com {candidate.name}</p><p className="mt-1 text-xs leading-5 text-[#718291]">A organização inicia a conversa para alinhar remuneração, benefícios, disponibilidade e formato de trabalho.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="rounded-full border border-line px-3 py-2 text-xs font-bold text-[#637688]" onClick={() => setMessage("Olá! Gostaria de conversar sobre a remuneração e o formato desta oportunidade.")}>Negociar remuneração</button><button type="button" className="rounded-full border border-line px-3 py-2 text-xs font-bold text-[#637688]" onClick={() => setMessage("Olá! Podemos conversar sobre benefícios, disponibilidade e próximos passos?")}>Conversar sobre benefícios</button></div><div className="mt-3 flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva uma mensagem sobre o próximo passo" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" /><button type="button" className="button-primary px-3" onClick={() => { if (message.trim()) { setSent(true); setMessage(""); } }} aria-label="Enviar mensagem"><Send size={16} /></button></div>{sent && <p className="mt-2 text-sm font-bold text-[#176c61]">Mensagem enviada na demonstração.</p>}</div>}</article>; })}</div> : <div className="mt-6 rounded-lg border border-dashed border-line p-5 text-sm leading-6 text-[#637688]">Ainda não há perfis compartilhados que correspondam à busca. A publicação é opcional: uma pessoa pode ativar ou desativar essa visibilidade nas próprias preferências.</div>}
  </section>;
}
