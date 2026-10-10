import Link from "next/link";
import { ArrowUpRight, ExternalLink, MapPin } from "lucide-react";
import { formatCompensation } from "@/lib/compensation";
import { DISCOVERY_KIND_LABELS, type DiscoveryItem } from "@/lib/domain";

function formatDate(value?: string) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parsed);
}

function withReturnTo(path: string, returnTo?: string) {
  if (!returnTo) return path;
  return `${path}${path.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`;
}

function externalLabel(item: DiscoveryItem) {
  if (item.source === "GO_SERGIPE") return "Ver vaga no GO Sergipe";
  if (item.source === "IEL_SERGIPE") return "Ver vaga no IEL Sergipe";
  if (item.kind === "external_job") return "Ver vaga no site original";
  if (item.kind === "course") return "Ver curso na fonte oficial";
  if (item.kind === "public_exam" || item.kind === "public_selection") return "Ver edital oficial";
  if (item.kind === "public_procurement") return "Ver no portal oficial";
  return "Ver no site oficial";
}

export function DiscoveryRow({ item, reason, returnTo }: { item: DiscoveryItem; reason?: string[]; returnTo?: string }) {
  const isInternal = item.source === "OFLIX";
  const label = DISCOVERY_KIND_LABELS[item.kind];
  const content = <>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold text-[#6b7d8d]">
      <span className={`discovery-badge discovery-badge-${item.kind}`}>{label}</span>
      <span>{item.category}</span>
      {item.modality && <span>{item.modality}</span>}
      {item.demo && <span className="rounded-full bg-[#fff7e8] px-2 py-1 text-[#8a5a00]">Demonstração</span>}
    </div>
    <h3 className="mt-2 text-lg font-bold tracking-[-.02em] text-navy">{item.title}</h3>
    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#607286]">{item.description}</p>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b7d8d]">
      <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {item.location.municipality}{item.kind === "external_job" ? ` · ${item.location.state}` : item.location.district ? ` · ${item.location.district}` : ""}</span>
      <span>{item.provider}</span>
      {item.vacancies && <span>{item.vacancies}</span>}
      {item.salary && <span className="font-bold text-navy">{item.salary}</span>}
      {item.contractType && <span>{item.contractType}</span>}
      {item.education && <span>{item.education}</span>}
      {item.compensation && <span className="font-bold text-navy">{formatCompensation(item.compensation)}</span>}
      {item.pcd === "exclusive" && <span>Vaga exclusiva para PcD</span>}
      {item.pcd === "also_available" && <span>Vaga também para PcD</span>}
      {item.deadline && <span>{item.deadline}</span>}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#718291]">
      <span>Fonte: <strong className="text-navy">{item.sourceLabel}</strong></span>
      {item.updatedAt && <span>Atualizada em {formatDate(item.updatedAt)}</span>}
      {item.lastVerifiedAt && <span>Verificada em {formatDate(item.lastVerifiedAt)}</span>}
    </div>
    {reason?.length ? <details className="mt-3 text-xs text-[#607286]"><summary className="cursor-pointer font-bold text-blue">Por que apareceu para você?</summary><ul className="mt-2 list-disc space-y-1 pl-5">{reason.map((line) => <li key={line}>{line}</li>)}</ul></details> : null}
  </>;
  return <article className="group grid gap-4 border-b border-line py-6 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
    <div className="min-w-0">{content}</div>
    <div className="flex items-center gap-2 sm:justify-end">
      {isInternal ? <Link href={withReturnTo(`/opportunity/${item.id}?kind=${item.kind}`, returnTo)} className="button-secondary w-full whitespace-nowrap sm:w-auto">Ver detalhe <ArrowUpRight size={16} /></Link> : item.source === "EMPREGAJU" && item.sourceId ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end"><Link href={withReturnTo(`/external-jobs/empregaju/${encodeURIComponent(item.sourceId)}`, returnTo)} className="button-secondary w-full whitespace-nowrap sm:w-auto">Ver detalhes <ArrowUpRight size={16} /></Link>{item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="button-quiet w-full whitespace-nowrap sm:w-auto">Abrir EmpregAju <ExternalLink size={14} /></a>}{item.applicationUrl && <a href={item.applicationUrl} target="_blank" rel="noreferrer" className="button-quiet w-full whitespace-nowrap sm:w-auto">Candidatar-se no EmpregAju <ExternalLink size={14} /></a>}</div> : item.sourceUrl && item.source !== "DEMO_DATA" ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end"><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="button-secondary w-full whitespace-nowrap sm:w-auto">{externalLabel(item)} <ExternalLink size={16} /></a>{item.applicationUrl && item.applicationUrl !== item.sourceUrl && <a href={item.applicationUrl} target="_blank" rel="noreferrer" className="button-quiet w-full whitespace-nowrap sm:w-auto">Candidatar-se na fonte <ExternalLink size={14} /></a>}</div> : <Link href={withReturnTo(`/discovery/${item.id}`, returnTo)} className="button-secondary w-full whitespace-nowrap sm:w-auto">Ver detalhe <ArrowUpRight size={16} /></Link>}
    </div>
  </article>;
}
