const normalizeOrigin = (value: string) => value.replace(/\/$/, "");

export function getSiteUrl() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredOrigin) {
    return new URL(normalizeOrigin(configuredOrigin));
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return new URL(`https://${productionHost}`);
  }

  const deploymentHost = process.env.VERCEL_URL?.trim();
  if (deploymentHost) {
    return new URL(`https://${deploymentHost}`);
  }

  return new URL("http://localhost:3000");
}
