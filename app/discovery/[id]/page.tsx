import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoHeader } from "@/components/DemoHeader";
import { DISCOVERY_KIND_LABELS } from "@/lib/domain";
import { demoDiscoveryItems } from "@/lib/discovery";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string }> };

function safeReturnTo(value?: string) {
  return value && value.startsWith("/demo") && !value.startsWith("//") ? value : "/demo?view=discover";
}

export default async function DiscoveryDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTo: rawReturnTo } = await searchParams;
  const returnTo = safeReturnTo(rawReturnTo);
  const item = demoDiscoveryItems.find((candidate) => candidate.id === id);
  if (!item) notFound();
  return <main className="min-h-screen"><DemoHeader /><div className="shell py-10 sm:py-14">
    <Link href={returnTo} className="button-quiet -ml-3"><ArrowLeft size={16} /> Voltar para Buscar</Link>
    <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article>
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-blue"><span className="discovery-badge discovery-badge-lg">{DISCOVERY_KIND_LABELS[item.kind]}</span><span>{item.category}</span></div>
        <h1 className="mt-5 max-w-[800px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">{item.title}</h1>
        <p className="body-copy mt-6 max-w-[760px] text-lg">{item.description}</p>
        <dl className="mt-10 grid max-w-[760px] gap-5 border-y border-line py-6 sm:grid-cols-2">
          <div><dt className="eyebrow">Quem apresenta</dt><dd className="mt-2 font-bold text-navy">{item.provider}</dd></div>
          <div><dt className="eyebrow">Onde</dt><dd className="mt-2 inline-flex items-center gap-2 font-bold text-navy"><MapPin size={16} className="text-blue" /> {item.location.municipality} · {item.location.state}</dd></div>
          {item.status && <div><dt className="eyebrow">Situação</dt><dd className="mt-2 font-bold text-navy">{item.status}</dd></div>}
          {item.deadline && <div><dt className="eyebrow">Prazo</dt><dd className="mt-2 font-bold text-navy">{item.deadline}</dd></div>}
          {item.officialType && <div><dt className="eyebrow">Classificação</dt><dd className="mt-2 font-bold text-navy">{item.officialType}</dd></div>}
          {item.education && <div><dt className="eyebrow">Escolaridade</dt><dd className="mt-2 font-bold text-navy">{item.education}</dd></div>}
          {item.duration && <div><dt className="eyebrow">Duração</dt><dd className="mt-2 font-bold text-navy">{item.duration}</dd></div>}
          {item.cost && <div><dt className="eyebrow">Investimento</dt><dd className="mt-2 font-bold text-navy">{item.cost}</dd></div>}
          {item.certificate && <div><dt className="eyebrow">Certificação</dt><dd className="mt-2 font-bold text-navy">{item.certificate}</dd></div>}
          {item.positions && <div><dt className="eyebrow">Cargo</dt><dd className="mt-2 font-bold text-navy">{item.positions}</dd></div>}
          {item.vacancies && <div><dt className="eyebrow">Vagas</dt><dd className="mt-2 font-bold text-navy">{item.vacancies}</dd></div>}
          {item.board && <div><dt className="eyebrow">Banca</dt><dd className="mt-2 font-bold text-navy">{item.board}</dd></div>}
          {item.value && <div><dt className="eyebrow">Valor estimado</dt><dd className="mt-2 font-bold text-navy">{item.value}</dd></div>}
          <div><dt className="eyebrow">Fonte</dt><dd className="mt-2 font-bold text-navy">{item.sourceLabel}</dd></div>
        </dl>
        {item.kind === "public_exam" || item.kind === "public_selection" ? <p className="mt-6 rounded-xl border border-[#f1d9a5] bg-[#fff9ed] p-4 text-sm leading-6 text-[#76531c]">Consulte o edital oficial antes de realizar a inscrição. Este registro é DEMO DATA e não substitui o documento oficial.</p> : null}
        {item.kind === "public_procurement" ? <p className="mt-6 rounded-xl border border-[#f1d9a5] bg-[#fff9ed] p-4 text-sm leading-6 text-[#76531c]">Consulte o edital e os requisitos oficiais antes de participar. A OFLIX descobre e organiza a oportunidade; o processo oficial acontece no sistema indicado pelo órgão.</p> : null}
      </article>
      <aside className="panel h-fit p-6 sm:p-7 lg:sticky lg:top-24"><p className="eyebrow">Próximo passo</p><h2 className="mt-3 text-xl font-bold tracking-[-.02em] text-navy">Dados de demonstração</h2><p className="mt-3 text-sm leading-6 text-[#607286]">A origem aparece de forma explícita para não confundir registros externos com resultados operacionais do OFLIX.</p><div className="mt-6"><Link href={returnTo} className="button-primary w-full">Voltar à busca</Link></div><p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-[#788995]">DEMO DATA · nenhum edital, salário, parceria ou autorização real é afirmado.</p>{item.sourceUrl ? <a href={item.sourceUrl} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue hover:underline" target="_blank" rel="noreferrer">Abrir fonte <ExternalLink size={15} /></a> : null}</aside>
    </div>
  </div></main>;
}
