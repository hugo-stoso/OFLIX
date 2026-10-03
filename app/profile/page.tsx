"use client";

import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";
import { ProfileIdentityEditor } from "@/components/ProfileIdentityEditor";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; summary: string; capabilities: string; location: { state: string; municipality: string; district: string } };
type PageState = "loading" | "ready" | "error";

const typeMeta: Record<Profile["type"], { label: string; description: string }> = {
  PERSON: { label: "Pessoa trabalhadora", description: "Encontra oportunidades, acompanha atividades de interesse e participa de ações no território." },
  ORGANIZATION: { label: "Organização demandante", description: "Publica vagas, demandas de serviços autônomos e oportunidades para conectar pessoas e iniciativas." },
  INSTITUTIONAL_ANALYST: { label: "Analista institucional", description: "Acompanha sinais agregados e anonimizados para compreender o movimento do território." },
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<PageState>("loading");

  useEffect(() => {
    const selectedId = window.localStorage.getItem("oflix-demo-profile");
    if (!selectedId) { setState("ready"); return; }
    fetch("/api/profiles").then(async (response) => {
      if (!response.ok) throw new Error("profile");
      const profiles = await response.json() as Profile[];
      setProfile(profiles.find((candidate) => candidate.id === selectedId) ?? null);
      setState("ready");
    }).catch(() => setState("error"));
  }, []);

  const capabilities = profile?.capabilities.split(" · ").filter(Boolean) ?? [];

  return <main className="min-h-screen"><DemoHeader /><div className="shell py-8 sm:py-12"><Link href="/demo" className="button-quiet -ml-3"><ArrowLeft size={16} /> Voltar para Início</Link>
    {state === "loading" && <div className="panel mt-8 p-8 text-sm text-[#637688]">Carregando perfil…</div>}
    {state === "error" && <div className="panel mt-8 p-8 text-sm text-[#a34f35]">Não foi possível carregar as informações deste perfil.</div>}
    {state === "ready" && !profile && <section className="panel mx-auto mt-8 max-w-[700px] p-8 text-center"><p className="eyebrow">Perfil de demonstração</p><h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-navy">Escolha um perfil para continuar.</h1><p className="mt-3 text-sm leading-6 text-[#637688]">Esta página usa a persona selecionada no navegador e não representa uma conta autenticada.</p><Link href="/demo" className="button-primary mt-6">Escolher perfil</Link></section>}
    {state === "ready" && profile && <section className="mt-8" aria-labelledby="profile-title"><div className="max-w-[820px]"><p className="eyebrow">Perfil · {typeMeta[profile.type].label}</p><h1 id="profile-title" className="mt-3 text-4xl font-black tracking-[-.045em] text-navy sm:text-5xl">{profile.name}</h1><p className="body-copy mt-5 max-w-[720px] text-lg">{profile.summary}</p></div>
      {profile.type === "PERSON" ? <ProfileIdentityEditor profile={profile} /> : <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><section className="panel p-6 sm:p-7"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><BriefcaseBusiness size={19} /></div><div><p className="eyebrow">Como você participa</p><h2 className="mt-2 text-xl font-bold text-navy">{typeMeta[profile.type].label}</h2></div></div><p className="mt-5 text-sm leading-7 text-[#637688]">{typeMeta[profile.type].description}</p><div className="mt-6 border-t border-line pt-5"><p className="eyebrow">Competências e atuação</p><div className="mt-3 flex flex-wrap gap-2">{capabilities.map((capability) => <span key={capability} className="rounded-full bg-[#edf6fb] px-3 py-1.5 text-sm font-bold text-blue">{capability}</span>)}</div></div></section><section className="panel p-6 sm:p-7"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><MapPin size={19} /></div><div><p className="eyebrow">Território de atuação</p><h2 className="mt-2 text-xl font-bold text-navy">{profile.location.municipality}</h2></div></div><p className="mt-5 text-lg font-bold text-navy">{profile.location.district} · {profile.location.state}</p><p className="mt-2 text-sm leading-7 text-[#637688]">Este recorte é demonstrativo e territorialmente agregado. A plataforma não exibe localização exata de pessoas.</p><div className="mt-6 flex items-start gap-3 border-t border-line pt-5"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#176c61]" /><p className="text-sm leading-6 text-[#637688]">Persona fictícia da demonstração. Dados pessoais e autenticação real não estão ativos nesta versão.</p></div></section></div>}
    </section>}
  </div></main>;
}
