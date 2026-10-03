"use client";

import { ArrowRight, Clock3, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { WORK_ACTIVITIES } from "@/lib/domain";

type Profile = { id: string; type: "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST"; capabilities: string };
type ServiceCall = { id: string; status: "OPEN" | "ACCEPTED"; requester: { id: string } };

function storedActivities(profile: Profile) {
  try {
    const selected = JSON.parse(window.localStorage.getItem(`oflix-interests-${profile.id}`) ?? "[]") as string[];
    const fromCapabilities = WORK_ACTIVITIES.filter((activity) => profile.capabilities.toLowerCase().includes(activity.toLowerCase()));
    return Array.from(new Set([...selected, ...fromCapabilities]));
  } catch {
    return [];
  }
}

export function ServiceCallTeaser({ profile, onOpen }: { profile: Profile; onOpen: () => void }) {
  const [compatibleCount, setCompatibleCount] = useState<number | null>(null);
  const isAutonomous = profile.type === "PERSON" && profile.capabilities.toLowerCase().includes("serviços autônomos");

  useEffect(() => {
    if (!isAutonomous) return;
    let cancelled = false;
    const activities = storedActivities(profile);
    const query = new URLSearchParams({ profileId: profile.id });
    if (activities.length) query.set("activities", activities.join(","));
    fetch(`/api/service-calls?${query.toString()}`).then((response) => response.ok ? response.json() as Promise<ServiceCall[]> : Promise.reject(new Error("request"))).then((calls) => {
      if (!cancelled) setCompatibleCount(calls.filter((call) => call.status === "OPEN" && call.requester.id !== profile.id).length);
    }).catch(() => { if (!cancelled) setCompatibleCount(null); });
    return () => { cancelled = true; };
  }, [isAutonomous, profile]);

  return <section className="panel mt-8 border-[#c9dce8] bg-[#f5fafc] p-5 sm:p-6" aria-labelledby="service-teaser-title"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Serviço para hoje</p><h2 id="service-teaser-title" className="mt-2 text-xl font-bold text-navy">{isAutonomous && compatibleCount ? `${compatibleCount} chamado(s) compatível(is) hoje` : "Precisa de alguém hoje?"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#637688]">{isAutonomous && compatibleCount ? "Chamados abertos para atividades que você acompanha." : "Abra um chamado para profissionais da região ou acompanhe solicitações compatíveis."}</p></div><div className="rounded-lg bg-white p-2 text-blue"><Clock3 size={19} /></div></div><button type="button" className="button-secondary mt-5" onClick={onOpen}><Wrench size={16} /> {isAutonomous && compatibleCount ? "Ver chamados" : "Serviço para hoje"} <ArrowRight size={15} /></button></section>;
}
