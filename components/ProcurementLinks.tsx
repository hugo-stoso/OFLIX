import { ExternalLink } from "lucide-react";
import type { ProcurementLinks as ProcurementLinksModel } from "@/lib/domain";

const actions: Array<{ key: keyof ProcurementLinksModel; label: string; primary?: boolean }> = [
  { key: "procurement", label: "Ver licitação", primary: true },
  { key: "edital", label: "Consultar edital" },
  { key: "documents", label: "Acessar documentos" },
  { key: "sourceSystem", label: "Acessar sistema de origem" },
  { key: "electronicProcess", label: "Acessar processo eletrônico" },
];

export function ProcurementLinks({ links, compact = false }: { links?: ProcurementLinksModel; compact?: boolean }) {
  const availableActions = actions.filter(({ key }) => Boolean(links?.[key]));
  const hasDocumentAction = Boolean(links?.edital || links?.documents);

  if (!availableActions.length) {
    return <p className="text-xs leading-5 text-[#718291]">Processo oficial sem link específico disponível no registro do PNCP.</p>;
  }

  return <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "mt-4"}`}>
    {availableActions.map(({ key, label, primary }) => <a key={key} href={links?.[key]} target="_blank" rel="noreferrer" className={`${primary ? "button-secondary" : "button-quiet"} whitespace-nowrap`}>
      {label} <ExternalLink size={compact ? 14 : 15} />
    </a>)}
    {!hasDocumentAction && <span className="text-xs leading-5 text-[#718291]">Edital/documentos não informados neste registro.</span>}
  </div>;
}
