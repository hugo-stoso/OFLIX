"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, CircleAlert, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";
import { OpportunityRow } from "@/components/OpportunityRow";
import { ProfilePicker } from "@/components/ProfilePicker";
import type { OpportunityKind } from "@/lib/domain";

type Profile = { id: string; name: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; summary: string; capabilities: string; location: { municipality: string; district: string } };
type Opportunity = { id: string; title: string; description: string; category: string; location: { municipality: string; district: string }; owner: { name: string } };

const tabs: { key: OpportunityKind; label: string }[] = [
  { key: "formal", label: "Trabalho formal" },
  { key: "service", label: "Serviços autônomos" },
  { key: "volunteer", label: "Voluntariado" },
];

export default function DemoPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Record<OpportunityKind, Opportunity[]>>({ formal: [], service: [], volunteer: [] });
  const [activeTab, setActiveTab] = useState<OpportunityKind>("formal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("oflix-demo-profile");
    if (stored) setSelectedId(stored);
    Promise.all([fetch("/api/profiles"), fetch("/api/opportunities")])
      .then(async ([profileResponse, opportunityResponse]) => {
        if (!profileResponse.ok || !opportunityResponse.ok) throw new Error("request");
        const [profileData, opportunityData] = await Promise.all([profileResponse.json(), opportunityResponse.json()]);
        setProfiles(profileData);
        setOpportunities({ formal: opportunityData.formal, service: opportunityData.services, volunteer: opportunityData.volunteer });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === selectedId) ?? null, [profiles, selectedId]);
  const visible = opportunities[activeTab];

  function chooseProfile(id: string) {
    setSelectedId(id);
    const profile = profiles.find((candidate) => candidate.id === id);
    if (profile?.type === "INSTITUTIONAL_ANALYST") window.location.href = "/demo/analyst";
  }

  return (
    <main className="min-h-screen">
      <DemoHeader />
      <div className="shell py-10 sm:py-14">
        {loading ? (
          <div className="panel flex min-h-[360px] items-center justify-center"><Loader2 className="animate-spin text-blue" size={24} aria-label="Carregando" /></div>
        ) : error ? (
          <div className="panel flex min-h-[360px] flex-col items-center justify-center p-8 text-center"><CircleAlert className="text-amber" /><h1 className="mt-4 text-xl font-bold text-navy">A demonstração não carregou</h1><p className="mt-2 text-sm text-[#607286]">Verifique se o banco foi preparado e tente novamente.</p><button className="button-secondary mt-5" onClick={() => window.location.reload()}><RefreshCw size={16} /> Tentar novamente</button></div>
        ) : !selectedProfile ? (
          <section className="mx-auto max-w-[820px]">
            <p className="eyebrow">Perfil de demonstração</p>
            <h1 className="mt-4 max-w-[690px] text-4xl font-black leading-tight tracking-[-.045em] text-navy sm:text-5xl">Escolha uma perspectiva para entrar.</h1>
            <p className="body-copy mt-5 max-w-[650px]">Esta seleção muda a experiência apresentada durante a navegação. São personas fictícias: não é autenticação de produção.</p>
            <ProfilePicker profiles={profiles} onSelected={chooseProfile} />
          </section>
        ) : (
          <section>
            <div className="flex flex-col justify-between gap-7 border-b border-line pb-8 lg:flex-row lg:items-end">
              <div>
                <p className="eyebrow">Explorar oportunidades</p>
                <h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-navy sm:text-5xl">O que está se movendo perto de você.</h1>
                <p className="body-copy mt-4 max-w-[680px]">Uma primeira leitura da oferta presente no OFLIX, organizada por frente e território.</p>
              </div>
              <div className="flex flex-col items-start gap-2 text-sm text-[#607286] lg:items-end">
                <span className="font-bold text-navy">{selectedProfile.name}</span>
                <button className="subtle-link" onClick={() => { window.localStorage.removeItem("oflix-demo-profile"); setSelectedId(null); }}>Trocar perfil</button>
              </div>
            </div>
            <nav className="mt-8 flex max-w-full gap-1 overflow-x-auto border-b border-line" aria-label="Frentes da plataforma">
              {tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`whitespace-nowrap border-b-2 px-4 pb-3 text-sm font-bold transition first:pl-0 ${activeTab === tab.key ? "border-blue text-blue" : "border-transparent text-[#718291] hover:text-navy"}`}>{tab.label}<span className="ml-2 text-xs font-normal text-[#8a9aa7]">{opportunities[tab.key].length}</span></button>)}
            </nav>
            <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="panel px-5 sm:px-8">
                {visible.length ? visible.map((opportunity) => <OpportunityRow key={opportunity.id} opportunity={opportunity} kind={activeTab} />) : <div className="py-16 text-center"><p className="font-bold text-navy">Nenhuma oportunidade nesta frente ainda.</p><p className="mt-2 text-sm text-[#607286]">O próximo passo é abrir o fluxo de publicação.</p></div>}
              </div>
              <aside className="h-fit border-l-2 border-[#c9dce8] pl-5 lg:mt-2">
                <p className="eyebrow">Como ler esta tela</p>
                <p className="mt-3 text-sm leading-6 text-[#607286]">As oportunidades vêm da camada de persistência local. Ao abrir um item, a ação disponível muda conforme a frente.</p>
                <Link href="/demo/analyst" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue hover:underline"><BarChart3 size={16} /> Ver visão territorial <ArrowRight size={15} /></Link>
              </aside>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
