"use client";

import Link from "next/link";
import { ChevronDown, LogOut, MapPin, Settings, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Brand } from "@/components/Brand";

type Profile = { id: string; name: string; type: string; location: { municipality: string; district: string } };

export function DemoHeader() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function loadProfile() {
      const selectedId = window.localStorage.getItem("oflix-demo-profile");
      if (!selectedId) { setProfile(null); return; }
      fetch("/api/profiles").then((response) => response.json()).then((profiles: Profile[]) => {
        setProfile(profiles.find((candidate) => candidate.id === selectedId) ?? null);
      }).catch(() => setProfile(null));
    }
    loadProfile();
    window.addEventListener("oflix-profile-changed", loadProfile);
    return () => window.removeEventListener("oflix-profile-changed", loadProfile);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [menuOpen]);

  function signOut() {
    window.localStorage.removeItem("oflix-demo-profile");
    setProfile(null);
    setMenuOpen(false);
    window.dispatchEvent(new Event("oflix-profile-changed"));
    window.location.href = "/demo";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="shell flex min-h-[72px] items-center justify-between gap-4">
        <Brand compact />
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 text-xs text-[#637688] sm:flex">
            <MapPin size={14} className="text-blue" /> Sergipe · modo demonstração
          </div>
          <div className="relative" ref={menuRef}>
            <button type="button" className="button-quiet border border-line sm:px-4" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={profile ? `Abrir menu de ${profile.name}` : "Escolher perfil"} onClick={() => setMenuOpen((open) => !open)}>
              <span className="max-w-[150px] truncate">{profile?.name ?? "Escolher perfil"}</span><ChevronDown size={15} className={`transition-transform ${menuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {menuOpen && <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[250px] overflow-hidden rounded-xl border border-line bg-white p-2 shadow-[0_16px_40px_rgba(20,45,65,.14)]" role="menu" aria-label="Menu da conta">
              {profile ? <>
                <div className="border-b border-line px-3 pb-3 pt-2"><p className="text-xs font-bold uppercase tracking-[.1em] text-blue">Perfil de demonstração</p><p className="mt-1 truncate text-sm font-bold text-navy">{profile.name}</p><p className="mt-1 text-xs text-[#718291]">{profile.location.municipality} · {profile.location.district}</p></div>
                <div className="pt-2">
                  <Link href="/profile" role="menuitem" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-[#f2f7fa]" onClick={() => setMenuOpen(false)}><UserRound size={16} className="text-blue" /> Meu perfil</Link>
                  <Link href="/settings" role="menuitem" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-[#f2f7fa]" onClick={() => setMenuOpen(false)}><Settings size={16} className="text-blue" /> Configurações</Link>
                  <button type="button" role="menuitem" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#a34f35] hover:bg-[#fff5f1]" onClick={signOut}><LogOut size={16} /> Sair</button>
                </div>
              </> : <Link href="/demo" role="menuitem" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-navy hover:bg-[#f2f7fa]" onClick={() => setMenuOpen(false)}><UserRound size={16} className="text-blue" /> Escolher perfil</Link>}
            </div>}
          </div>
        </div>
      </div>
    </header>
  );
}
