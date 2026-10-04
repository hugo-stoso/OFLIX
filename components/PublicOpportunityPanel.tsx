"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import type { DiscoveryItem } from "@/lib/domain";

type Props = { items: DiscoveryItem[]; onExplore: () => void; profileLabel: string };

export function PublicOpportunityPanel({ items, onExplore, profileLabel }: Props) {
  const sourceLabel = items.some((item) => item.source === "PNCP") ? "PNCP" : "DEMO DATA";
  return <section className="panel mt-8 p-5 sm:p-6" aria-labelledby="public-opportunities-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#fff4df] p-2 text-[#8a5a00]"><ShieldCheck size={18} /></div><div><p className="eyebrow">Para {profileLabel}</p><h2 id="public-opportunities-title" className="mt-2 text-xl font-bold text-navy">Oportunidades com o poder público</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">{items.length ? `${items.length} oportunidades relacionadas ao seu perfil.` : "Há oportunidades públicas disponíveis para este perfil."}</p><p className="mt-2 text-xs text-[#718291]">Fonte: {sourceLabel}</p></div></div><button type="button" className="button-secondary shrink-0" onClick={onExplore}>Explorar oportunidades <ArrowRight size={15} /></button></div></section>;
}
