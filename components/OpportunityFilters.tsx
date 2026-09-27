"use client";

import { Filter, Search, X } from "lucide-react";

type Props = { search: string; category: string; municipality: string; employmentType: string; favoritesOnly: boolean; categories: string[]; municipalities: string[]; isFormal: boolean; onSearch: (value: string) => void; onCategory: (value: string) => void; onMunicipality: (value: string) => void; onEmploymentType: (value: string) => void; onFavoritesOnly: (value: boolean) => void; onClear: () => void };

export function OpportunityFilters({ search, category, municipality, employmentType, favoritesOnly, categories, municipalities, isFormal, onSearch, onCategory, onMunicipality, onEmploymentType, onFavoritesOnly, onClear }: Props) {
  const hasFilters = Boolean(search || category || municipality || employmentType !== "ALL" || favoritesOnly);
  return <section className="panel mb-6 p-5 sm:p-6" aria-label="Filtros de oportunidades">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow inline-flex items-center gap-2"><Filter size={14} /> Encontrar oportunidade</p><p className="mt-2 text-sm text-[#637688]">Combine busca, categoria e território para refinar os resultados.</p></div>{hasFilters && <button type="button" className="button-quiet" onClick={onClear}><X size={15} /> Limpar filtros</button>}</div>
    <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="relative block lg:col-span-2"><span className="sr-only">Pesquisar oportunidade</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Pesquisar por título ou descrição" className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label>
      <label><span className="sr-only">Filtrar por categoria</span><select value={category} onChange={(event) => onCategory(event.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todas as categorias</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por município</span><select value={municipality} onChange={(event) => onMunicipality(event.target.value)} className="w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todos os municípios</option>{municipalities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
      {isFormal && <div className="flex flex-wrap gap-2" aria-label="Tipo de contratação"><button type="button" onClick={() => onEmploymentType("ALL")} className={`rounded-full border px-3 py-1.5 font-bold ${employmentType === "ALL" ? "border-navy bg-navy text-white" : "border-line text-[#637688]"}`}>CLT e estágio</button><button type="button" onClick={() => onEmploymentType("CLT")} className={`rounded-full border px-3 py-1.5 font-bold ${employmentType === "CLT" ? "border-navy bg-navy text-white" : "border-line text-[#637688]"}`}>CLT</button><button type="button" onClick={() => onEmploymentType("INTERNSHIP")} className={`rounded-full border px-3 py-1.5 font-bold ${employmentType === "INTERNSHIP" ? "border-navy bg-navy text-white" : "border-line text-[#637688]"}`}>Estágio</button></div>}
      <label className="inline-flex items-center gap-2 font-semibold text-[#637688]"><input type="checkbox" checked={favoritesOnly} onChange={(event) => onFavoritesOnly(event.target.checked)} className="h-4 w-4 accent-[#1d5b8f]" /> Somente favoritos</label>
    </div>
  </section>;
}
