"use client";

import { ChevronDown, FileText, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { type ChangeEvent, type ReactNode, useEffect, useState } from "react";
import { BRAZILIAN_STATES, COURSE_TYPES, EDUCATION_LEVELS, type EducationLevel, type VolunteerInterest, type WorkPreference } from "@/lib/domain";
import { emptyEducation, readProfileArray, readResidence, readTalentRecord, RESIDENCE_KEY, saveTalentRecord, type EducationData, type ResidenceData, type TalentDirectoryRecord } from "@/lib/profile-storage";

type PersonProfile = { id: string; name: string; summary: string; capabilities: string; location: { state: string; municipality: string; district: string } };
type ProfileSection = "formation" | "curriculum" | "talent" | "territory" | null;

function storedArray<T>(key: string, profileId: string, fallback: T[]) {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(`${key}-${profileId}`);
  return stored === null ? fallback : readProfileArray<T>(key, profileId);
}

function ProfileSection({ id, title, description, summary, open, onToggle, children }: { id: string; title: string; description: string; summary: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return <section className={`rounded-2xl border bg-white transition ${open ? "border-[#a9c9dc] shadow-soft" : "border-line"}`}>
    <button type="button" className="flex w-full items-start justify-between gap-4 p-4 text-left sm:p-5" aria-expanded={open} aria-controls={`${id}-content`} onClick={onToggle}>
      <span className="min-w-0"><span className="block text-base font-bold text-navy">{title}</span><span className="mt-1 block text-sm leading-6 text-[#637688]">{description}</span><span className="mt-3 block text-sm font-bold text-blue">{summary}</span></span>
      <ChevronDown size={19} className={`mt-1 shrink-0 text-blue transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-content`} className="border-t border-line px-4 pb-5 pt-4 sm:px-5">{children}</div>}
  </section>;
}

export function ProfileIdentityEditor({ profile }: { profile: PersonProfile }) {
  const [education, setEducation] = useState<EducationData>(emptyEducation);
  const [residence, setResidence] = useState<ResidenceData>({ state: profile.location.state || "SE", municipality: profile.location.municipality });
  const [workPreferences, setWorkPreferences] = useState<WorkPreference[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [volunteerInterests, setVolunteerInterests] = useState<VolunteerInterest[]>([]);
  const [talentVisible, setTalentVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [openSection, setOpenSection] = useState<ProfileSection>(null);

  useEffect(() => {
    const record = readTalentRecord(profile.id);
    setEducation(record ? {
      educationLevel: record.educationLevel ?? "",
      courseTypes: record.courseTypes ?? [],
      courseName: record.courseName ?? "",
      specialization: record.specialization ?? "",
      curriculumFileName: record.curriculumFileName ?? "",
      curriculumDataUrl: record.curriculumDataUrl ?? "",
      curriculumConfirmed: record.curriculumConfirmed ?? false,
    } : emptyEducation);
    setResidence(readResidence(profile.id, { municipality: profile.location.municipality, state: profile.location.state || "SE" }));
    setWorkPreferences(storedArray<WorkPreference>("oflix-work-preferences", profile.id, record?.workPreferences ?? []));
    setActivities(storedArray<string>("oflix-interests", profile.id, record?.activities ?? []));
    setVolunteerInterests(record?.volunteerInterests ?? []);
    setTalentVisible(window.localStorage.getItem(`oflix-talent-bank-visible-${profile.id}`) === "on");
  }, [profile.id, profile.location.municipality, profile.location.state]);

  function saveRecord(nextEducation = education, nextResidence = residence, nextVisible = talentVisible) {
    const current = readTalentRecord(profile.id);
    const record: TalentDirectoryRecord = {
      profileId: profile.id,
      name: profile.name,
      summary: profile.summary,
      capabilities: profile.capabilities,
      location: { ...nextResidence, district: profile.location.district },
      workPreferences,
      activities,
      volunteerInterests,
      visible: nextVisible,
      ...nextEducation,
      updatedAt: new Date().toISOString(),
    };
    if (current && !nextEducation.curriculumDataUrl && current.curriculumDataUrl) {
      record.curriculumDataUrl = current.curriculumDataUrl;
      record.curriculumFileName = current.curriculumFileName;
      record.curriculumConfirmed = current.curriculumConfirmed;
    }
    saveTalentRecord(record);
  }

  function updateEducation(patch: Partial<EducationData>) {
    const next = { ...education, ...patch };
    setEducation(next);
    saveRecord(next);
  }

  function updateResidence(patch: Partial<ResidenceData>) {
    const next = { ...residence, ...patch };
    setResidence(next);
    window.localStorage.setItem(`${RESIDENCE_KEY}-${profile.id}`, JSON.stringify(next));
    saveRecord(education, next);
    window.dispatchEvent(new Event("oflix-profile-territory-changed"));
  }

  function handleCurriculumChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx") && !file.name.toLowerCase().endsWith(".pdf")) {
      setFeedback("Envie o currículo em PDF ou DOCX.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback("O currículo deve ter no máximo 5 MB nesta demonstração.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      updateEducation({ curriculumFileName: file.name, curriculumDataUrl: dataUrl });
      setFeedback(`Currículo anexado: ${file.name}`);
    };
    reader.onerror = () => setFeedback("Não foi possível ler o currículo. Tente anexar o arquivo novamente.");
    reader.readAsDataURL(file);
  }

  function toggleTalentVisibility() {
    const next = !talentVisible;
    if (next && !education.curriculumDataUrl) {
      setFeedback("Anexe um currículo em PDF ou DOCX antes de liberar seu perfil.");
      return;
    }
    setTalentVisible(next);
    window.localStorage.setItem(`oflix-talent-bank-visible-${profile.id}`, next ? "on" : "off");
    saveRecord(education, residence, next);
    setFeedback(next ? "Perfil publicado no banco de talentos desta demonstração." : "Perfil retirado do banco de talentos desta demonstração.");
  }

  const educationSummary = education.educationLevel || education.courseName || education.specialization ? [education.educationLevel, education.courseName].filter(Boolean).join(" · ") || "Formação informada" : "Ainda não informada";
  const curriculumSummary = education.curriculumFileName ? `Arquivo atual · ${education.curriculumFileName}` : "Nenhum currículo anexado";
  const talentSummary = talentVisible ? "Visível para organizações" : "Não publicado";

  return <section className="mt-8" aria-label="Identidade profissional">
    <div className="mb-4 flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><UserRound size={18} /></div><div><p className="eyebrow">Quem você é</p><h2 className="mt-2 text-xl font-bold text-navy">Identidade profissional</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Formação, currículo, território e compartilhamento ficam no seu Perfil. Nada aqui altera suas preferências de descoberta.</p></div></div>
    <div className="space-y-3">
      <section className="rounded-2xl border border-line bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#f3f6f8] p-2 text-blue"><ShieldCheck size={18} /></div><div><h3 className="text-base font-bold text-navy">Resumo profissional</h3><p className="mt-1 text-sm leading-6 text-[#637688]">{profile.summary}</p><div className="mt-3 flex flex-wrap gap-2">{profile.capabilities.split(" · ").filter(Boolean).map((capability) => <span key={capability} className="rounded-full bg-[#edf6fb] px-3 py-1.5 text-xs font-bold text-blue">{capability === "Serviços autônomos" ? "Prestação de serviços" : capability}</span>)}</div></div></div></section>
      <ProfileSection id="profile-formation" title="Formação" description="Escolaridade, curso e especialização" summary={educationSummary} open={openSection === "formation"} onToggle={() => setOpenSection(openSection === "formation" ? null : "formation")}>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Nível de escolaridade<select aria-label="Nível de escolaridade" value={education.educationLevel} onChange={(event) => updateEducation({ educationLevel: event.target.value as EducationLevel | "" })} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="">Selecione o nível</option>{EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label><label className="text-sm font-bold text-navy">Nome do curso<input aria-label="Nome do curso" value={education.courseName} onChange={(event) => updateEducation({ courseName: event.target.value })} placeholder="Ex.: Técnico em eletrotécnica" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label></div><div className="mt-4"><p className="text-sm font-bold text-navy">Tipo de curso</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{COURSE_TYPES.map((courseType) => <label key={courseType} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-[#637688]"><input type="checkbox" aria-label={`Tipo de curso: ${courseType}`} checked={education.courseTypes.includes(courseType)} onChange={() => updateEducation({ courseTypes: education.courseTypes.includes(courseType) ? education.courseTypes.filter((item) => item !== courseType) : [...education.courseTypes, courseType] })} className="h-4 w-4 accent-[#176c61]" />{courseType}</label>)}</div></div><label className="mt-4 block text-sm font-bold text-navy">Especialização ou pós-graduação<input aria-label="Especialização ou pós-graduação" value={education.specialization} onChange={(event) => updateEducation({ specialization: event.target.value })} placeholder="Ex.: Gestão de projetos sociais" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>
      </ProfileSection>
      <ProfileSection id="profile-curriculum" title="Currículo" description="Arquivo original em PDF ou DOCX" summary={curriculumSummary} open={openSection === "curriculum"} onToggle={() => setOpenSection(openSection === "curriculum" ? null : "curriculum")}>
        <div className="rounded-lg border border-[#c9dce8] bg-[#f5fafc] p-4"><div className="flex items-start gap-3"><FileText size={19} className="mt-1 shrink-0 text-blue" /><div><p className="font-bold text-navy">Currículo livre</p><p className="mt-1 text-sm leading-6 text-[#637688]">Anexe seu arquivo original em PDF ou DOCX. O OFLIX preserva o nome do arquivo e não analisa o conteúdo nesta demonstração.</p></div></div><label className="mt-4 block text-sm font-bold text-navy">Substituir ou anexar currículo<input aria-label="Currículo em PDF ou DOCX" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleCurriculumChange} className="mt-2 block w-full rounded-lg border border-line bg-white px-3 py-3 text-sm font-normal text-[#637688]" /></label>{education.curriculumFileName && <p className="mt-2 text-sm font-semibold text-[#176c61]">Arquivo atual: {education.curriculumFileName}</p>}{feedback && <p role="status" className="mt-3 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 text-sm font-semibold text-[#176c61]">{feedback}</p>}</div>
      </ProfileSection>
      <ProfileSection id="profile-talent" title="Banco de talentos" description="Compartilhamento do seu perfil profissional" summary={talentSummary} open={openSection === "talent"} onToggle={() => setOpenSection(openSection === "talent" ? null : "talent")}>
        <p className="text-sm leading-6 text-[#637688]">Permita que organizações encontrem seu resumo, formação, competências, interesses, currículo e território demonstrativo.</p><label className="mt-4 flex cursor-pointer gap-3 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-4"><input type="checkbox" aria-label="Permitir que organizações encontrem meu perfil" checked={talentVisible} onChange={toggleTalentVisibility} className="mt-1 h-4 w-4 accent-[#176c61]" /><span><strong className="block text-sm text-[#176c61]">Permitir que organizações encontrem meu perfil</strong><span className="mt-1 block text-sm leading-6 text-[#356d68]">Você pode desativar a qualquer momento. O arquivo é apenas armazenado nesta demonstração.</span></span></label>{feedback && <p role="status" className="mt-3 text-sm font-semibold text-[#176c61]">{feedback}</p>}
      </ProfileSection>
      <ProfileSection id="profile-territory" title="Território" description="Município, Estado e região de referência" summary={`${residence.municipality} · ${residence.state}`} open={openSection === "territory"} onToggle={() => setOpenSection(openSection === "territory" ? null : "territory")}>
        <p className="text-sm leading-6 text-[#637688]">Informe manualmente o recorte territorial do perfil. A demo não solicita localização exata, mapas ou coordenadas.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Município<input aria-label="Município onde você mora" value={residence.municipality} onChange={(event) => updateResidence({ municipality: event.target.value })} placeholder="Ex.: Aracaju" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="text-sm font-bold text-navy">Estado<select aria-label="Estado onde você mora" value={residence.state} onChange={(event) => updateResidence({ state: event.target.value })} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="">Selecione o Estado</option>{BRAZILIAN_STATES.map((state) => <option key={state.code} value={state.code}>{state.name} ({state.code})</option>)}</select></label></div><p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#718291]"><MapPin size={14} className="text-blue" /> O recorte compartilhado é aproximado: {residence.municipality} · {residence.state}.</p>
      </ProfileSection>
    </div>
  </section>;
}
