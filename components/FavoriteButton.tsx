"use client";

import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

const storageKey = "oflix-favorite-opportunities";

function readFavorites() {
  try { return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[]; } catch { return []; }
}

export function FavoriteButton({ opportunityId, title }: { opportunityId: string; title: string }) {
  const [favorite, setFavorite] = useState(false);
  useEffect(() => setFavorite(readFavorites().includes(opportunityId)), [opportunityId]);
  function toggle() {
    const next = readFavorites();
    const updated = next.includes(opportunityId) ? next.filter((id) => id !== opportunityId) : [...next, opportunityId];
    window.localStorage.setItem(storageKey, JSON.stringify(updated));
    setFavorite(updated.includes(opportunityId));
    window.dispatchEvent(new Event("oflix-favorites-changed"));
  }
  return <button type="button" onClick={toggle} aria-label={favorite ? `Remover ${title} dos favoritos` : `Favoritar ${title}`} className={`button-quiet shrink-0 border ${favorite ? "border-[#e6b7b2] bg-[#fff6f4] text-[#a34f35]" : "border-line text-[#637688]"}`}><Heart size={16} fill={favorite ? "currentColor" : "none"} /> <span className="hidden sm:inline">{favorite ? "Favoritado" : "Favoritar"}</span></button>;
}
