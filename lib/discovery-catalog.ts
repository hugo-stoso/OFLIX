import { discoveryItemMatchesFilter, type DiscoveryFilterKind, type DiscoveryItem, type ProfileType } from "@/lib/domain";

export type DiscoveryCatalogContext = {
  profileId: string;
  profileType: ProfileType;
  publicAccess: boolean;
  publicInstitution?: boolean;
};

export function itemAvailableInCatalog(item: DiscoveryItem, context: DiscoveryCatalogContext) {
  if (context.profileType === "INSTITUTIONAL_ANALYST") return false;
  if (context.publicInstitution) return item.kind === "volunteer";
  if (context.profileType === "PERSON") return true;
  return item.ownerType === "PERSON" || item.ownerId === context.profileId || (context.publicAccess && item.kind === "public_procurement");
}

export function itemMatchesNavigationFilter(item: DiscoveryItem, filter: DiscoveryFilterKind, context: DiscoveryCatalogContext) {
  if (!itemAvailableInCatalog(item, context)) return false;
  if (context.profileType === "INSTITUTIONAL_ANALYST") return false;
  if (context.profileType === "ORGANIZATION" && (filter === "employment" || filter === "service")) {
    if (item.ownerType === "PERSON" || item.ownerId !== context.profileId) return false;
  }
  return discoveryItemMatchesFilter(item, filter);
}

export function navigationCountLabel(count: number, filter: DiscoveryFilterKind, loading: boolean) {
  return filter === "employment" && loading ? `${count}+` : String(count);
}
