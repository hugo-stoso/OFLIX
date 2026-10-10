import Link from "next/link";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { DemoHeader } from "@/components/DemoHeader";
import { fetchEmpregAjuOpportunities } from "@/lib/connectors/empregaju";

type Props = { params: Promise<{ source: string; id: string }>; searchParams: Promise<{ returnTo?: string }> };

function safeReturnTo(value?: string) {
  return value && value.startsWith("/demo") && !value.startsWith("//") ? value : "/demo?view=discover&type=employment&origin=external&source=EMPREGAJU";
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parsed);
}

export default async function ExternalJobDetailPage({ params, searchParams }: Props) {
  const { source, id } = await params;
  const { returnTo: rawReturnTo } = await searchParams;
  if (source !== "empregaju" || !/^[A-Za-z0-9_-]+$/u.test(id)) notFound();
  const result = await fetchEmpregAjuOpportunities();
  const item = result.items.find((candidate) => candidate.sourceId === id);
  if (!item) notFound();
  const returnTo = safeReturnTo(rawReturnTo);
  const publishedAt = formatDate(item.publishedAt);
  return <main className="min-h-screen"><DemoHeader /><div className="shell py-10 sm:py-14">
    <Link href={returnTo} className="button-quiet -ml-3"><ArrowLeft size={16} /> Voltar para Buscar</Link>
    <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
      <article>
        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-blue"><span className="discovery-badge discovery-badge-external_job">VAGA EXTERNA</span><span>Emprego</span></div>
        <h1 className="mt-5 max-w-[800px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">{item.title}</h1>
        <p className="body-copy mt-6 max-w-[760px] text-lg">{item.description || "Descrição pública não informada na listagem."}</p>
        <dl className="mt-10 grid max-w-[760px] gap-5 border-y border-line py-6 sm:grid-cols-2">
          <div><dt className="eyebrow">Empresa</dt><dd className="mt-2 font-bold text-navy">{item.company || item.provider}</dd></div>
          <div><dt className="eyebrow">Onde</dt><dd className="mt-2 inline-flex items-center gap-2 font-bold text-navy"><MapPin size={16} className="text-blue" /> {item.location.municipality} · {item.location.state}</dd></div>
          {item.contractType && <div><dt className="eyebrow">Contratação</dt><dd className="mt-2 font-bold text-navy">{item.contractType}</dd></div>}
          {item.modality && <div><dt className="eyebrow">Modalidade</dt><dd className="mt-2 font-bold text-navy">{item.modality}</dd></div>}
          {item.salary && <div><dt className="eyebrow">Remuneração</dt><dd className="mt-2 font-bold text-navy">{item.salary}</dd></div>}
          {item.vacancies && <div><dt className="eyebrow">Vagas</dt><dd className="mt-2 font-bold text-navy">{item.vacancies}</dd></div>}
          {item.education && <div><dt className="eyebrow">Escolaridade</dt><dd className="mt-2 font-bold text-navy">{item.education}</dd></div>}
          {item.pcd && <div><dt className="eyebrow">PcD</dt><dd className="mt-2 font-bold text-navy">{item.pcd === "exclusive" ? "Exclusiva para PcD" : item.pcd === "also_available" ? "Também disponível para PcD" : "Não informado"}</dd></div>}
          {publishedAt && <div><dt className="eyebrow">Publicada em</dt><dd className="mt-2 font-bold text-navy">{publishedAt}</dd></div>}
          <div><dt className="eyebrow">Fonte</dt><dd className="mt-2 font-bold text-navy">EmpregAju</dd></div>
        </dl>
        <section className="mt-8 rounded-2xl border border-[#c9dce8] bg-[#f5fafc] p-5 sm:p-6" aria-labelledby="empregaju-detail-note">
          <h2 id="empregaju-detail-note" className="text-lg font-black text-navy">Detalhes públicos da vaga</h2>
          <p className="mt-3 text-sm leading-6 text-[#607286]">O EmpregAju apresenta informações adicionais em um modal após cadastro. A OFLIX exibe aqui somente os dados públicos disponíveis na listagem, sem replicar dados de candidatos ou áreas autenticadas.</p>
        </section>
      </article>
      <aside className="panel h-fit p-6 sm:p-7 lg:sticky lg:top-24">
        <p className="eyebrow">Próximo passo</p>
        <h2 className="mt-3 text-xl font-bold tracking-[-.02em] text-navy">Continue no EmpregAju</h2>
        <p className="mt-3 text-sm leading-6 text-[#607286]">Esta vaga não possui permalink público individual. Use a fonte oficial para abrir a listagem e o cadastro para candidatura.</p>
        <div className="mt-6 grid gap-2">
          {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="button-secondary w-full justify-center">Abrir EmpregAju <ExternalLink size={16} /></a>}
          {item.applicationUrl && <a href={item.applicationUrl} target="_blank" rel="noreferrer" className="button-primary w-full justify-center">Candidatar-se no EmpregAju <ExternalLink size={16} /></a>}
        </div>
        <p className="mt-5 border-t border-line pt-4 text-xs leading-5 text-[#788995]">Fonte: EmpregAju · ID público {item.sourceId}</p>
      </aside>
    </div>
  </div></main>;
}
