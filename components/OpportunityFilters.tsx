"use client";

import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import type { DiscoveryFilterKind } from "@/lib/domain";

type Props = {
  filterKind: DiscoveryFilterKind;
  search: string;
  category: string;
  municipality: string;
  modality: string;
  education: string;
  status: string;
  officialType: string;
  favoritesOnly: boolean;
  categories: string[];
  municipalities: string[];
  modalities: string[];
  educations: string[];
  statuses: string[];
  officialTypes: string[];
  onSearch: (value: string) => void;
  onCategory: (value: string) => void;
  onMunicipality: (value: string) => void;
  onModality: (value: string) => void;
  onEducation: (value: string) => void;
  onStatus: (value: string) => void;
  onOfficialType: (value: string) => void;
  onFavoritesOnly: (value: boolean) => void;
  onClear: () => void;
};

export function OpportunityFilters({ filterKind, search, category, municipality, modality, education, status, officialType, favoritesOnly, categories, municipalities, modalities, educations, statuses, officialTypes, onSearch, onCategory, onMunicipality, onModality, onEducation, onStatus, onOfficialType, onFavoritesOnly, onClear }: Props) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const hasFilters = Boolean(search || category || municipality || modality || education || status || officialType || favoritesOnly);
  const showModality = filterKind === "employment" || filterKind === "course";
  const showEducation = filterKind === "employment" || filterKind === "public_exam" || filterKind === "course";
  const showPublicFilters = filterKind === "public_exam" || filterKind === "public_procurement";
  return <section className="panel mb-6 p-4 sm:p-6" aria-label="Filtros de oportunidades">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow inline-flex items-center gap-2"><Search size={14} /> Buscar oportunidades</p><p className="mt-2 hidden text-sm text-[#637688] sm:block">Pesquise por profissão, atividade, título ou descrição.</p></div>{hasFilters && <button type="button" className="button-quiet" onClick={onClear}><X size={15} /> Limpar filtros</button>}</div>
    <div className="mt-4 flex gap-2">
      <label className="relative block min-w-0 flex-1"><span className="sr-only">Pesquisar oportunidade</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7a8b98]" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar profissão, atividade ou oportunidade" className="min-h-11 w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-sm text-navy placeholder:text-[#91a0aa]" /></label>
      <button type="button" className="button-secondary shrink-0 px-3 sm:hidden" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><Filter size={16} /> <span className="sr-only sm:not-sr-only">Filtros</span></button>
    </div>
    <div className={`${filtersOpen ? "mt-4" : "hidden sm:grid sm:mt-4"} gap-3 md:grid-cols-2 lg:grid-cols-4`}>
      <label className="lg:col-span-2"><span className="sr-only">Filtrar por categoria</span><select aria-label="Filtrar por categoria" value={category} onChange={(event) => onCategory(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todas as categorias</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por município</span><select aria-label="Filtrar por município" value={municipality} onChange={(event) => onMunicipality(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todos os municípios</option>{municipalities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      {showModality && <label><span className="sr-only">Filtrar por modalidade</span><select aria-label="Filtrar por modalidade" value={modality} onChange={(event) => onModality(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todas as modalidades</option>{modalities.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      {showEducation && <label><span className="sr-only">Filtrar por escolaridade</span><select aria-label="Filtrar por escolaridade" value={education} onChange={(event) => onEducation(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todas as escolaridades</option>{educations.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      {showPublicFilters && <label><span className="sr-only">Filtrar por situação</span><select aria-label="Filtrar por situação" value={status} onChange={(event) => onStatus(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todas as situações</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      {showPublicFilters && <label><span className="sr-only">Filtrar por tipo oficial</span><select aria-label="Filtrar por tipo oficial" value={officialType} onChange={(event) => onOfficialType(event.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm text-navy"><option value="">Todos os tipos</option>{officialTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      <label className="inline-flex min-h-10 items-center gap-2 font-semibold text-[#637688] lg:col-span-4"><input type="checkbox" checked={favoritesOnly} onChange={(event) => onFavoritesOnly(event.target.checked)} className="h-4 w-4 accent-[#1d5b8f]" /> Somente favoritos</label>
    </div>
    {hasFilters && <div className="mt-3 flex flex-wrap gap-2" aria-label="Filtros ativos">{search && <span className="filter-chip">Busca: {search}</span>}{category && <span className="filter-chip">{category}</span>}{municipality && <span className="filter-chip">{municipality}</span>}{modality && <span className="filter-chip">{modality}</span>}{education && <span className="filter-chip">{education}</span>}{status && <span className="filter-chip">{status}</span>}{officialType && <span className="filter-chip">{officialType}</span>}{favoritesOnly && <span className="filter-chip">Favoritos</span>}</div>}
  </section>;
}
