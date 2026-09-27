"use client";

import { Bell, FileText, Search, Tag } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { BRAZILIAN_STATES, COURSE_TYPES, EDUCATION_LEVELS, VOLUNTEER_INTERESTS, WORK_ACTIVITIES, WORK_PREFERENCES, type CourseType, type EducationLevel, type VolunteerInterest, type WorkPreference } from "@/lib/domain";

type Match = { title: string; category: string; requiredActivities?: string[] };
type ServiceAlert = { id: string; title: string; activities: string[]; location: string; createdAt: string };
type PersonProfile = { id: string; name: string; summary: string; capabilities: string; location: { state: string; municipality: string; district: string } };
type EducationData = { educationLevel: EducationLevel | ""; courseTypes: CourseType[]; courseName: string; specialization: string; curriculumFileName: string; curriculumDataUrl: string; curriculumConfirmed: boolean };
type ResidenceData = { state: string; municipality: string };
type TalentDirectoryRecord = EducationData & { profileId: string; name: string; summary: string; capabilities: string; location: { state: string; municipality: string; district: string }; workPreferences: WorkPreference[]; activities: string[]; volunteerInterests: VolunteerInterest[]; visible: boolean; updatedAt: string };
const serviceAlertKey = "oflix-service-opportunity-alerts";
const talentDirectoryKey = "oflix-talent-bank-profiles";
const residenceKey = "oflix-residence";
const emptyEducation: EducationData = { educationLevel: "", courseTypes: [], courseName: "", specialization: "", curriculumFileName: "", curriculumDataUrl: "", curriculumConfirmed: false };

function matchesActivity(activities: string[], selected: string[]) {
  return activities.some((activity) => selected.some((item) => item.toLowerCase() === activity.toLowerCase()));
}

function readDirectory() {
  try { return JSON.parse(window.localStorage.getItem(talentDirectoryKey) ?? "[]") as TalentDirectoryRecord[]; } catch { return []; }
}

export function InterestSelector({ profile, matches }: { profile: PersonProfile; matches: Match[] }) {
  const { id: profileId } = profile;
  const [query, setQuery] = useState("");
  const [volunteerQuery, setVolunteerQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [volunteerInterests, setVolunteerInterests] = useState<VolunteerInterest[]>([]);
  const [workPreferences, setWorkPreferences] = useState<WorkPreference[]>([]);
  const [residence, setResidence] = useState<ResidenceData>({ state: profile.location.state || "SE", municipality: profile.location.municipality });
  const [education, setEducation] = useState<EducationData>(emptyEducation);
  const [talentVisible, setTalentVisible] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [curriculumFeedback, setCurriculumFeedback] = useState("");

  useEffect(() => {
    function loadPreferences() {
      try {
        const record = readDirectory().find((item) => item.profileId === profileId);
        const storedResidence = JSON.parse(window.localStorage.getItem(`${residenceKey}-${profileId}`) ?? "null") as Partial<ResidenceData> | null;
        setSelected(JSON.parse(window.localStorage.getItem(`oflix-interests-${profileId}`) ?? JSON.stringify(record?.activities ?? [])));
        setVolunteerInterests(record?.volunteerInterests ?? []);
        setWorkPreferences(JSON.parse(window.localStorage.getItem(`oflix-work-preferences-${profileId}`) ?? JSON.stringify(record?.workPreferences ?? [])));
        setResidence({ municipality: storedResidence?.municipality ?? record?.location.municipality ?? profile.location.municipality, state: storedResidence?.state ?? record?.location.state ?? profile.location.state ?? "SE" });
        setEducation({
          educationLevel: record?.educationLevel ?? "",
          courseTypes: record?.courseTypes ?? [],
          courseName: record?.courseName ?? "",
          specialization: record?.specialization ?? "",
          curriculumFileName: record?.curriculumFileName ?? "",
          curriculumDataUrl: record?.curriculumDataUrl ?? "",
          curriculumConfirmed: record?.curriculumConfirmed ?? false,
        });
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
  }, [profile.location.district, profile.location.municipality, profile.location.state, profileId]);

  const filtered = useMemo(() => WORK_ACTIVITIES.filter((activity) => activity.toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredVolunteerInterests = useMemo(() => VOLUNTEER_INTERESTS.filter((interest) => interest.toLowerCase().includes(volunteerQuery.toLowerCase())), [volunteerQuery]);
  const matching = matches.filter((match) => matchesActivity(match.requiredActivities?.length ? match.requiredActivities : [match.category], selected)).length;
  const relevantAlerts = alerts.filter((alert) => matchesActivity(alert.activities, selected));

  function saveDirectory(next: Partial<TalentDirectoryRecord> = {}) {
    try {
      const current = readDirectory().filter((record) => record.profileId !== profileId);
      const record: TalentDirectoryRecord = {
        profileId,
        name: profile.name,
        summary: profile.summary,
        capabilities: profile.capabilities,
        location: next.location ?? { ...residence, district: profile.location.district },
        workPreferences: next.workPreferences ?? workPreferences,
        activities: next.activities ?? selected,
        volunteerInterests: next.volunteerInterests ?? volunteerInterests,
        visible: next.visible ?? talentVisible,
        educationLevel: next.educationLevel ?? education.educationLevel,
        courseTypes: next.courseTypes ?? education.courseTypes,
        courseName: next.courseName ?? education.courseName,
        specialization: next.specialization ?? education.specialization,
        curriculumFileName: next.curriculumFileName ?? education.curriculumFileName,
        curriculumDataUrl: next.curriculumDataUrl ?? education.curriculumDataUrl,
        curriculumConfirmed: next.curriculumConfirmed ?? education.curriculumConfirmed,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(talentDirectoryKey, JSON.stringify([...current, record]));
      window.dispatchEvent(new Event("oflix-talent-bank-changed"));
    } catch {
      setCurriculumFeedback("Não foi possível salvar o currículo neste navegador. Tente um arquivo menor.");
    }
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

  function toggleVolunteerInterest(interest: VolunteerInterest) {
    const next = volunteerInterests.includes(interest) ? volunteerInterests.filter((item) => item !== interest) : [...volunteerInterests, interest];
    setVolunteerInterests(next);
    saveDirectory({ volunteerInterests: next });
  }

  function updateResidence(next: Partial<ResidenceData>) {
    const merged = { ...residence, ...next };
    setResidence(merged);
    window.localStorage.setItem(`${residenceKey}-${profileId}`, JSON.stringify(merged));
    saveDirectory({ location: { ...merged, district: profile.location.district } });
  }

  function updateEducation(next: Partial<EducationData>) {
    const merged = { ...education, ...next };
    setEducation(merged);
    saveDirectory(merged);
  }

  function handleCurriculumChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setCurriculumFeedback("Envie o currículo preenchido no formato .docx, usando o modelo indicado.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setCurriculumFeedback("O currículo deve ter no máximo 5 MB nesta demonstração.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      updateEducation({ curriculumFileName: file.name, curriculumDataUrl: dataUrl });
      setCurriculumFeedback(`Currículo anexado: ${file.name}`);
    };
    reader.onerror = () => setCurriculumFeedback("Não foi possível ler o currículo. Tente anexar o arquivo novamente.");
    reader.readAsDataURL(file);
  }

  function toggleCurriculumConfirmation() {
    updateEducation({ curriculumConfirmed: !education.curriculumConfirmed });
  }

  function toggleTalentVisibility() {
    const next = !talentVisible;
    if (next && (!education.curriculumDataUrl || !education.curriculumConfirmed)) {
      setCurriculumFeedback("Anexe um currículo .docx preenchido a partir do modelo indicado e confirme essa informação antes de liberar seu perfil.");
      return;
    }
    setTalentVisible(next); window.localStorage.setItem(`oflix-talent-bank-visible-${profileId}`, next ? "on" : "off");
    saveDirectory({ visible: next });
  }

  async function enableNotifications() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    setNotifications(true); window.localStorage.setItem(`oflix-interest-notifications-${profileId}`, "on");
  }

  return <section className="panel mt-8 p-5 sm:p-6">
    <div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><Tag size={18} /></div><div><p className="eyebrow">Preferências de trabalho</p><h2 className="mt-2 text-xl font-bold text-navy">Atividades que você quer acompanhar</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Selecione quantas quiser. Quando uma nova oportunidade relacionada aparecer, ela poderá ser destacada para você.</p></div></div>
    <fieldset className="mt-5 rounded-lg border border-line bg-[#fbfcfd] p-4"><legend className="px-1 text-sm font-bold text-navy">Frentes de trabalho que você busca</legend><p className="text-sm leading-6 text-[#637688]">Escolha quantas quiser: CLT, estágio, serviços autônomos e voluntariado.</p><div className="mt-3 flex flex-wrap gap-2">{WORK_PREFERENCES.map((preference) => <label key={preference} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${workPreferences.includes(preference) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={preference} checked={workPreferences.includes(preference)} onChange={() => toggleWorkPreference(preference)} className="sr-only" />{preference}</label>)}</div></fieldset>
    <fieldset className="mt-5 rounded-lg border border-line bg-[#fbfcfd] p-4"><legend className="px-1 text-sm font-bold text-navy">Formação e qualificação</legend><p className="text-sm leading-6 text-[#637688]">Essas informações ajudam as instituições a encontrar perfis no banco de talentos.</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Nível de escolaridade<select aria-label="Nível de escolaridade" value={education.educationLevel} onChange={(event) => updateEducation({ educationLevel: event.target.value as EducationLevel | "" })} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="">Selecione o nível</option>{EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></label><label className="text-sm font-bold text-navy">Nome do curso<input aria-label="Nome do curso" value={education.courseName} onChange={(event) => updateEducation({ courseName: event.target.value })} placeholder="Ex.: Técnico em eletrotécnica" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label></div><div className="mt-4"><p className="text-sm font-bold text-navy">Tipo de curso</p><div className="mt-2 grid gap-2 sm:grid-cols-2">{COURSE_TYPES.map((courseType) => <label key={courseType} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-[#637688]"><input type="checkbox" aria-label={`Tipo de curso: ${courseType}`} checked={education.courseTypes.includes(courseType)} onChange={() => updateEducation({ courseTypes: education.courseTypes.includes(courseType) ? education.courseTypes.filter((item) => item !== courseType) : [...education.courseTypes, courseType] })} className="h-4 w-4 accent-[#176c61]" />{courseType}</label>)}</div></div><label className="mt-4 block text-sm font-bold text-navy">Especialização ou pós-graduação<input aria-label="Especialização ou pós-graduação" value={education.specialization} onChange={(event) => updateEducation({ specialization: event.target.value })} placeholder="Ex.: Gestão de projetos sociais" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label></fieldset>
    <section className="mt-5 rounded-lg border border-[#c9dce8] bg-[#f5fafc] p-4"><div className="flex items-start gap-3"><FileText size={19} className="mt-1 shrink-0 text-blue" /><div><h3 className="font-bold text-navy">Currículo no modelo OFLIX</h3><p className="mt-1 text-sm leading-6 text-[#637688]">Para compartilhar seu perfil no banco de talentos, é obrigatório anexar o currículo preenchido a partir do modelo indicado. O arquivo fica disponível para a instituição baixar nesta demonstração.</p><a className="mt-3 inline-flex text-sm font-bold text-blue hover:underline" href="/Modelo_Curriculo.docx" download>Baixar modelo de currículo</a></div></div><label className="mt-4 block text-sm font-bold text-navy">Currículo no modelo OFLIX<input aria-label="Currículo no modelo OFLIX" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleCurriculumChange} className="mt-2 block w-full rounded-lg border border-line bg-white px-3 py-3 text-sm font-normal text-[#637688]" /></label>{education.curriculumFileName && <p className="mt-2 text-sm font-semibold text-[#176c61]">Arquivo anexado: {education.curriculumFileName}</p>}<label className="mt-3 flex items-start gap-2 text-sm leading-6 text-[#637688]"><input type="checkbox" aria-label="Confirmo que estou usando o modelo de currículo OFLIX" checked={education.curriculumConfirmed} onChange={toggleCurriculumConfirmation} className="mt-1 h-4 w-4 accent-[#176c61]" />Confirmo que este currículo foi preenchido usando o modelo indicado.</label>{curriculumFeedback && <p role="status" className="mt-3 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 text-sm font-semibold text-[#176c61]">{curriculumFeedback}</p>}</section>
    <fieldset className="mt-5 rounded-lg border border-line bg-[#fbfcfd] p-4"><legend className="px-1 text-sm font-bold text-navy">Município e Estado onde você mora</legend><p className="text-sm leading-6 text-[#637688]">Informe manualmente o município e o Estado onde mora. O OFLIX não solicita acesso à sua localização, ao Google Maps ou a coordenadas exatas.</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Município<input aria-label="Município onde você mora" value={residence.municipality} onChange={(event) => updateResidence({ municipality: event.target.value })} placeholder="Ex.: Aracaju" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="text-sm font-bold text-navy">Estado<select aria-label="Estado onde você mora" value={residence.state} onChange={(event) => updateResidence({ state: event.target.value })} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="">Selecione o Estado</option>{BRAZILIAN_STATES.map((state) => <option key={state.code} value={state.code}>{state.name} ({state.code})</option>)}</select></label></div></fieldset>
    <label className="mt-4 flex cursor-pointer gap-3 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-4"><input type="checkbox" aria-label="Permitir que instituições encontrem meu perfil" checked={talentVisible} onChange={toggleTalentVisibility} className="mt-1 h-4 w-4 accent-[#176c61]" /><span><strong className="block text-sm text-[#176c61]">Permitir que instituições encontrem meu perfil</strong><span className="mt-1 block text-sm leading-6 text-[#356d68]">Opcional. Contratantes poderão ver seu resumo, formação, competências, interesses, currículo e o município e Estado onde você mora, mesmo sem você ter demonstrado interesse em uma vaga.</span></span></label>
    <fieldset className="mt-5 rounded-lg border border-line bg-[#fbfcfd] p-4"><legend className="px-1 text-sm font-bold text-navy">Atividades de trabalho autônomo</legend><p className="text-sm leading-6 text-[#637688]">Selecione quantas atividades você realiza ou quer acompanhar. Elas ajudam a aproximar você de serviços compatíveis.</p><label className="relative mt-3 block max-w-[520px]"><span className="sr-only">Pesquisar atividades</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Pesquisar atividades" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar atividade, como eletricista" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label><div className="mt-4 flex flex-wrap gap-2">{filtered.map((activity) => <label key={activity} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${selected.includes(activity) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={activity} checked={selected.includes(activity)} onChange={() => toggle(activity)} className="sr-only" />{activity}</label>)}</div><p className="mt-3 text-xs text-[#718291]">{selected.length ? `${selected.length} atividade(s) autônoma(s) selecionada(s).` : "Nenhuma atividade autônoma selecionada ainda."}</p></fieldset>
    <fieldset className="mt-5 rounded-lg border border-line bg-[#fbfcfd] p-4"><legend className="px-1 text-sm font-bold text-navy">Interesses em voluntariado</legend><p className="text-sm leading-6 text-[#637688]">Escolha quantos temas quiser para acompanhar ações voluntárias relacionadas aos seus interesses.</p><label className="relative mt-3 block max-w-[520px]"><span className="sr-only">Pesquisar interesses em voluntariado</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input aria-label="Pesquisar interesses em voluntariado" value={volunteerQuery} onChange={(event) => setVolunteerQuery(event.target.value)} placeholder="Pesquisar tema, como educação ou meio ambiente" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label><div className="mt-4 flex flex-wrap gap-2">{filteredVolunteerInterests.map((interest) => <label key={interest} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-bold transition ${volunteerInterests.includes(interest) ? "border-blue bg-[#edf6fb] text-blue" : "border-line bg-white text-[#637688] hover:border-blue"}`}><input type="checkbox" aria-label={interest} checked={volunteerInterests.includes(interest)} onChange={() => toggleVolunteerInterest(interest)} className="sr-only" />{interest}</label>)}</div><p className="mt-3 text-xs text-[#718291]">{volunteerInterests.length ? `${volunteerInterests.length} interesse(s) em voluntariado selecionado(s).` : "Nenhum interesse em voluntariado selecionado ainda."}</p></fieldset>
    <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm text-[#637688]"><p>{selected.length ? <><strong className="text-navy">{selected.length}</strong> atividade(s) selecionada(s){matching ? ` · ${matching} oportunidade(s) compatível(is) agora` : ""}</> : "Nenhuma atividade selecionada ainda."}</p>{relevantAlerts.length > 0 && <p className="mt-2 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 font-semibold text-[#176c61]">{relevantAlerts.length} nova(s) demanda(s) compatível(is): {relevantAlerts.slice(0, 2).map((alert) => alert.title).join("; ")}{relevantAlerts.length > 2 ? "…" : ""}</p>}</div><button type="button" className={notifications ? "button-secondary" : "button-primary"} onClick={enableNotifications}><Bell size={16} />{notifications ? "Notificações ativadas" : "Ativar notificações"}</button></div>
  </section>;
}
