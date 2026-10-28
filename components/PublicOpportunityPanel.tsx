"use client";

import { ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import type { DiscoveryItem } from "@/lib/domain";

type Props = { items: DiscoveryItem[]; onExplore: () => void; onRefresh: () => void; loading: boolean; profileLabel: string; fallback?: boolean };

export function PublicOpportunityPanel({ items, onExplore, onRefresh, loading, profileLabel, fallback = false }: Props) {
  const sourceLabel = items.some((item) => item.source === "PNCP") ? "PNCP" : "DEMO DATA";
  const isDemo = sourceLabel === "DEMO DATA";
  return <section className="panel mt-8 p-5 sm:p-6" aria-labelledby="public-opportunities-title"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#fff4df] p-2 text-[#8a5a00]"><ShieldCheck size={18} /></div><div><p className="eyebrow">Para {profileLabel}</p><h2 id="public-opportunities-title" className="mt-2 text-xl font-bold text-navy">Oportunidades com o poder público</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">{isDemo ? "A amostra inicial é DEMO DATA. Consulte o PNCP para carregar licitações reais e links específicos." : `${items.length} licitações reais relacionadas ao seu perfil, vindas do PNCP.`}</p><p className="mt-2 text-xs text-[#718291]">Fonte atual: {sourceLabel}{fallback ? " · fonte live indisponível" : ""}</p>{fallback && <p role="status" className="mt-2 rounded-lg border border-[#f1d9a5] bg-[#fffaf0] p-2 text-xs font-bold text-[#76531c]">DEMO DATA: exemplos fictícios para preservar a demonstração.</p>}</div></div><div className="flex flex-wrap gap-2 sm:justify-end"><button type="button" className="button-quiet shrink-0" onClick={onRefresh} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> {loading ? "Consultando PNCP…" : "Consultar licitações reais"}</button><button type="button" className="button-secondary shrink-0" onClick={onExplore}>Explorar oportunidades <ArrowRight size={15} /></button></div></div></section>;
}
