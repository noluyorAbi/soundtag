/**
 * Where this deployment lives.
 *
 * Vercel sets `VERCEL_PROJECT_PRODUCTION_URL` on every deployment of a project
 * that has a production domain, which is what a sitemap and an OG card need to
 * emit absolute URLs. The explicit variable wins, so a self-hosted copy can say
 * where it is without touching code.
 */
export function origin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
