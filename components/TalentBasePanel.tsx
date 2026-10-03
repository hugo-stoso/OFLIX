"use client";

import { MessageCircle, Search, Send, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { COURSE_TYPES, EDUCATION_LEVELS, type CourseType, type EducationLevel, type WorkPreference } from "@/lib/domain";
import { readTalentDirectory, type TalentDirectoryRecord } from "@/lib/profile-storage";

type Talent = { id: string; profileId: string; name: string; summary: string; capabilities: string; opportunityId: string; opportunityTitle: string; category: string; ownerId: string; action: string };
type TalentProfile = TalentDirectoryRecord;
const workFilters: Array<"Todos" | WorkPreference> = ["Todos", "CLT", "Estágio", "Serviços autônomos", "Voluntariado"];

export function TalentBasePanel({ ownerId, talents }: { ownerId: string; talents: Talent[] }) {
  const [directory, setDirectory] = useState<TalentProfile[]>([]);
  const [query, setQuery] = useState("");
  const [workFilter, setWorkFilter] = useState<(typeof workFilters)[number]>("Todos");
  const [educationFilter, setEducationFilter] = useState<"Todos" | EducationLevel>("Todos");
  const [courseFilter, setCourseFilter] = useState<"Todos" | CourseType>("Todos");
  const [active, setActive] = useState<TalentProfile | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const load = () => setDirectory(readTalentDirectory().filter((profile) => profile.visible));
    load();
    window.addEventListener("oflix-talent-bank-changed", load);
    return () => window.removeEventListener("oflix-talent-bank-changed", load);
  }, []);

  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase();
    return directory.filter((candidate) => {
      const courseTypes = candidate.courseTypes ?? [];
      const matchesWork = workFilter === "Todos" || candidate.workPreferences.includes(workFilter);
      const matchesEducation = educationFilter === "Todos" || candidate.educationLevel === educationFilter;
      const matchesCourse = courseFilter === "Todos" || courseTypes.includes(courseFilter);
      const matchesSearch = !term || `${candidate.name} ${candidate.summary} ${candidate.capabilities} ${candidate.activities.join(" ")} ${(candidate.volunteerInterests ?? []).join(" ")} ${candidate.workPreferences.join(" ")} ${candidate.location.municipality} ${candidate.location.state ?? ""} ${candidate.educationLevel ?? ""} ${courseTypes.join(" ")} ${candidate.courseName ?? ""} ${candidate.specialization ?? ""}`.toLowerCase().includes(term);
      return matchesWork && matchesEducation && matchesCourse && matchesSearch;
    });
  }, [directory, educationFilter, courseFilter, query, workFilter]);

  function relevantInterests(profileId: string) {
    return talents.filter((talent) => talent.profileId === profileId && talent.ownerId === ownerId);
  }

  return <section className="panel p-5 sm:p-6"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><UserRound size={18} /></div><div><p className="eyebrow">Acesso institucional</p><h2 className="mt-2 text-xl font-bold text-navy">Base de talentos</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Encontre pessoas que autorizaram a divulgação do perfil para contratantes. O banco reúne ofertas de trabalho de pessoas interessadas em CLT, estágio, serviços autônomos ou voluntariado, com filtros de formação e curso, sem eliminar resultados pela distância.</p></div></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="relative min-w-0 lg:col-span-2"><span className="sr-only">Pesquisar talentos</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Pesquisar talentos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por nome, competência ou curso" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label><select aria-label="Filtrar tipo de trabalho" value={workFilter} onChange={(event) => setWorkFilter(event.target.value as (typeof workFilters)[number])} className="rounded-lg border border-line bg-white px-3 py-3 text-sm font-bold text-navy"><option value="Todos">Todos os tipos de trabalho</option>{workFilters.slice(1).map((item) => <option key={item} value={item}>{item}</option>)}</select><select aria-label="Filtrar escolaridade" value={educationFilter} onChange={(event) => setEducationFilter(event.target.value as "Todos" | EducationLevel)} className="rounded-lg border border-line bg-white px-3 py-3 text-sm font-bold text-navy"><option value="Todos">Todas as escolaridades</option>{EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select><select aria-label="Filtrar tipo de curso" value={courseFilter} onChange={(event) => setCourseFilter(event.target.value as "Todos" | CourseType)} className="rounded-lg border border-line bg-white px-3 py-3 text-sm font-bold text-navy sm:col-span-2 lg:col-span-2"><option value="Todos">Todos os tipos de curso</option>{COURSE_TYPES.map((courseType) => <option key={courseType} value={courseType}>{courseType}</option>)}</select></div>
    <p className="mt-3 text-xs leading-5 text-[#718291]">{candidates.length} perfil(is) compartilhado(s) · A localização é aproximada e serve apenas como contexto para a conversa.</p>
    {candidates.length ? <div className="mt-6 grid gap-3">{candidates.map((candidate) => { const interests = relevantInterests(candidate.profileId); const courseTypes = candidate.courseTypes ?? []; const volunteerInterests = candidate.volunteerInterests ?? []; return <article key={candidate.profileId} className="rounded-lg border border-line p-4"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="font-bold text-navy">{candidate.name}</p><p className="mt-1 text-sm text-[#637688]">{candidate.summary}</p><p className="mt-2 text-sm font-semibold text-navy">{candidate.capabilities}</p><p className="mt-2 text-xs text-[#718291]">Município: {candidate.location.municipality} · Estado: {candidate.location.state ?? "SE"}</p><p className="mt-1 text-xs text-[#718291]">Região: {candidate.location.district}</p><div className="mt-3 flex flex-wrap gap-2">{candidate.workPreferences.map((preference) => <span key={preference} className="rounded-full bg-[#edf6fb] px-2 py-1 text-xs font-bold text-blue">{preference}</span>)}{candidate.activities.slice(0, 5).map((activity) => <span key={activity} className="rounded-full bg-[#f3f5f6] px-2 py-1 text-xs font-semibold text-[#637688]">{activity}</span>)}</div><div className="mt-3 rounded-lg bg-[#fbfcfd] p-3 text-sm leading-6 text-[#637688]"><p><strong className="text-navy">Escolaridade:</strong> {candidate.educationLevel || "Não informada"}</p>{courseTypes.length > 0 && <p><strong className="text-navy">Tipo de curso:</strong> {courseTypes.join(" · ")}</p>}{candidate.courseName && <p><strong className="text-navy">Curso:</strong> {candidate.courseName}</p>}{candidate.specialization && <p><strong className="text-navy">Especialização/pós-graduação:</strong> {candidate.specialization}</p>}{volunteerInterests.length > 0 && <p><strong className="text-navy">Interesses em voluntariado:</strong> {volunteerInterests.join(" · ")}</p>}{candidate.curriculumDataUrl && <a className="mt-2 inline-flex font-bold text-blue hover:underline" href={candidate.curriculumDataUrl} download={candidate.curriculumFileName || "curriculo-oflix.docx"}>Baixar currículo{candidate.curriculumFileName ? ` · ${candidate.curriculumFileName}` : ""}</a>}</div>{interests.length > 0 && <p className="mt-3 text-xs text-[#718291]">Já demonstrou interesse em: {interests.slice(0, 2).map((interest) => <span key={interest.id}><strong className="text-navy">{interest.opportunityTitle}</strong>{interest.category !== interest.opportunityTitle ? ` · ${interest.category}` : ""}; </span>)}</p>}</div><button type="button" className="button-secondary shrink-0" onClick={() => { setActive(candidate); setSent(false); }}><MessageCircle size={16} /> Iniciar conversa</button></div>{active?.profileId === candidate.profileId && <div className="mt-4 border-t border-line pt-4"><p className="text-sm font-bold text-navy">Nova conversa com {candidate.name}</p><p className="mt-1 text-xs leading-5 text-[#718291]">A organização inicia a conversa para alinhar remuneração, benefícios, disponibilidade e formato de trabalho.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="rounded-full border border-line px-3 py-2 text-xs font-bold text-[#637688]" onClick={() => setMessage("Olá! Gostaria de conversar sobre a remuneração e o formato desta oportunidade.")}>Negociar remuneração</button><button type="button" className="rounded-full border border-line px-3 py-2 text-xs font-bold text-[#637688]" onClick={() => setMessage("Olá! Podemos conversar sobre benefícios, disponibilidade e próximos passos?")}>Conversar sobre benefícios</button></div><div className="mt-3 flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva uma mensagem sobre o próximo passo" className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm" /><button type="button" className="button-primary px-3" onClick={() => { if (message.trim()) { setSent(true); setMessage(""); } }} aria-label="Enviar mensagem"><Send size={16} /></button></div>{sent && <p className="mt-2 text-sm font-bold text-[#176c61]">Mensagem enviada na demonstração.</p>}</div>}</article>; })}</div> : <div className="mt-6 rounded-lg border border-dashed border-line p-5 text-sm leading-6 text-[#637688]">Ainda não há perfis compartilhados que correspondam à busca. A publicação é opcional: uma pessoa pode ativar ou desativar essa visibilidade nas próprias preferências.</div>}
  </section>;
}
