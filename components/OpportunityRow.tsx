import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { OpportunityKind } from "@/lib/domain";
import { opportunityMeta } from "@/lib/domain";
import { OpportunityIcon } from "@/components/OpportunityIcon";

type Opportunity = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: { municipality: string; district: string };
  owner: { name: string };
};

export function OpportunityRow({ opportunity, kind }: { opportunity: Opportunity; kind: OpportunityKind }) {
  const meta = opportunityMeta[kind];
  const owner = opportunity.owner.name;
  return (
    <article className="group grid gap-4 border-b border-line py-6 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-bold text-[#6b7d8d]">
          <span className="inline-flex items-center gap-2 text-blue"><OpportunityIcon kind={kind} /> {meta.label}</span>
          <span className="h-1 w-1 rounded-full bg-[#a9bac7]" aria-hidden="true" />
          <span>{opportunity.category}</span>
        </div>
        <h3 className="mt-2 text-lg font-bold tracking-[-.02em] text-navy">{opportunity.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#607286]">{opportunity.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6b7d8d]">
          <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {opportunity.location.municipality} · {opportunity.location.district}</span>
          <span>{owner}</span>
        </div>
      </div>
      <Link href={`/opportunity/${opportunity.id}?kind=${kind}`} className="button-secondary w-full whitespace-nowrap sm:w-auto">
        Ver detalhe <ArrowUpRight size={16} />
      </Link>
    </article>
  );
}
