"use client";

import Link from "next/link";
import { ChevronDown, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Brand } from "@/components/Brand";

type Profile = { id: string; name: string; type: string; location: { municipality: string; district: string } };

export function DemoHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const selectedId = window.localStorage.getItem("oflix-demo-profile");
    if (!selectedId) return;
    fetch("/api/profiles").then((response) => response.json()).then((profiles: Profile[]) => {
      setProfile(profiles.find((candidate) => candidate.id === selectedId) ?? null);
    }).catch(() => setProfile(null));
  }, []);

  return (
    <header className="border-b border-line bg-white">
      <div className="shell flex min-h-[72px] items-center justify-between gap-4">
        <Brand compact />
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 text-xs text-[#637688] sm:flex">
            <MapPin size={14} className="text-blue" /> Sergipe · modo demonstração
          </div>
          <Link href="/demo" className="button-quiet border border-line sm:px-4">
            <span className="max-w-[120px] truncate">{profile?.name ?? "Escolher perfil"}</span><ChevronDown size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}
