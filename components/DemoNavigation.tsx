"use client";

import Link from "next/link";
import { Compass, Home, Search, UserRound, UsersRound, Wrench } from "lucide-react";
import type { OrganizationKind } from "@/lib/domain";

export type DemoView = "home" | "discover" | "today" | "preferences" | "talents" | "volunteers";
type ProfileType = "PERSON" | "ORGANIZATION" | "INSTITUTIONAL_ANALYST";

type Props = {
  profileType: ProfileType;
  organizationKind?: OrganizationKind;
  activeView: DemoView;
  onNavigate: (view: DemoView) => void;
};

const icons = { home: Home, discover: Search, today: Wrench, preferences: Compass, talents: UsersRound, volunteers: UsersRound, profile: UserRound };

export function DemoNavigation({ profileType, organizationKind, activeView, onNavigate }: Props) {
  const isPublicInstitution = organizationKind === "PUBLIC_INSTITUTION";
  const isOrganization = profileType === "ORGANIZATION";
  const items: Array<{ key: DemoView | "profile"; label: string }> = isOrganization
    ? [
        { key: "home", label: "Início" },
        { key: "discover", label: isPublicInstitution ? "Ações" : "Buscar" },
        { key: isPublicInstitution ? "volunteers" : "talents", label: isPublicInstitution ? "Voluntários" : organizationKind === "COMPANY" ? "Talentos" : "Pessoas" },
        ...(!isPublicInstitution ? [{ key: "today" as DemoView, label: "Serviço hoje" }] : []),
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
