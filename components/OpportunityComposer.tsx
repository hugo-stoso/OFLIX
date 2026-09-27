"use client";

import { Plus, Send, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { OpportunityKind } from "@/lib/domain";

type Profile = { id: string; name: string; location: { municipality: string; district: string } };
type Opportunity = { id: string; title: string; description: string; category: string; kind: OpportunityKind; owner: { id: string; name: string }; location: { municipality: string; district: string }; employmentType?: "CLT" | "INTERNSHIP" };

export function OpportunityComposer({ profile, onCreated }: { profile: Profile; onCreated: (opportunity: Opportunity) => void }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<OpportunityKind>("formal");
  const [employmentType, setEmploymentType] = useState<"CLT" | "INTERNSHIP">("CLT");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !category.trim() || !description.trim()) return;
    const opportunity: Opportunity = { id: `local-${Date.now()}`, title: title.trim(), category: category.trim(), description: description.trim(), kind, owner: { id: profile.id, name: profile.name }, location: profile.location, ...(kind === "formal" ? { employmentType } : {}) };
    onCreated(opportunity);
    setTitle(""); setCategory(""); setDescription(""); setSent(true); setOpen(false);
  }
  return <section className="panel p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Para quem demanda trabalho</p><h2 className="mt-2 text-xl font-bold text-navy">Enviar oportunidade</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Publique uma demanda com contexto suficiente para a pessoa candidata avaliar se faz sentido.</p></div><Plus size={20} className="shrink-0 text-blue" /></div>{sent && <p className="mt-4 rounded-lg border border-[#b7ded5] bg-[#effaf6] p-3 text-sm font-bold text-[#176c61]">Oportunidade criada na demonstração. Ela já aparece em “Minhas oportunidades”.</p>}{!open ? <button type="button" className="button-primary mt-5" onClick={() => setOpen(true)}><Plus size={16} /> Nova oportunidade</button> : <form className="mt-5 space-y-4" onSubmit={submit}><div className="flex items-center justify-between border-b border-line pb-3"><p className="font-bold text-navy">Detalhes da publicação</p><button type="button" className="button-quiet" onClick={() => setOpen(false)}><X size={15} /> Fechar</button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-navy">Frente<select value={kind} onChange={(event) => setKind(event.target.value as OpportunityKind)} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="formal">Trabalho formal</option><option value="service">Serviço autônomo</option><option value="volunteer">Voluntariado</option></select></label>{kind === "formal" ? <label className="text-sm font-bold text-navy">Tipo<select value={employmentType} onChange={(event) => setEmploymentType(event.target.value as "CLT" | "INTERNSHIP")} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal"><option value="CLT">CLT</option><option value="INTERNSHIP">Estágio</option></select></label> : <label className="text-sm font-bold text-navy">Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Educação" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>}</div>{kind === "formal" && <label className="block text-sm font-bold text-navy">Categoria<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Ex.: Operações" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label>}<label className="block text-sm font-bold text-navy">Título<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Pessoa assistente de projeto" className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><label className="block text-sm font-bold text-navy">Descrição completa<textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Explique rotina, público, local, disponibilidade e próximos passos." className="mt-2 w-full resize-y rounded-lg border border-line bg-white px-3 py-3 font-normal" /></label><button type="submit" className="button-primary"><Send size={16} /> Publicar na demonstração</button></form>}</section>;
}
