"use client";

import { ArrowRight, Building2, Compass, Landmark, UserRound } from "lucide-react";
import { useState } from "react";
import { organizationKindLabel, type OrganizationKind, type ProfileType } from "@/lib/domain";

type Profile = { id: string; name: string; type: ProfileType; organizationKind?: OrganizationKind; summary: string; capabilities: string; location: { municipality: string; district: string } };

const typeMeta = {
  PERSON: { label: "Pessoa", icon: UserRound, note: "Encontra oportunidades e pode participar de ações." },
  ORGANIZATION: { label: "Organização", icon: Building2, note: "Publica ações, trabalho ou serviços conforme seu tipo." },
  INSTITUTIONAL_ANALYST: { label: "Analista institucional", icon: Compass, note: "Lê sinais agregados para compreender o território." },
};

export function ProfilePicker({ profiles, onSelected }: { profiles: Profile[]; onSelected: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  function select(profile: Profile) {
    setSelected(profile.id);
    window.localStorage.setItem("oflix-demo-profile", profile.id);
    onSelected(profile.id);
  }
  return (
    <div className="mt-8 grid gap-3">
      {profiles.map((profile) => {
        const meta = typeMeta[profile.type];
        const Icon = profile.organizationKind === "PUBLIC_INSTITUTION" ? Landmark : meta.icon;
        const label = profile.type === "ORGANIZATION" ? organizationKindLabel(profile.organizationKind) : meta.label;
        return (
          <button key={profile.id} type="button" onClick={() => select(profile)} className={`group grid gap-4 rounded-panel border bg-white p-5 text-left transition sm:grid-cols-[auto_1fr_auto] sm:items-center ${selected === profile.id ? "border-blue ring-2 ring-[#c9e1ef]" : "border-line hover:border-blue"}`}>
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-mist text-blue"><Icon size={20} /></span>
            <span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold text-navy">{profile.name}</span>
                <span className="text-xs font-bold uppercase tracking-[.1em] text-blue">{label}</span>
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#617487]">{profile.summary}</span>
              <span className="mt-2 block text-xs font-semibold text-[#758795]">{profile.location.municipality} · {profile.location.district} · {profile.capabilities}</span>
            </span>
            <ArrowRight className="hidden text-blue transition group-hover:translate-x-1 sm:block" size={19} />
          </button>
        );
      })}
    </div>
  );
}
