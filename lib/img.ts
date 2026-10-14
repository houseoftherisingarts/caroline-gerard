// Proxy weserv pour les originaux GCS/Firebase Storage servis bruts (jusqu'à ~8 MB).
// Ne jamais double-proxy : seuls les hôtes listés sont réécrits.
const PROXYABLE = /^https:\/\/(storage\.googleapis\.com|firebasestorage\.googleapis\.com)\//;

export function thumb(url: string | null | undefined, w: number): string {
  if (!url || !PROXYABLE.test(url)) return url ?? '';
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${w}&output=webp&q=75`;
}

// weserv échoue parfois au premier passage sur une photo toute fraîche (délai, refus
// passager) : l'image reste un cadre vide. Un seul écouteur pour tout le site remet alors
// l'original, plus lourd mais toujours là.
export function repliOriginal(): void {
  window.addEventListener('error', e => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.src.startsWith('https://images.weserv.nl/')) return;
    const original = new URL(img.src).searchParams.get('url');
    if (original) img.src = original;
  }, true);
}
