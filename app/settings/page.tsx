"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Check, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { DemoHeader } from "@/components/DemoHeader";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const selectedId = window.localStorage.getItem("oflix-demo-profile");
    setProfileId(selectedId);
    setNotifications(selectedId ? window.localStorage.getItem(`oflix-interest-notifications-${selectedId}`) === "on" : false);
  }, []);

  async function updateNotifications(enabled: boolean) {
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    setNotifications(enabled);
    if (profileId) window.localStorage.setItem(`oflix-interest-notifications-${profileId}`, enabled ? "on" : "off");
    setSaved(true);
  }

  return <main className="min-h-screen"><DemoHeader /><div className="shell py-10 sm:py-14"><Link href="/demo" className="button-quiet -ml-3"><ArrowLeft size={16} /> Voltar para oportunidades</Link><section className="mt-9 max-w-[820px]"><p className="eyebrow">Configurações</p><h1 className="mt-3 text-4xl font-black tracking-[-.045em] text-navy sm:text-5xl">Ajuste sua experiência.</h1><p className="body-copy mt-5 max-w-[680px]">Gerencie as preferências desta demonstração. As escolhas ficam salvas apenas neste navegador.</p><div className="mt-10 grid gap-6"><section className="panel p-6 sm:p-7"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><Bell size={19} /></div><div><p className="eyebrow">Notificações</p><h2 className="mt-2 text-xl font-bold text-navy">Oportunidades relacionadas</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Receba avisos quando uma nova demanda de serviço autônomo combinar com as atividades que você acompanha.</p></div></div><label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-[#f8fbfc] p-4"><input type="checkbox" aria-label="Receber avisos de oportunidades relacionadas" checked={notifications} onChange={(event) => void updateNotifications(event.target.checked)} className="mt-1 h-4 w-4 accent-[#1d5b8f]" /><span><strong className="block text-sm text-navy">Receber avisos de novas oportunidades</strong><span className="mt-1 block text-sm leading-6 text-[#637688]">A demonstração destaca demandas compatíveis no seu painel.</span></span></label>{saved && <p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#176c61]"><Check size={16} /> Preferência salva neste navegador.</p>}</section><section className="panel p-6 sm:p-7"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#e8f1f6] p-2 text-blue"><SlidersHorizontal size={19} /></div><div><p className="eyebrow">Sobre esta versão</p><h2 className="mt-2 text-xl font-bold text-navy">Perfil de demonstração</h2><p className="mt-2 text-sm leading-6 text-[#637688]">A seleção de persona não é uma autenticação real. Publicações, preferências e favoritos servem para navegar pelo protótipo do OFLIX.</p><Link href="/profile" className="subtle-link mt-4 inline-flex">Ver meu perfil →</Link></div></div></section></div></section></div></main>;
}
