import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { externalSourceFromParam, fetchExternalJobs, type ExternalJobSourceParam } from "@/lib/connectors/external-jobs";

type Props = { params: Promise<{ source: string; id: string }>; searchParams: Promise<{ returnTo?: string }> };

function safeReturnTo(value?: string) {
  return value && value.startsWith("/demo") && !value.startsWith("//") ? value : "/demo?view=discover";
}

function pcdLabel(item: { pcd?: string; isPcdEligible?: boolean }) {
  if (item.pcd === "exclusive") return "Exclusiva para PcD";
  if (item.pcd === "also_available" || item.isPcdEligible === true) return "Também disponível para PcD";
  return undefined;
}

function JobDetailFields({ item }: { item: Awaited<ReturnType<typeof fetchExternalJobs>>["items"][number] }) {
  const fields = [
    ["Requisitos", item.requirements],
    ["Atividades / responsabilidades", item.responsibilities],
    ["Escolaridade", item.education],
    ["Experiência", item.experience],
    ["Benefícios", item.benefits],
    ["Contratação", item.contractType],
    ["Modalidade", item.modality ?? item.workMode],
    ["Jornada", item.workSchedule],
    ["Remuneração", item.salary],
    ["PcD", pcdLabel(item)],
  ].filter(([, value]) => typeof value === "string" && value.trim());

  if (!fields.length) return null;
  return <section className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-6" aria-labelledby="job-detail-fields-title">
    <p className="eyebrow">Dados publicados pela fonte</p>
    <h2 id="job-detail-fields-title" className="mt-2 text-2xl font-black tracking-[-.03em] text-navy">Detalhes da vaga</h2>
    <dl className="mt-5 grid gap-5 sm:grid-cols-2">
      {fields.map(([label, value]) => <div key={label} className="sm:col-span-2"><dt className="eyebrow">{label}</dt><dd className="mt-2 whitespace-pre-line text-sm leading-6 text-[#637688]">{value}</dd></div>)}
    </dl>
    <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-[#788995]">Os detalhes exibidos são os que estão disponíveis publicamente na fonte consultada. Campo ausente não significa dispensa ou inexistência do requisito.</p>
  </section>;
}

export default async function ExternalJobDetailPage({ params, searchParams }: Props) {
  const { source: rawSource, id } = await params;
  const { returnTo: rawReturnTo } = await searchParams;
  const source = externalSourceFromParam(rawSource);
  if (!source || source === "all") notFound();
  const result = await fetchExternalJobs({ source: source as ExternalJobSourceParam });
  const item = result.items.find((candidate) => candidate.sourceId === id || candidate.id === id);
  if (!item) notFound();
  const returnTo = safeReturnTo(rawReturnTo);

  return <main className="min-h-screen"><div className="shell py-8 sm:py-12">
    <Link href={returnTo} className="button-quiet -ml-3"><ArrowLeft size={16} /> Voltar para Buscar</Link>
    <article className="mt-8 max-w-[980px]">
      <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-blue"><span className="discovery-badge discovery-badge-lg">VAGA EXTERNA</span><span>{item.sourceLabel}</span></div>
      <h1 className="mt-5 text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">{item.title}</h1>
      <p className="body-copy mt-5 max-w-[760px] text-lg">{item.description}</p>
      <dl className="mt-8 grid gap-5 border-y border-line py-6 sm:grid-cols-2">
        <div><dt className="eyebrow">Empresa</dt><dd className="mt-2 font-bold text-navy">{item.company ?? item.provider}</dd></div>
        <div><dt className="eyebrow">Local</dt><dd className="mt-2 inline-flex items-center gap-2 font-bold text-navy"><MapPin size={16} className="text-blue" /> {item.location.municipality} · {item.location.state}</dd></div>
        {item.publishedAt && <div><dt className="eyebrow">Publicada em</dt><dd className="mt-2 font-bold text-navy">{item.publishedAt}</dd></div>}
        {item.deadline && <div><dt className="eyebrow">Prazo informado</dt><dd className="mt-2 font-bold text-navy">{item.deadline}</dd></div>}
        {item.vacancies && <div><dt className="eyebrow">Quantidade publicada</dt><dd className="mt-2 font-bold text-navy">{item.vacancies}</dd></div>}
        <div><dt className="eyebrow">Fonte</dt><dd className="mt-2 font-bold text-navy">{item.sourceLabel}</dd></div>
      </dl>
      <JobDetailFields item={item} />
      <div className="mt-8 flex flex-wrap gap-3">
        {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="button-primary">Abrir publicação original <ExternalLink size={16} /></a>}
        {item.applicationUrl && item.applicationUrl !== item.sourceUrl && <a href={item.applicationUrl} target="_blank" rel="noreferrer" className="button-secondary">Candidatar-se na fonte <ExternalLink size={15} /></a>}
      </div>
    </article>
  </div></main>;
}
