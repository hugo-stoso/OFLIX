"use client";

import type { MunicipalityAggregate } from "@/lib/territory";

type SummaryValues = Pick<MunicipalityAggregate, "opportunities" | "formal" | "clt" | "internship" | "services" | "volunteer" | "interactions"> & { categories: { category: string; total: number }[] };

export function MunicipalitySummary({ municipality, values, category, onClear }: { municipality: string | null; values: SummaryValues; category?: string; onClear: () => void }) {
  const isState = !municipality;
  const hasRecords = values.opportunities > 0 || values.interactions > 0;
  const cards = [
    ["Oportunidades", values.opportunities],
    ["Empregos", values.formal],
    ["Prestação de serviços", values.services],
    ["Voluntariado", values.volunteer],
    ["Interações", values.interactions],
  ] as const;
  return <section className="panel p-6 sm:p-8" aria-labelledby="municipality-summary-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="eyebrow">{isState ? "Recorte atual" : "Município selecionado"}</p>
        <h2 id="municipality-summary-title" className="mt-2 text-2xl font-black tracking-[-.035em] text-navy">{municipality ?? "Sergipe"}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#637688]">{isState ? "Visão agregada das oportunidades operacionais e conexões registradas na base da demonstração." : "Este recorte atualiza os indicadores e leituras abaixo sem expor pessoas ou identificadores individuais."}</p>
      </div>
      {!isState ? <button type="button" className="button-secondary" onClick={onClear}>Voltar para Sergipe</button> : <span className="inline-flex items-center rounded-full bg-[#edf6fb] px-3 py-2 text-xs font-bold text-blue">Dados da demonstração</span>}
    </div>
    {!hasRecords && !isState ? <div className="mt-6 rounded-xl border border-dashed border-line bg-[#f8fbfd] p-5"><p className="font-bold text-navy">Este município ainda não possui registros na base desta demonstração.</p><p className="mt-2 text-sm leading-6 text-[#637688]">Isso não significa ausência de oportunidades reais no território.</p></div> : <>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5">{cards.map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-[#f8fbfd] p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#738593]">{label}</p><p className="mt-2 text-2xl font-black tracking-[-.04em] text-navy">{value}</p></div>)}</div>
      <div className="mt-7 grid gap-6 sm:grid-cols-[.8fr_1.2fr]">
        <div><p className="eyebrow">Empregos formais</p><h3 className="mt-2 font-bold text-navy">CLT e estágio</h3><div className="mt-4 flex gap-3 text-sm text-[#637688]"><span><strong className="text-navy">{values.clt}</strong> CLT</span><span><strong className="text-navy">{values.internship}</strong> estágio</span></div></div>
        <div><p className="eyebrow">Campos de atuação</p><h3 className="mt-2 font-bold text-navy">Atividades presentes neste recorte</h3>{values.categories.length ? <div className="mt-3 flex flex-wrap gap-2">{values.categories.slice(0, 8).map((item) => <span key={item.category} className="filter-chip">{item.category} · {item.total}</span>)}</div> : <p className="mt-3 text-sm text-[#637688]">Sem categorias registradas neste município.</p>}{category ? <p className="mt-3 text-xs text-[#718291]">Filtro de atividade: <strong>{category}</strong></p> : null}</div>
      </div>
    </>}
  </section>;
}
