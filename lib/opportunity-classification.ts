import type { DiscoveryFilterKind, DiscoveryItem, OpportunityKind, ServiceIntent } from "@/lib/domain";

export type MarketSection = "contracts" | "services";

export function marketSectionForItem(item: Pick<DiscoveryItem, "kind" | "serviceIntent">): MarketSection | null {
  if (item.kind === "formal" || item.kind === "external_job") return "contracts";
  if (item.kind === "service") return item.serviceIntent === "service_offer" ? "services" : "contracts";
  return null;
}

export function opportunityKindBelongsToSection(kind: OpportunityKind, serviceIntent: ServiceIntent | undefined, section: MarketSection) {
  return marketSectionForItem({ kind, serviceIntent }) === section;
}

export function discoveryItemMatchesMarketSection(item: Pick<DiscoveryItem, "kind" | "serviceIntent">, filter: DiscoveryFilterKind) {
  if (filter === "employment") return marketSectionForItem(item) === "contracts";
  if (filter === "service") return marketSectionForItem(item) === "services";
  return true;
}
