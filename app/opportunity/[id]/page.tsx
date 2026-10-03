import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { InteractionAction } from "@/components/InteractionAction";
import { DemoHeader } from "@/components/DemoHeader";
import { OpportunityIcon } from "@/components/OpportunityIcon";
import { VolunteerReminder } from "@/components/VolunteerReminder";
import { opportunityMeta, type OpportunityKind } from "@/lib/domain";
import { findOpportunity } from "@/lib/db";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ kind?: string; returnTo?: string }> };

function safeReturnTo(value?: string) {
  return value && value.startsWith("/demo") && !value.startsWith("//") ? value : "/demo?view=discover";
}

export default async function OpportunityDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { kind: rawKind, returnTo: rawReturnTo } = await searchParams;
  const returnTo = safeReturnTo(rawReturnTo);
  const kind = rawKind as OpportunityKind;
  if (!["formal", "service", "volunteer"].includes(kind)) notFound();
  const record = findOpportunity(id, kind);
  if (!record) notFound();
  const owner = record.owner.name;
  const meta = opportunityMeta[kind];
  const frontLabel = kind === "service" && record.ownerType === "PERSON" ? "Força de trabalho autônoma" : meta.label;
  return (
    <main className="min-h-screen">
      <DemoHeader />
      <div className="shell py-10 sm:py-14">
        <Link href={returnTo} className="button-quiet -ml-3"><ArrowLeft size={16} /> Voltar para oportunidades</Link>
        <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <article>
            <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-blue"><OpportunityIcon kind={kind} /> {frontLabel} <span className="h-1 w-1 rounded-full bg-[#a9bac7]" aria-hidden="true" /> {record.category}</div>
            <h1 className="mt-5 max-w-[800px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">{record.title}</h1>
            <p className="body-copy mt-6 max-w-[760px] text-lg">{record.description}</p>
            <dl className="mt-10 grid max-w-[760px] gap-5 border-y border-line py-6 sm:grid-cols-2">
              <div><dt className="eyebrow">Quem apresenta</dt><dd className="mt-2 font-bold text-navy">{owner}</dd></div>
              <div><dt className="eyebrow">Onde acontece</dt><dd className="mt-2 inline-flex items-center gap-2 font-bold text-navy"><MapPin size={16} className="text-blue" /> {record.location.municipality} · {record.location.district}</dd></div>
              {record.availability && <div><dt className="eyebrow">Disponibilidade</dt><dd className="mt-2 font-bold text-navy">{record.availability}</dd></div>}
              {record.schedule && <div><dt className="eyebrow">Quando</dt><dd className="mt-2 font-bold text-navy">{record.schedule}</dd></div>}
              {record.employmentType && <div><dt className="eyebrow">Vínculo</dt><dd className="mt-2 font-bold text-navy">{record.employmentType === "INTERNSHIP" ? "Estágio" : "CLT"}</dd></div>}
              {kind === "service" && record.requiredActivities?.length ? <div className="sm:col-span-2"><dt className="eyebrow">Atividades autônomas demandadas</dt><dd className="mt-2 flex flex-wrap gap-2">{record.requiredActivities.map((activity) => <span key={activity} className="rounded-full bg-[#edf6fb] px-3 py-1.5 text-sm font-bold text-blue">{activity}</span>)}</dd></div> : null}
            </dl>
            {kind === "volunteer" && record.schedule && <VolunteerReminder opportunityId={record.id} title={record.title} description={record.description} schedule={record.schedule} eventDate={record.eventDate} location={`${record.location.municipality} · ${record.location.district}`} />}
          </article>
          <aside className="panel h-fit p-6 sm:p-7 lg:sticky lg:top-24">
            <p className="eyebrow">Próximo passo</p>
            <h2 className="mt-3 text-xl font-bold tracking-[-.02em] text-navy">{meta.action}</h2>
            <p className="mt-3 text-sm leading-6 text-[#607286]">A ação fica registrada como uma interação da demonstração e ajuda a compor a leitura agregada do território.</p>
            <div className="mt-6 hidden lg:block"><InteractionAction targetId={record.id} kind={kind} ownerId={record.owner.id} /></div>
            <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-[#788995]">Perfil de demonstração · sem contato real ou autenticação de produção.</p>
          </aside>
        </div>
        <div className="detail-mobile-action lg:hidden"><InteractionAction targetId={record.id} kind={kind} ownerId={record.owner.id} /></div>
      </div>
    </main>
  );
}
