export type SourceCollectionMetadata = {
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  requestCount?: number;
  pagesRequested?: number;
  pagesSucceeded?: number;
  paginationComplete?: boolean;
  sourceAvailableCount?: number;
  sourceFetched?: boolean;
  servedFromCache?: boolean;
  servedFromStale?: boolean;
  success?: boolean;
};
