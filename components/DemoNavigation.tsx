"use client";

import Link from "next/link";
import { Compass, Home, Search, UserRound, UsersRound, Wrench } from "lucide-react";

export type DemoView = "home" | "discover" | "today" | "preferences" | "talents";
type ProfileType = "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST";

type Props = {
  profileType: ProfileType;
  activeView: DemoView;
  onNavigate: (view: DemoView) => void;
};

const icons = { home: Home, discover: Search, today: Wrench, preferences: Compass, talents: UsersRound, profile: UserRound };

export function DemoNavigation({ profileType, activeView, onNavigate }: Props) {
  const items: Array<{ key: DemoView | "profile"; label: string }> = profileType === "ORGANIZATION"
    ? [
        { key: "home", label: "Início" },
        { key: "discover", label: "Buscar" },
        { key: "today", label: "Serviço hoje" },
        { key: "talents", label: "Talentos" },
        { key: "profile", label: "Perfil" },
      ]
    : [
        { key: "home", label: "Início" },
        { key: "discover", label: "Buscar" },
        { key: "today", label: "Serviço hoje" },
        { key: "preferences", label: "Preferências" },
        { key: "profile", label: "Perfil" },
      ];

  return (
    <nav className="demo-nav" aria-label="Navegação principal">
      <div className="demo-nav-desktop">
        {items.map((item) => {
          const Icon = icons[item.key];
          const selected = item.key !== "profile" && activeView === item.key;
          return item.key === "profile" ? (
            <Link key={item.key} href="/profile" className={`demo-nav-item ${selected ? "is-active" : ""}`}>
              <Icon size={17} aria-hidden="true" /> {item.label}
            </Link>
          ) : (
            <button key={item.key} type="button" className={`demo-nav-item ${selected ? "is-active" : ""}`} aria-current={selected ? "page" : undefined} onClick={() => onNavigate(item.key as DemoView)}>
              <Icon size={17} aria-hidden="true" /> {item.label}
            </button>
          );
        })}
      </div>
      <div className="demo-nav-mobile">
        {items.map((item) => {
          const Icon = icons[item.key];
          const selected = item.key !== "profile" && activeView === item.key;
          return item.key === "profile" ? (
            <Link key={item.key} href="/profile" className={`demo-nav-mobile-item ${selected ? "is-active" : ""}`}>
              <Icon size={19} aria-hidden="true" /><span>{item.label}</span>
            </Link>
          ) : (
            <button key={item.key} type="button" className={`demo-nav-mobile-item ${selected ? "is-active" : ""}`} aria-current={selected ? "page" : undefined} onClick={() => onNavigate(item.key as DemoView)}>
              <Icon size={19} aria-hidden="true" /><span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
