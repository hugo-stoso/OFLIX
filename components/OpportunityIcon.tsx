import { BriefcaseBusiness, HeartHandshake, Wrench } from "lucide-react";
import type { OpportunityKind } from "@/lib/domain";

export function OpportunityIcon({ kind }: { kind: OpportunityKind }) {
  const Icon = kind === "formal" ? BriefcaseBusiness : kind === "service" ? Wrench : HeartHandshake;
  return <Icon size={18} strokeWidth={1.8} aria-hidden="true" />;
}
