const candidates = [
  { source: "GO_SERGIPE_QUALIFICA", url: "https://gosergipe.se.gov.br/oportunidades", decision: "NEEDS_MORE_VALIDATION", reason: "no stable public course listing distinct from the job API was proven" },
  { source: "FUNDAT_ARACAJU", url: "https://www.aracaju.se.gov.br/fundat", decision: "NEEDS_MORE_VALIDATION", reason: "public page did not expose a stable structured course listing" },
];
console.log(JSON.stringify({ candidates, integration: "not added; no source met the reproducible listing gate" }, null, 2));
