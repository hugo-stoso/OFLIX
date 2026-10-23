const baseUrl = process.env.OFLIX_AUDIT_BASE_URL ?? "https://oflix-six.vercel.app";
const endpoint = new URL("/api/territory", baseUrl);
endpoint.searchParams.set("profileId", "profile-analista");

try {
  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  const payload = await response.json();
  const occupations = payload?.employmentMarket?.occupations;
  if (response.status < 200 || response.status >= 300 || !occupations) throw new Error(`status=${response.status} ou employmentMarket.occupations ausente`);

  const unclassified = occupations.occupations.filter((occupation) => occupation.family === "UNCLASSIFIED").sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "pt-BR"));
  const unclassifiedBySource = unclassified.reduce((counts, occupation) => {
    for (const [source, count] of Object.entries(occupation.bySource ?? {})) counts[source] = (counts[source] ?? 0) + count;
    return counts;
  }, {});

  console.log(JSON.stringify({
    endpoint: endpoint.toString(),
    status: response.status,
    total: occupations.total,
    classified: occupations.classified,
    unclassified: occupations.unclassified,
    coverageRate: occupations.coverageRate,
    unclassifiedBySource,
    topUnclassified: unclassified.slice(0, 30).map(({ label, total, bySource }) => ({ label, total, bySource })),
    policy: "aggregados públicos; sem persistir itens, descrições, URLs individuais ou respostas brutas",
  }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ endpoint: endpoint.toString(), error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 2;
}
