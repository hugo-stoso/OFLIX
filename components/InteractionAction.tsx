"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { OpportunityKind } from "@/lib/domain";
import { opportunityMeta } from "@/lib/domain";

export function InteractionAction({ targetId, kind, ownerId }: { targetId: string; kind: OpportunityKind; ownerId: string }) {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "duplicate" | "self" | "error">("idle");
  useEffect(() => setProfileId(window.localStorage.getItem("oflix-demo-profile")), []);
  const action = kind === "formal" ? "APPLY" : kind === "service" ? "CONTACT_REQUEST" : "VOLUNTEER_INTEREST";
  async function submit() {
    if (!profileId) { setStatus("error"); return; }
    setStatus("loading");
    try {
      const response = await fetch("/api/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actorProfileId: profileId, targetType: kind === "formal" ? "FORMAL" : kind === "service" ? "SERVICE" : "VOLUNTEER", targetId, action }) });
      if (!response.ok) throw new Error("interaction");
      const result = await response.json();
      setStatus(result.selfOwned ? "self" : result.duplicate ? "duplicate" : "success");
    } catch { setStatus("error"); }
  }
  if (profileId === ownerId) return <div className="rounded-lg border border-[#ecd9ae] bg-[#fff9ec] p-4 text-sm leading-6 text-[#775d25]">Esta é uma oportunidade publicada por você. Para encontrar trabalho, selecione suas atividades de interesse e acompanhe novas oportunidades.</div>;
  if (status === "self") return <div className="rounded-lg border border-[#ecd9ae] bg-[#fff9ec] p-4 text-sm leading-6 text-[#775d25]">Esta é uma oportunidade publicada por você. Para encontrar trabalho, selecione suas atividades de interesse e acompanhe novas oportunidades.</div>;
  if (status === "success" || status === "duplicate") return <div className="rounded-lg border border-[#b7ded5] bg-[#effaf6] p-4 text-sm font-bold text-[#176c61]"><Check size={17} className="mr-2 inline-block" />{status === "duplicate" ? "Esta interação já estava registrada." : `Sua ${opportunityMeta[kind].verb} foi registrada.`}</div>;
  return <div><button type="button" className="button-primary w-full sm:w-auto" onClick={submit} disabled={status === "loading"}>{status === "loading" ? <Loader2 className="animate-spin" size={17} /> : null}{opportunityMeta[kind].action}</button>{status === "error" && <p className="mt-3 text-sm font-semibold text-[#a34f35]">Escolha um perfil de demonstração antes de interagir.</p>}</div>;
}
