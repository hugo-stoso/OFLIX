"use client";

import { RefreshCw, ShieldCheck } from "lucide-react";
import { DiscoveryRow } from "@/components/DiscoveryRow";
import type { DiscoveryItem } from "@/lib/domain";

type Props = { items: DiscoveryItem[]; onRefresh: () => void; loading: boolean; error: string; profileLabel: string };

export function PublicOpportunityPanel({ items, onRefresh, loading, error, profileLabel }: Props) {
  const sourceLabel = items.some((item) => item.source === "PNCP") ? "PNCP" : "DEMO DATA";
  return <section className="panel mt-8 p-5 sm:p-6" aria-labelledby="public-opportunities-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#fff4df] p-2 text-[#8a5a00]"><ShieldCheck size={18} /></div><div><p className="eyebrow">Para {profileLabel}</p><h2 id="public-opportunities-title" className="mt-2 text-xl font-bold text-navy">Oportunidades com o poder público</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">Descubra possibilidades de fornecer produtos ou prestar serviços. A participação acontece no portal oficial, não dentro do OFLIX.</p></div></div><button type="button" className="button-secondary shrink-0" onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {loading ? "Atualizando…" : "Atualizar PNCP"}</button></div>{error && <p role="status" className="mt-4 rounded-lg border border-[#f1d9a5] bg-[#fff9ed] p-3 text-sm font-semibold text-[#76531c]">{error}</p>}<p className="mt-4 text-xs leading-5 text-[#718291]">Fonte atual: {sourceLabel}. O conector PNCP consulta somente a API pública oficial, com timeout e fallback.</p><div className="mt-2 divide-y divide-line">{items.length ? items.slice(0, 3).map((item) => <DiscoveryRow key={item.id} item={item} />) : <p className="py-6 text-sm text-[#637688]">Nenhuma oportunidade pública disponível neste recorte.</p>}</div></section>;
}
