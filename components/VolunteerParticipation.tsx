"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type Participation = { id: string; opportunityId: string; status: "INTERESTED" | "CONFIRMED" | "PARTICIPATED" };

const labels = { INTERESTED: "Interesse registrado", CONFIRMED: "Participação confirmada", PARTICIPATED: "Participação registrada" };

export function VolunteerParticipation({ opportunityId, ownerId }: { opportunityId: string; ownerId: string }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [participation, setParticipation] = useState<Participation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  useEffect(() => { const id = window.localStorage.getItem("oflix-demo-profile"); setProfileId(id); if (!id) { setLoading(false); return; } fetch(`/api/volunteer-participation?profileId=${encodeURIComponent(id)}`).then((response) => response.json()).then((data) => setParticipation((data.person ?? []).find((item: Participation) => item.opportunityId === opportunityId) ?? null)).catch(() => setFeedback("Não foi possível carregar seu status agora.")).finally(() => setLoading(false)); }, [opportunityId]);
  async function interest() { if (!profileId) { setFeedback("Escolha uma pessoa no seletor de perfil para registrar interesse."); return; } setBusy(true); setFeedback(""); try { const response = await fetch("/api/volunteer-participation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId, personProfileId: profileId }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setParticipation(data.participation); } catch { setFeedback("Não foi possível registrar seu interesse agora."); } finally { setBusy(false); } }
  if (profileId === ownerId) return <p className="rounded-lg border border-[#ecd9ae] bg-[#fff9ec] p-4 text-sm leading-6 text-[#775d25]">Esta é uma ação organizada por você. Use o painel de voluntários para acompanhar as pessoas interessadas.</p>;
  if (loading) return <p className="text-sm text-[#637688]">Carregando seu status…</p>;
  if (participation) return <div className="rounded-lg border border-[#b7ded5] bg-[#effaf6] p-4 text-sm font-bold text-[#176c61]"><Check size={17} className="mr-2 inline-block" />{labels[participation.status]}</div>;
  return <div><button type="button" className="button-primary" onClick={interest} disabled={busy}>{busy ? <Loader2 className="animate-spin" size={17} /> : null} Quero participar</button>{feedback && <p className="mt-3 text-sm font-semibold text-[#a34f35]">{feedback}</p>}</div>;
}
