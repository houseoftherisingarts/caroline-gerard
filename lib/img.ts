// Proxy weserv pour les originaux GCS/Firebase Storage servis bruts (jusqu'à ~8 MB).
// Ne jamais double-proxy : seuls les hôtes listés sont réécrits.
const PROXYABLE = /^https:\/\/(storage\.googleapis\.com|firebasestorage\.googleapis\.com)\//;

export function thumb(url: string | null | undefined, w: number): string {
  if (!url || !PROXYABLE.test(url)) return url ?? '';
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${w}&output=webp&q=75`;
}
