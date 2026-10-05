"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Participation = { id: string; opportunityId: string; opportunityTitle: string; personName: string; status: "INTERESTED" | "CONFIRMED" | "PARTICIPATED" };

export function VolunteerManagementPanel({ organizerId }: { organizerId: string }) {
  const [items, setItems] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const load = useCallback(() => { setLoading(true); fetch(`/api/volunteer-participation?profileId=${encodeURIComponent(organizerId)}`).then((response) => response.json()).then((data) => setItems(data.owned ?? [])).catch(() => setFeedback("Não foi possível carregar os voluntários agora.")).finally(() => setLoading(false)); }, [organizerId]);
  useEffect(() => { void load(); }, [load]);
  async function advance(item: Participation) { const action = item.status === "INTERESTED" ? "confirm" : item.status === "CONFIRMED" ? "participate" : null; if (!action) return; setBusy(item.id); setFeedback(""); try { const response = await fetch("/api/volunteer-participation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participationId: item.id, organizerProfileId: organizerId, action }) }); if (!response.ok) throw new Error("update"); await load(); } catch { setFeedback("Não foi possível atualizar este participante."); } finally { setBusy(null); } }
  return <section className="panel mt-8 p-5 sm:p-6" aria-labelledby="volunteer-management-title"><p className="eyebrow">Gestão de voluntariado</p><h2 id="volunteer-management-title" className="mt-2 text-xl font-bold text-navy">Acompanhe as pessoas interessadas</h2><p className="mt-2 text-sm leading-6 text-[#637688]">Confirme quem vai participar e registre a participação depois da ação. O acesso é restrito às ações desta organização.</p>{feedback && <p role="status" className="mt-4 text-sm font-semibold text-[#a34f35]">{feedback}</p>}{loading ? <p className="mt-5 text-sm text-[#637688]">Carregando inscrições…</p> : items.length ? <div className="mt-5 divide-y divide-line">{items.map((item) => <div key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-navy">{item.personName}</p><p className="mt-1 text-sm text-[#637688]">{item.opportunityTitle}</p></div><div className="flex items-center gap-3"><span className="status status-success">{item.status === "INTERESTED" ? "Interessado" : item.status === "CONFIRMED" ? "Confirmado" : "Participou"}</span>{item.status !== "PARTICIPATED" && <button type="button" className="button-secondary" disabled={busy === item.id} onClick={() => advance(item)}>{busy === item.id ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />} {item.status === "INTERESTED" ? "Confirmar" : "Registrar participação"}</button>}</div></div>)}</div> : <p className="mt-5 rounded-lg border border-dashed border-line p-5 text-sm leading-6 text-[#637688]">Ainda não há pessoas inscritas nas suas ações.</p>}</section>;
}
